---
description: "Task list template for feature implementation"
---

# Tasks: Reordenar tareas manualmente

**Input**: Design documents from `/specs/052-reordenar-tareas-manual/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/reorder-tasks.md, quickstart.md

**Tests**: Se incluyen tests unitarios para la lógica de dominio (renumeración de `position`), consistente con la Constitution ("la lógica core de dominio DEBE tener tests automatizados"). La UI se verifica manualmente vía `quickstart.md`.

**Organization**: Tareas agrupadas por historia de usuario (spec.md) para permitir implementación y prueba independiente de cada una.

## Format: `[ID] [P?] [Story?] [deps:...] [agente-modelo] Description`

- **[P]**: puede correr en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: US1/US2/US3, solo en fases de historia de usuario
- **[deps:Txxx]**: tareas de las que depende realmente (artefactos/archivos que necesita)
- **[agente-modelo]**: agente y modelo que ejecuta la tarea (contrato con `/speckit-ceo`)

## Path Conventions

Proyecto único Next.js (App Router): `src/`, `tests/` en la raíz del repo (ver plan.md).

---

## Phase 1: Setup

**Purpose**: Preparar la dependencia de drag & drop que no existe hoy en el repo.

- [X] T001 [P] [claude-haiku] Instalar `@dnd-kit/core` y `@dnd-kit/sortable` (`npm install`, actualiza `package.json`/`package-lock.json`).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: La mutación de `Task.position` y su endpoint son compartidos por US1 (drag) y US3 (subir/bajar); ninguna historia puede completarse sin esto.

**⚠️ CRITICAL**: No iniciar Fase 3-5 sin completar esta fase.

- [X] T002 [claude-opus] Implementar `reorderTasks(workId, orderedTaskIds)` en `src/server/tasks.ts`: dentro de `prisma.$transaction`, valida que `orderedTaskIds` coincide exactamente (mismo tamaño y mismos IDs) con las tareas actuales de `workId` (si no, lanza error tipado `TASK_SET_CHANGED`), y reasigna `position = índice` para cada tarea. Ver decisión de renumeración densa en research.md §1.
- [X] T003 [deps:T002] [claude-sonnet] Crear `PATCH /api/works/[id]/tasks/reorder` en `src/app/api/works/[id]/tasks/reorder/route.ts` siguiendo `contracts/reorder-tasks.md`: `requireWriter()` + `access()` nivel "operate" (mismo patrón que `works/[id]/route.ts`), validación Zod de `orderedTaskIds`, invoca `reorderTasks()`, mapea el error `TASK_SET_CHANGED` a `409`, emite `emit({ type: "work-changed", workId })`, responde con las tareas reordenadas.
- [X] T004 [P] [deps:T002] [codex-medium] Test unitario de `reorderTasks` en `tests/unit/task-reorder.test.ts`: reasigna posiciones correctamente dado un nuevo orden; rechaza con `TASK_SET_CHANGED` si falta o sobra un ID; no genera cambios si el orden enviado es igual al actual; **(FR-004)** reordenar una tarea completada no modifica su `status`/`completedAt`; **(FR-006)** tras reordenar, `nextPosition()` sigue devolviendo `N` (max+1) para una tarea nueva; **(FR-007)** dos llamadas sucesivas a `reorderTasks` sobre el mismo `workId` terminan en el estado de la última llamada (última escritura gana), sin filas huérfanas ni duplicadas.

**Checkpoint**: Backend de reorder implementado y testeado — listo para consumir desde el frontend.

---

## Phase 3: User Story 1 - Reordenar tareas dentro de un trabajo (Priority: P1) 🎯 MVP

**Goal**: El usuario arrastra una tarea a una nueva posición dentro del listado de su Trabajo y el nuevo orden persiste.

**Independent Test**: Escenarios 1, 2, 5 y 6 de `quickstart.md` — arrastrar una tarea, recargar y verificar que persiste; arrastrar una tarea completada; crear una tarea nueva tras reordenar; manejar el conflicto 409 si se creó una tarea durante el drag.

### Implementation for User Story 1

- [X] T005 [US1] [deps:T003] [claude-sonnet] En `src/app/(main)/works/[id]/page.tsx`, envolver el `.map()` de `work.tasks` con `DndContext`/`SortableContext` de dnd-kit. En `onDragEnd`: recalcular el array de IDs en el nuevo orden, actualizar el estado local de forma optimista, y llamar a `PATCH /api/works/[id]/tasks/reorder`. Si la respuesta es `409 TASK_SET_CHANGED`, revertir el optimismo, refrescar `work.tasks` desde el servidor y avisar al usuario que el orden cambió mientras arrastraba.
- [X] T006 [US1] [deps:T005] [claude-sonnet] Agregar drag handle visual y estilos de "arrastrando" (elevación/placeholder) en `TaskItem.tsx` (variant `"list"`), consistentes con el design system existente del componente.

**Checkpoint**: US1 completa y testeable de forma independiente.

---

## Phase 4: User Story 2 - El nuevo orden se ve igual en todas las vistas (Priority: P2)

**Goal**: Confirmar que la vista de Sector, que ya ordena `by position`, refleja el nuevo orden manual sin necesitar cambios de código (Principio I + clarificación FR-008).

**Independent Test**: Escenario 3 de `quickstart.md` — reordenar una tarea con `#sector` asignado y verificar que la vista de ese sector respeta la nueva posición relativa dentro del grupo de ese trabajo.

