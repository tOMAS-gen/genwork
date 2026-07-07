---

description: "Task list template for feature implementation"
---

# Tasks: Búsqueda de usuarios para agregar miembros

**Input**: Design documents from `/specs/037-busqueda-miembros/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Se incluye un test unitario para la lógica pura de matching (mandato de la
constitution: "la lógica core de dominio DEBE tener tests automatizados"). No se
agregan tests de contrato/integración de UI porque la spec no los pidió explícitamente.

**Organization**: Tareas agrupadas por historia de usuario (spec.md).

## Format: `[ID] [P?] [Story] [modelo] Description`

- **[P]**: Puede correr en paralelo (archivos distintos, sin dependencias entre sí)
- **[Story]**: US1 o US2 (spec.md)
- **[modelo]**: `haiku` | `sonnet` | `opus` — modelo asignado al subagente que ejecuta la tarea

## Path Conventions

Proyecto único Next.js App Router (ver plan.md → Project Structure). Todas las rutas
son relativas a la raíz del repo.

---

## Phase 1: Setup (Shared Infrastructure)

No aplica: la feature reutiliza el stack existente (Next.js, Prisma, Zod) sin
dependencias nuevas que instalar ni configurar (ver plan.md, Technical Context).

---

## Phase 2: Foundational (Blocking Prerequisites)

No aplica: no hay esquema de datos nuevo (se reutilizan `User`/`GroupMembership`
existentes) ni infraestructura de auth nueva (se reutiliza `canManageGroup`). El
Constitution Check del plan dio PASS sin complejidad adicional que justificar.

---

## Phase 3: User Story 1 - Buscar y elegir un usuario existente al agregar miembro a un grupo (Priority: P1) 🎯 MVP

**Goal**: Reemplazar el input de email manual por un buscador que sugiere usuarios
existentes (nombre/email, insensible a mayúsculas/tildes), excluye a quienes ya son
miembros, y permite elegir uno para darlo de alta con su rol.

**Independent Test**: Abrir la pantalla de un grupo administrado, buscar un usuario
existente por nombre o email, elegirlo de la lista y confirmar el alta con un rol;
verificar que queda como miembro y que ya no aparece en una búsqueda posterior
(quickstart.md, pasos 1-5).

### Implementation for User Story 1

- [X] T001 [US1] [sonnet] Implementar función pura de dominio en `src/lib/domain/users/matching.ts`: recibe lista de usuarios candidatos + query + set de ids ya-miembro, devuelve hasta 8 resultados ordenados por relevancia (coincidencia al inicio de nombre/email primero, luego alfabético), usando `normalizeTagName` de `src/lib/domain/tags/parser.ts` para el matching insensible a mayúsculas/tildes (FR-002, FR-003; ver research.md Decisión 1 y 3).
- [X] T002 [P] [US1] [sonnet] Test unitario del matching en `src/lib/domain/users/__tests__/matching.test.ts`: casos de coincidencia por nombre, por email, insensible a tildes/mayúsculas, exclusión de ya-miembros, límite de 8 resultados y orden de relevancia. Depende de T001.
- [X] T003 [P] [US1] [sonnet] Crear endpoint `GET /api/groups/[id]/members/search` en `src/app/api/groups/[id]/members/search/route.ts` siguiendo el contrato de `specs/037-busqueda-miembros/contracts/group-members-search.md`: valida `q` (2+ caracteres, si no devuelve `[]`), aplica guard `requireWriter()` + `canManageGroup(ctx, id)` (403 si no corresponde, 404 si el grupo no existe, igual que el POST existente en `src/app/api/groups/[id]/members/route.ts`), consulta candidatos con Prisma, consulta los `userId` con `GroupMembership` en ese grupo (set de exclusión, ver research.md Decisión 5) y llama a la función de T001 pasándole ambos. Depende de T001.
- [X] T004 [US1] [sonnet] Crear componente `src/components/groups/MemberSearchField.tsx`: input de texto con debounce (~300ms, arranca a partir de 2 caracteres), llama a `GET /api/groups/[id]/members/search`, muestra lista de resultados seleccionable con mouse y teclado (flechas arriba/abajo + Enter, Escape para cerrar, mismo patrón que `src/components/editor/SlashMenu.tsx`), mensaje "sin resultados" cuando la búsqueda no encuentra coincidencias (FR-005), y expone el usuario elegido (id/nombre/email) a quien lo use. El usuario elegido persiste aunque se borre o cambie el texto del input después (FR-009); solo se limpia al confirmar el alta o cancelar explícitamente. Depende de T003.
- [X] T005 [US1] [sonnet] Integrar `MemberSearchField` en `src/app/(main)/groups/[id]/page.tsx`: reemplaza el `<input>` de email manual actual por el nuevo combobox, manteniendo el selector de rol (Miembro/Administrador, FR-007) y el `POST /api/groups/[id]/members` existente sin cambios de contrato (se sigue enviando el email del usuario elegido). Depende de T004.

**Checkpoint**: User Story 1 funcional e independientemente testeable (MVP).

---

## Phase 4: User Story 2 - Feedback claro mientras se busca (Priority: P2)

**Goal**: Agregar los estados de carga y de campo vacío para que el buscador se
sienta responsivo (FR-008, SC-004).

**Independent Test**: Escribir en el buscador y observar el indicador de carga breve
antes de los resultados; borrar el texto y verificar que no queda ninguna lista
visible (quickstart.md, comportamiento adicional sobre los pasos 1-5).

### Implementation for User Story 2

- [X] T006 [US2] [haiku] Agregar estado de carga visible (texto o spinner breve tipo "Buscando…") mientras se espera la respuesta de búsqueda en `src/components/groups/MemberSearchField.tsx`. Depende de T005.
- [X] T007 [US2] [haiku] Ocultar por completo la lista de resultados y el indicador de carga cuando el campo de búsqueda está vacío en `src/components/groups/MemberSearchField.tsx`. Depende de T006.

**Checkpoint**: User Stories 1 y 2 completas e independientemente verificables.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T008 [haiku] Agregar atributos de accesibilidad de combobox (`role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant` sobre el input; `role="listbox"`/`role="option"` sobre la lista, mismo patrón que `SlashMenu.tsx`) en `src/components/groups/MemberSearchField.tsx`. Depende de T007.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup / Foundational**: no aplica (ver arriba) — se puede ir directo a Phase 3.
- **User Story 1 (Phase 3)**: sin dependencias de otras historias; es el MVP.
- **User Story 2 (Phase 4)**: depende de que exista `MemberSearchField.tsx` (T004/T005 de US1), porque agrega estados de UI sobre el mismo componente. No requiere cambios de US1 más allá de que el archivo exista.
- **Polish (Phase 5)**: depende de que US2 esté terminada (mismo archivo).

### Dentro de cada historia

- T001 (función pura) bloquea a T002 (test) y T003 (endpoint), que corren en paralelo entre sí.
- T003 bloquea a T004 (componente necesita el endpoint).
- T004 bloquea a T005 (integración en la página).
- T005 → T006 → T007 → T008: secuenciales, todas tocan el mismo archivo `MemberSearchField.tsx`.

### Parallel Opportunities

- T002 y T003 pueden ejecutarse en paralelo una vez completada T001 (archivos distintos, ninguna depende de la otra).
- No hay más oportunidades de paralelismo real: el resto de las tareas comparten archivo o dependen secuencialmente de la anterior.

---

## Parallel Example: User Story 1

```text
# Tras completar T001:
Task: "Test unitario del matching en src/lib/domain/users/__tests__/matching.test.ts"
Task: "Endpoint GET /api/groups/[id]/members/search en src/app/api/groups/[id]/members/search/route.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. T001 → T002/T003 (paralelo) → T004 → T005.
2. **STOP y VALIDAR**: probar User Story 1 de forma independiente (quickstart.md, pasos 1-5).
3. Es el MVP: ya permite buscar, elegir y agregar un usuario existente, excluyendo ya-miembros.

### Incremental Delivery

1. User Story 1 completa → MVP funcional.
2. User Story 2 (T006-T007) → pule la experiencia de carga/vacío sobre el mismo componente.
3. Polish (T008) → accesibilidad de teclado/lector de pantalla.

---

## Notes

- Sin tareas de Setup/Foundational: la feature no introduce dependencias, esquema
  de datos ni framework de auth nuevos (Constitution Check: PASS, ver plan.md).
- 8 tareas en total: 5 en US1 (MVP), 2 en US2, 1 de Polish.
- Ningún subagente debe commitear; el usuario committea al final (regla del pipeline
  `speckit-auto`, no de este archivo).
