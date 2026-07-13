---

description: "Task list for feature implementation"
---

# Tasks: Renombrar Proyectos, Sectores y Grupos

**Input**: Design documents from `/specs/049-renombrar-entidades/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/me-api.md, contracts/works-api.md, quickstart.md

**Tests**: no se solicitaron tests automatizados (constitución: la UI se verifica
manualmente). La verificación es el `quickstart.md` (Fase Polish).

**Organization**: tareas agrupadas por historia de usuario para implementación y prueba
independientes.

## Format: `[ID] [P?] [Story] [deps:...] [agente-modelo] Description`

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: infraestructura compartida por las 3 historias — nadie puede implementar su
historia sin esto.

**⚠️ CRITICAL**: no arrancar ninguna User Story hasta terminar esta fase.

- [X] T001 [P] [claude-sonnet] Crear componente reutilizable `RenameDialog` en `src/components/ui/RenameDialog.tsx`: recibe `open`, `onClose`, `title`, `label`, `initialName`, `maxLength`, `onSave(name: string): Promise<void>`; usa `Dialog` (`src/components/ui/Dialog.tsx`), `useToast` y maneja `saving`/`error` con el mismo patrón visual que los diálogos de `ProjectMenu` (archivar/eliminar).
- [X] T002 [P] [codex-low] Extender `GET /api/me` en `src/app/api/me/route.ts` para incluir `globalRole: session.user.globalRole` en la respuesta JSON, junto al `id` ya existente (ver contrato en `contracts/me-api.md`).
- [X] T003 [P] [codex-low] Extender `GET /api/works/[id]` en `src/app/api/works/[id]/route.ts` para incluir `access: level` (el `level` que `getWorkWithAccess` ya calcula) en el JSON de respuesta, junto al resto de campos ya expuestos (ver contrato en `contracts/works-api.md`).

**Checkpoint**: con T001, T002 y T003 completas, las 3 historias pueden implementarse en paralelo.

---

## Phase 2: User Story 1 - Renombrar un proyecto (Priority: P1) 🎯 MVP

**Goal**: cualquier usuario con acceso de operación sobre un proyecto puede corregir su
nombre desde la página del proyecto; un usuario solo-lector no ve el control.

**Independent Test**: entrar a un proyecto propio, usar "Acciones del proyecto" →
"Renombrar…", guardar, verificar que el nombre se refleja en la página y en el listado
de proyectos; repetir con un usuario solo-lector y verificar que no ve el ítem (ver
`quickstart.md` Escenario 1).

### Implementation for User Story 1

- [X] T004 [US1] [deps:T003] [claude-sonnet] Actualizar la interfaz `WorkFull` y el fetch en `src/app/(main)/works/[id]/page.tsx` para leer el nuevo campo `access` de la respuesta de `GET /api/works/[id]`, y pasar `canRename={work.access === "operate"}` a `<ProjectMenu>`.
- [X] T005 [US1] [deps:T001,T004] [claude-sonnet] En `src/components/projects/ProjectMenu.tsx`, agregar prop `canRename: boolean` y, cuando sea `true`, incluir el ítem "Renombrar…" en el array `items` (en ambas ramas ACTIVE y ARCHIVED) que abre un `<RenameDialog>` cuyo `onSave` hace `PATCH /api/works/${workId}` con `{ name }`, muestra toast de éxito/error, y en éxito llama `router.refresh()`.
- [X] T006 [US1] [deps:T005] [claude-sonnet] Verificar en `src/app/(main)/works/[id]/page.tsx` que el `<h1 className="sheet-title">{work.name}</h1>` y cualquier dato derivado (código `GRUPO-N-NOMBRE`) se actualicen tras el `router.refresh()` de T005 sin recarga manual del navegador; ajustar si el fetch de la página no revalida.

**Checkpoint**: User Story 1 funcional y probable de forma independiente.

---

## Phase 3: User Story 2 - Renombrar un grupo (Priority: P2)

**Goal**: SUPERADMIN o ADMIN de un grupo puede corregir su nombre desde la página del
grupo.

**Independent Test**: como ADMIN de un grupo, "Acciones del grupo" → "Renombrar…",
guardar, verificar reflejo en la página del grupo y en `/groups` (ver `quickstart.md`
Escenario 2).

### Implementation for User Story 2

- [X] T007 [US2] [deps:T001] [claude-sonnet] Agregar ítem "Renombrar…" al array `items` del `<Menu>` en `src/app/(main)/groups/[id]/page.tsx` (junto a "Eliminar grupo"), visible solo cuando `isGroupAdmin` sea `true` (variable ya calculada en el componente); abre `<RenameDialog>` cuyo `onSave` hace `PATCH /api/groups/${id}` con `{ name }` y llama `load()` en éxito.
- [X] T008 [US2] [deps:T007] [claude-sonnet] Verificar que el listado `/groups` (`src/app/(main)/groups/page.tsx`) muestre el nombre actualizado del grupo sin recarga manual (revisar si necesita `router.refresh()` al volver desde la página del grupo, o si ya revalida por navegación de Next.js).

**Checkpoint**: User Stories 1 y 2 funcionan de forma independiente.

---

## Phase 4: User Story 3 - Renombrar un sector (Priority: P3)

**Goal**: SUPERADMIN puede corregir el nombre de un sector de cualquier ámbito desde su
página, sin afectar las tareas ya asignadas.

**Independent Test**: como SUPERADMIN, en un sector de cada ámbito (Grupo/Personal/
Global), "Acciones del sector" → "Renombrar…", guardar, verificar que las tareas ya
asignadas siguen visibles bajo el nuevo nombre; como ADMIN de grupo no-SUPERADMIN,
verificar que el ítem no aparece (ver `quickstart.md` Escenario 3).

### Implementation for User Story 3

- [X] T009 [US3] [deps:T002] [claude-sonnet] En `src/app/(main)/sectors/[id]/page.tsx`, agregar fetch a `GET /api/me` (mismo patrón que `GroupDetailPage`) y calcular `isSuperAdmin = me.globalRole === "SUPERADMIN"` en estado local.
- [X] T010 [US3] [deps:T001,T009] [claude-sonnet] Agregar ítem "Renombrar…" al array `items` del `<Menu>` en `src/app/(main)/sectors/[id]/page.tsx` (junto a "Estados de tarea"/"Eliminar sector"), visible solo cuando `canOperate && isSuperAdmin`; abre `<RenameDialog>` cuyo `onSave` hace `PATCH /api/sectors/${id}` con `{ name }` y llama `load()` en éxito.
- [X] T011 [US3] [deps:T010] [claude-sonnet] Verificar que el listado `/sectors` (`src/app/(main)/sectors/page.tsx`) muestre el nombre actualizado del sector sin recarga manual (revisar si necesita `router.refresh()` al volver desde la página del sector, o si ya revalida por navegación de Next.js).

**Checkpoint**: las 3 historias funcionan de forma independiente.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: verificación final transversal a las 3 historias.

- [X] T012 [deps:T006,T008,T011] [claude-sonnet] Ejecutar manualmente los 3 escenarios de `specs/049-renombrar-entidades/quickstart.md` (incluyendo los casos negativos de permiso y nombre duplicado) y anotar resultado.
- [X] T013 [P] [deps:T006,T008,T011] [claude-haiku] Correr `npm run lint` sobre los archivos tocados y corregir los hallazgos.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: sin dependencias — arranca de inmediato. Bloquea las 3 historias.
- **User Story 1 (Phase 2)**: depende de T001 y T003 (única historia que necesita el `access` de `/api/works/[id]`). Sin dependencia de US2/US3.
- **User Story 2 (Phase 3)**: depende de T001. Sin dependencia de US1/US3.
- **User Story 3 (Phase 4)**: depende de T001 y T002 (única historia que necesita el `globalRole` de `/api/me`).
- **Polish (Phase 5)**: depende de que T004–T011 estén completas (o al menos las historias que se quieran validar).

### Parallel Opportunities

- T001, T002 y T003 en paralelo (archivos distintos, sin dependencia entre sí).
- Una vez completo Phase 1: US1 (T004–T006), US2 (T007–T008) y US3 (T009–T011) pueden avanzar en paralelo — cada una toca un archivo de página distinto y `ProjectMenu`/`RenameDialog` ya están cerrados por T001.
- T013 (lint) puede correr en paralelo con T012 (verificación manual).

---

## Parallel Example: Foundational

```bash
Task: "Crear RenameDialog en src/components/ui/RenameDialog.tsx"
Task: "Extender GET /api/me con globalRole en src/app/api/me/route.ts"
Task: "Extender GET /api/works/[id] con access en src/app/api/works/[id]/route.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Phase 1: Foundational (T001, T002, T003).
2. Completar Phase 2: User Story 1 (T004–T006).
3. **DETENER Y VALIDAR**: probar renombrado de proyecto de forma independiente.
4. Demo si está listo.

### Incremental Delivery

1. Foundational → base lista.
2. User Story 1 → probar independientemente → demo (MVP).
3. User Story 2 → probar independientemente → demo.
4. User Story 3 → probar independientemente → demo.
5. Polish (T012–T013) al cierre.

---

## Notes

- `[P]` = archivos distintos, sin dependencia entre sí.
- `[USn]` mapea la tarea a su historia de usuario para trazabilidad.
- Ninguna tarea introduce cambios de schema de base de datos.
- Evitar: acoplar el `Menu` de una entidad a la lógica de otra; cada historia toca solo su propia página + los artefactos compartidos de Foundational.