### Implementation for User Story 2

- [X] T007 [US2] [deps:T003] [codex-medium] Agregar test en `tests/unit/sector-task-order.test.ts` que confirme que, tras `reorderTasks()`, el query de `src/app/api/sectors/[id]/tasks/route.ts` (`orderBy: { task: { position: "asc" } }`) devuelve las tareas de ese trabajo en el mismo orden — documentando así, como test automatizado, que Sector hereda el orden sin cambios propios.

**Checkpoint**: US2 validada — sin regresiones, sin código nuevo en el endpoint de Sector.

---

## Phase 5: User Story 3 - Mover una tarea sin arrastrar (Priority: P3)

**Goal**: Alternativa accesible al arrastre: subir/bajar una tarea una posición con un control explícito.

**Independent Test**: Escenario 4 de `quickstart.md` — activar "subir" sobre una tarea y verificar que intercambia posición con la anterior.

### Implementation for User Story 3

- [X] T008 [US3] [deps:T003] [claude-sonnet] Agregar control "subir/bajar" en `TaskItem.tsx` (variant `"list"`), operable por teclado y con `aria-label` descriptivo, que construye el nuevo array de IDs (intercambiando la tarea con la adyacente) y llama al mismo `PATCH /api/works/[id]/tasks/reorder` que usa el drag & drop.

**Checkpoint**: Las 3 historias de usuario funcionan de forma independiente.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T009 [deps:T006,T007,T008] [claude-sonnet] Correr manualmente los 6 escenarios de `quickstart.md` en el navegador (incluyendo el conflicto 409) y corregir cualquier desvío encontrado.
- [X] T010 [P] [deps:T004,T007] [codex-low] Correr `npm run lint` y `npm test` sobre los archivos tocados por esta feature y corregir cualquier hallazgo.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Fase 1)**: sin dependencias — puede arrancar de inmediato.
- **Foundational (Fase 2)**: T002 sin dependencias; T003 depende de T002; T004 depende de T002. BLOQUEA las Fases 3-5.
- **User Stories (Fases 3-5)**: todas dependen únicamente de T003 (Foundational), no entre sí — pueden implementarse en paralelo.
- **Polish (Fase 6)**: depende de las historias que se hayan completado.

### User Story Dependencies

- **US1 (P1)**: depende de T003. Sin dependencia de US2/US3.
- **US2 (P2)**: depende de T003. Sin dependencia de US1/US3 — es solo un test de verificación, sin código nuevo.
- **US3 (P3)**: depende de T003. Sin dependencia de US1/US2 (aunque comparte componente `TaskItem.tsx` con US1, son cambios independientes dentro del mismo archivo).

### Parallel Opportunities

- T001 (Setup) puede correr en paralelo con T002 (Foundational) — no comparten archivos.
- T004 puede correr en paralelo con T003 (ambos dependen solo de T002, no entre sí).
- Una vez completada la Fase 2 (T002-T004), **US1, US2 y US3 pueden implementarse en paralelo** (T005-T006, T007, T008 respectivamente), salvo por la edición compartida de `TaskItem.tsx` entre T006 y T008 (coordinar orden de merge si corren en paralelo).

---

## Parallel Example: Foundational

```bash
# En paralelo, ambas solo dependen de T002:
Task: "Crear endpoint PATCH /api/works/[id]/tasks/reorder (T003)"
Task: "Test unitario de reorderTasks (T004)"
```

## Parallel Example: User Stories (tras Fase 2)

```bash
Task: "US1 — drag & drop en works/[id]/page.tsx (T005, T006)"
Task: "US2 — test de consistencia con Sector (T007)"
Task: "US3 — control subir/bajar (T008)"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Fase 1: Setup (T001)
2. Fase 2: Foundational (T002-T004) — CRÍTICO, bloquea todo lo demás
3. Fase 3: US1 (T005-T006)
4. **Validar**: correr Escenarios 1, 2, 5, 6 de `quickstart.md`
5. Con esto ya hay valor entregable: drag & drop funcionando y persistiendo.

### Incremental Delivery

1. Setup + Foundational → base lista.
2. US1 → drag & drop → validar → esto ya es demostrable.
3. US2 → test de consistencia con Sector (sin código nuevo, solo confirmación).
4. US3 → control subir/bajar como alternativa accesible.
5. Polish → correr `quickstart.md` completo + lint/test.

---

## Notes

- No hay cambios de schema Prisma: `Task.position` y su índice ya existen (feature 025).
- Codex CLI disponible: T004, T007 y T010 se despachan a Codex (`codex-medium`, `codex-medium`, `codex-low`) por ser tests/tareas autocontenidas; el resto (lógica de concurrencia, endpoints con convenciones del repo, UI con design system) queda en Claude.
- Commitear después de cada tarea o grupo lógico; el usuario decide cuándo commitear (esta pipeline no commitea).
