---

description: "Task list for Estados de Tarea Configurables"
---

# Tasks: Estados de Tarea Configurables

**Input**: Design documents from `/specs/042-estados-tarea/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/task-status-api.md, quickstart.md

**Tests**: Incluidos para lógica de dominio pura (mandato de Constitución Principio "Flujo de
Desarrollo": parser/estados/filtros DEBEN tener tests automatizados). La UI y las rutas API se
verifican manualmente vía `quickstart.md`, siguiendo el mismo patrón que el resto del repo
(no hay harness de DB en `tests/unit/`, todos son tests de funciones puras).

**Organization**: Tareas agrupadas por user story (spec.md) para poder implementar y probar
cada una de forma independiente.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede correr en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: US1/US2/US3/US4, según spec.md
- Rutas de archivo exactas en cada descripción

## Path Conventions

Proyecto único Next.js (`src/`, `prisma/`, `tests/` en la raíz del repo) — ver "Structure
Decision" en plan.md.

---

## Phase 1: Setup

**Purpose**: Esquema de datos base para toda la feature

- [X] T001 Editar `prisma/schema.prisma`: agregar `model TaskStatus` (id, name, color, type,
      sortOrder, groupId?, ownerId?, sectorId?, createdAt; relaciones a `Group`/`User`/`Sector`;
      `@@unique([groupId, name])`, `@@unique([ownerId, name])`, `@@unique([sectorId, name])`) y
      `enum TaskStatusType { IN_PROGRESS FINAL }`; en `model Task` reemplazar `state
      TaskState @default(PENDING)` por `statusId String`, `statusChangedAt DateTime?`,
      `statusChangedById String?` (+ relaciones); eliminar `enum TaskState`. Ver data-model.md.
- [X] T002 Escribir `prisma/migrations/<timestamp>_task_status/migration.sql` (patrón de
      `20260706185921_colors_to_hex`): crear tabla `TaskStatus` + enum; por cada `Group`
      existente, insertar 2 filas default (`groupId`, "Pendiente" `IN_PROGRESS` sortOrder 0,
      "Hecha" `FINAL` sortOrder 1); por cada `User` existente, insertar el mismo par con
      `ownerId`; agregar `Task.statusId` nullable; `UPDATE` fila por fila resolviendo el scope
      de cada tarea (join a `Sector`/`Work` per research.md D2) y asignando el id
      "Pendiente"/"Hecha" del scope según el `state` viejo; volver `statusId` `NOT NULL`;
      dropear `state` y `TaskState`. Depende de T001.

**Checkpoint**: esquema listo, `npx prisma generate` corre sin error.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Lógica de dominio que TODAS las user stories necesitan

**⚠️ CRITICAL**: ninguna user story puede probarse hasta que esta fase esté completa

- [X] T003 [P] Implementar `src/lib/domain/tasks/statusResolution.ts`: función pura que dado
      el scope de una tarea (sector EXEC si tiene, si no el scope del `Work`) resuelve el
      conjunto de `TaskStatus` aplicable (override de sector si existe, si no el default de
      `groupId`/`ownerId`); función para el estado inicial (primer `IN_PROGRESS` por
      `sortOrder`); función `reassignOnSectorChange` (FINAL→FINAL del destino,
      IN_PROGRESS→primer IN_PROGRESS del destino). Ver data-model.md "Reglas de transición" y
      research.md D2.
- [X] T004 [P] Implementar `src/lib/domain/taskStatus/validate.ts`: función pura que valida un
      conjunto de estados (nombre único dentro del conjunto, exactamente un `FINAL`) y devuelve
      errores de validación tipados; función `canDeleteStatus(status, taskCount)` que bloquea
      si `taskCount > 0` o si es el único `FINAL`/deja el conjunto sin `IN_PROGRESS`. Ver
      data-model.md invariantes, FR-005/006/007/008.
- [X] T005 [P] `tests/unit/task-status-resolution.test.ts`: tests de `statusResolution.ts`
      (herencia de grupo/owner, override de sector, estado inicial, reasignación por tipo al
      cambiar de sector). Depende de T003.
- [X] T006 [P] `tests/unit/task-status-validate.test.ts`: tests de `validate.ts` (nombre
      duplicado rechazado, 0 o 2+ FINAL rechazado, borrado bloqueado con tareas asignadas,
      borrado del único FINAL/último IN_PROGRESS bloqueado). Depende de T004.
- [X] T007 Reescribir `src/lib/domain/tasks/state.ts`: reemplazar `toggleState` (binario) por
      `applyStatusChange(currentStatus, newStatus, userId, now)` que devuelve
      `{ statusId, completedAt, completedById, statusChangedAt, statusChangedById }` según el
      `type` del nuevo estado (FINAL setea completedAt/By, IN_PROGRESS los limpia;
      statusChangedAt/By siempre se actualizan). Depende de T003.
- [X] T008 [P] Reescribir `tests/unit/task-state.test.ts` para `applyStatusChange` (antes
      probaba el toggle binario). Depende de T007.
- [X] T009 Actualizar `src/server/tasks.ts`: `saveTask()` asigna el estado inicial vía
      `statusResolution` al crear una tarea nueva; reemplazar `toggleTask()` por
      `setTaskStatus(ctx, taskId, statusId)` que valida que `statusId` pertenezca al conjunto
      aplicable de la tarea (si no, `409`) y aplica `applyStatusChange`; al guardar una edición
      que cambia el sector EXEC de la tarea, invocar `reassignOnSectorChange`. Depende de T003,
      T007.

**Checkpoint**: fundación lista — las user stories pueden implementarse.

---

## Phase 3: User Story 1 - Definir el flujo de estados de una tarea (Priority: P1) 🎯 MVP

**Goal**: un administrador puede definir el conjunto de estados de la organización, y quien
administra un sector puede adaptar el suyo.

**Independent Test**: crear un conjunto con 4 estados propios (3 `IN_PROGRESS` + 1 `FINAL`),
guardarlo, y verificar que las tareas del sector pueden usar esos nombres (quickstart.md
Escenario 2).

### Implementation for User Story 1

- [X] T010 [US1] Implementar `src/server/taskStatus.ts`: `listApplicableSet(scope)` (devuelve
      el conjunto + `inherited: true/false`); `forkIfInherited(sectorId)` — si el sector no
      tiene conjunto propio, clona TODAS las filas del default (`groupId`/`ownerId`) a
      `sectorId`, y además REASIGNA el `statusId` de las tareas de ese sector que
      referenciaban el conjunto heredado a la fila clonada con el mismo nombre (encontrado en
      verificación manual: sin este paso el selector de estado cae a la primera opción sin
      avisar — ver data-model.md); antes de cualquier escritura sobre ese sector (FR-003).
      `createStatus`, `updateStatus` y `deleteStatus`, cuando actúan en scope de sector,
      SIEMPRE llaman primero a `forkIfInherited` y aplican la escritura sobre la copia recién
      forkeada — nunca mutan la fila compartida del conjunto general/personal (evita fuga de
      cambios entre sectores, SC-005). `deleteStatus` usa `validate.ts` de T004 para bloquear
      si hay tareas asignadas. Depende de T004.
- [X] T011 [US1] Implementar `src/app/api/task-statuses/route.ts` (`GET` por `?scope=`, `POST`)
      con permisos: scope grupo requiere `canManageGroup` (admin global), scope sector requiere
      `accessSector(...) === "operate"` (reutilizar `src/lib/domain/permissions/index.ts`, sin
      cambios ahí). Ver contracts/task-status-api.md. Depende de T010.
- [X] T012 [US1] Implementar `src/app/api/task-statuses/[id]/route.ts` (`PATCH`, `DELETE`) con
      los mismos permisos que T011. Igual que T010, cualquier PATCH/DELETE en scope de sector
      debe pasar primero por `forkIfInherited`. Depende de T010.
- [X] T013 [US1] Crear `src/components/admin/TaskStatusSettings.tsx`: lista de estados del
      conjunto aplicable con nombre, color (reutilizar `src/components/ui/ColorPicker.tsx`) y
      tipo (en curso/final); crear/renombrar/reordenar/eliminar; deshabilita guardar si no hay
      exactamente un final (mensaje de error de T011/T012). Depende de T011, T012.
- [X] T014 [P] [US1] Crear `src/app/(main)/admin/task-statuses/page.tsx`: página de
      administración del conjunto general (scope `groupId`), usa `TaskStatusSettings`. Agregar
      entrada/link desde `src/app/(main)/admin/page.tsx` (mismo patrón que las demás tarjetas
      de esa página). Depende de T013.
- [X] T015 [P] [US1] Embeber `TaskStatusSettings` en `src/app/(main)/sectors/[id]/page.tsx`
      (scope `sectorId` de ese sector), visible solo para quien tiene `accessSector === "operate"`
      sobre ese sector. Depende de T013.

**Checkpoint**: los conjuntos de estados se pueden definir y administrar de punta a punta.

---

## Phase 4: User Story 2 - Asignar y visualizar el estado de una tarea (Priority: P1)

**Goal**: cambiar el estado de una tarea entre los del conjunto aplicable, con el mismo
comportamiento de "completada" que hoy, reflejado en todas las vistas e integraciones.

**Independent Test**: con un conjunto ya definido, cambiar una tarea entre varios estados y
verificar persistencia + comportamiento visual (quickstart.md Escenario 3).

### Implementation for User Story 2

- [X] T016 [US2] Crear `src/app/api/tasks/[id]/status/route.ts` (`POST { statusId }`), usa
      `setTaskStatus` de T009; `409` si `statusId` no pertenece al conjunto aplicable. Depende
      de T009.
- [X] T017 [US2] Eliminar `src/app/api/tasks/[id]/toggle/route.ts` y todo caller que siga
      apuntando a `/toggle`. Depende de T016.
- [X] T018 [P] [US2] Actualizar `src/lib/mcp/tools/tasks.ts` (`task_setState`): el
      `inputSchema.state` fijo (`["PENDING","DONE"]`) pasa a `statusId`/`statusName` resuelto
      contra el conjunto aplicable de la tarea; mensaje de éxito usa el nombre del estado
      asignado. Depende de T009.
- [X] T019 [P] [US2] Actualizar `src/components/tasks/TaskItem.tsx`: reemplazar
      `<input type="checkbox">` por un selector de estado (nombre + color, opciones = conjunto
      aplicable obtenido de `GET /api/task-statuses`), llama a `POST /api/tasks/{id}/status`;
      `task.state === "DONE"` pasa a `task.status.type === "FINAL"` en toda la lógica de
      tachado/edición del componente. Depende de T016.
- [X] T020 [P] [US2] Actualizar `src/components/filters/FilterBar.tsx`: el `<select>` de
      "Pendientes"/"Realizadas" pasa a listar dinámicamente los estados del conjunto aplicable
      al contexto (obtenidos de `GET /api/task-statuses`). Depende de T011.
- [X] T021 [P] [US2] Actualizar `src/lib/domain/views/filters.ts`: `FilterState.state` pasa a
      `statusId?: string | null` (o `type?: "IN_PROGRESS"|"FINAL"` para el filtro por tipo).
      Depende de T001.
- [X] T022 [P] [US2] Actualizar `tests/unit/filters.test.ts` al nuevo shape de filtro. Depende
      de T021.
- [X] T023 [P] [US2] Actualizar `src/lib/domain/archive/render.ts`: el marcado `[x]`/`[ ]` pasa
      a basarse en `status.type === "FINAL"` en vez de `state === "DONE"`. Depende de T001.
- [X] T024 [P] [US2] Actualizar `tests/unit/archive.test.ts` al nuevo shape. Depende de T023.
- [X] T025 [P] [US2] Actualizar `src/lib/domain/works/cloneFromTemplate.ts`: clonar tareas cuyo
      estado tenga `type === "IN_PROGRESS"` (antes `state === "PENDING"`). Depende de T001.
- [X] T026 [P] [US2] Actualizar `tests/unit/clone-template.test.ts` al nuevo shape. Depende de
      T025.
- [X] T027 [P] [US2] Actualizar `src/components/board/BoardGrid.tsx`: conteos
      `doneCount`/pendientes pasan a agrupar por `status.type` en vez de comparar
      `state === "DONE"`. Depende de T001.
- [X] T028 [P] [US2] Actualizar `src/app/api/board/route.ts`, `src/app/api/sectors/route.ts` y
      `src/app/api/me/references/route.ts`: devolver `status: {id, name, color, type}` en vez
      de `state`; el filtro `?state=PENDING|DONE` de `references` pasa a `?statusId=` o
      `?type=`. Depende de T009.

**Checkpoint**: US1 y US2 funcionan juntas de punta a punta (definir + usar estados), con
compatibilidad total con integraciones existentes (MCP, plantillas, archivado, filtros).

---

## Phase 5: User Story 3 - Ver las tareas agrupadas por estado, estilo tablero (Priority: P2)

**Goal**: vista de tablero (columnas por estado) como alternativa a la lista, sin
drag-and-drop (research.md D3).

**Independent Test**: cambiar a vista tablero, verificar columnas correctas, mover una tarea de
columna vía su selector y ver el cambio reflejado en la lista (quickstart.md Escenario 4).

### Implementation for User Story 3

- [X] T029 [US3] Crear `src/components/tasks/TaskBoardView.tsx`: una columna por `TaskStatus`
      del conjunto aplicable (orden por `sortOrder`), tarjetas con el mismo selector de estado
      de `TaskItem.tsx` (T019) para "mover" una tarea a otra columna. Depende de T019, T011,
      T016.
- [X] T030 [US3] Agregar selector de vista (lista/tablero) en `src/app/(main)/works/[id]/page.tsx`
      y `src/app/(main)/sectors/[id]/page.tsx`, alternando entre el render actual (lista) y
      `TaskBoardView`, mismo array de tareas subyacente sin recargar. Depende de T029.

**Checkpoint**: US1, US2 y US3 funcionan juntas — definir, usar y visualizar en tablero.

---

## Phase 6: User Story 4 - Consultar el historial de cambios de estado (Priority: P3)

**Goal**: ver cuándo cambió de estado una tarea y quién lo hizo. Diferible post-MVP (spec.md
Assumptions, research.md D4) — no bloquea US1-US3.

**Independent Test**: cambiar el estado de una tarea varias veces y verificar que el historial
lista cada transición con fecha y usuario (quickstart.md no lo cubre; validar manualmente).

### Implementation for User Story 4

- [X] T031 [US4] Agregar `model TaskStatusChange` a `prisma/schema.prisma` (taskId,
      fromStatusId?, toStatusId, changedById, changedAt) + migración nueva. Depende de T001.
- [X] T032 [US4] En `setTaskStatus` (`src/server/tasks.ts`, T009), insertar una fila
      `TaskStatusChange` en cada cambio de estado (incluida la creación de la tarea, con
      `fromStatusId = null`). Depende de T031, T009.
- [X] T033 [US4] Agregar sección de historial en el detalle de tarea (donde vive hoy la
      descripción expandida en `TaskItem.tsx`/`TaskInlineEdit`), listando las transiciones de
      `TaskStatusChange` más recientes primero. Depende de T032.

**Checkpoint**: las 4 user stories del spec están cubiertas.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T034 [P] Ejecutar los 5 escenarios de `quickstart.md` manualmente y registrar
      discrepancias.
- [X] T035 Correr `npm run lint` y `npx tsc --noEmit` en todo el repo para detectar referencias
      residuales a `TaskState`/`"PENDING"`/`"DONE"` que hayan quedado sin actualizar.
- [X] T036 Correr `npm run test` (Vitest) completo y confirmar que todos los tests, nuevos y
      existentes, pasan.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias — arranca primero.
- **Foundational (Phase 2)**: depende de Setup — bloquea TODAS las user stories.
- **US1 (Phase 3)**: depende de Foundational. Sin dependencia de otras stories.
- **US2 (Phase 4)**: depende de Foundational. Usa el endpoint `GET /api/task-statuses` de US1
  (T011) para poblar selectores, pero su lógica central (`setTaskStatus`, compat) es
  independiente — puede implementarse en paralelo a T013-T015 de US1 si T011 ya está listo.
- **US3 (Phase 5)**: depende de US2 (T019 selector de estado, T016 endpoint) y de US1 (T011).
- **US4 (Phase 6)**: depende de Foundational (T009); independiente de US1-US3 en lo funcional,
  pero de menor prioridad (P3) — se implementa último.
- **Polish (Phase 7)**: depende de todas las stories que se decida incluir en el release.

### Parallel Opportunities

- T003-T006 (Foundational, distintos archivos) en paralelo.
- Dentro de US1: T014 y T015 en paralelo una vez T013 está listo.
- Dentro de US2: T018-T028 son casi todas [P] (archivos distintos) una vez T009/T011/T016
  están listos — es la fase con más paralelismo posible.

---

## Parallel Example: User Story 2

```bash
# Una vez T009 (server/tasks.ts) y T016 (endpoint /status) están listos:
Task: "Actualizar src/lib/mcp/tools/tasks.ts (task_setState)"
Task: "Actualizar src/components/tasks/TaskItem.tsx"
Task: "Actualizar src/components/filters/FilterBar.tsx"
Task: "Actualizar src/lib/domain/views/filters.ts + tests/unit/filters.test.ts"
Task: "Actualizar src/lib/domain/archive/render.ts + tests/unit/archive.test.ts"
Task: "Actualizar src/lib/domain/works/cloneFromTemplate.ts + tests/unit/clone-template.test.ts"
Task: "Actualizar src/components/board/BoardGrid.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 + 2)

1. Completar Phase 1: Setup.
2. Completar Phase 2: Foundational (crítico — bloquea todo).
3. Completar Phase 3: US1 (definir estados).
4. Completar Phase 4: US2 (asignar/visualizar) — recién acá el sistema es funcionalmente
   equivalente al viejo binario, pero configurable. **Este es el MVP real**: sin US2, definir
   estados (US1) no tiene ningún efecto visible para el usuario final.
5. **STOP y VALIDAR**: correr quickstart.md Escenarios 1, 2, 3, 5.

### Incremental Delivery

1. Setup + Foundational → base lista.
2. US1 + US2 juntas → MVP funcional (estados configurables reemplazan el binario, con
   compatibilidad total).
3. US3 (tablero) → mejora de visualización, no bloquea nada previo.
4. US4 (historial) → mejora de auditoría, prioridad más baja, se agrega cuando haya lugar.

### Notas de alcance

- US1 y US2 deben entregarse **juntas** para tener valor de usuario real (a diferencia del
  patrón usual donde P1 solo ya es un MVP demostrable): definir estados sin poder asignarlos
  (o viceversa) no es funcional.
- US4 (P3) es la única story realmente diferible sin afectar el resto, tal como marca el spec.
