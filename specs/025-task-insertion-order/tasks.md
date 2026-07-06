# Tasks: Orden de inserción persistente para tareas

**Input**: Design documents from `specs/025-task-insertion-order/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md

## Format: `[ID] [P?] [Story?] [model] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1, US2, US3)
- **[model]**: haiku / sonnet / opus
- Include exact file paths in descriptions

---

## Phase 1: Setup (Schema & Migración)

**Purpose**: Agregar campo `position` al modelo Task y migrar datos existentes

- [x] T001 [haiku] Agregar campo `position Int @default(0)` e índice `@@index([workId, position])` al modelo Task en `prisma/schema.prisma`
- [x] T002 [opus] Crear migración SQL con backfill: asignar `position` usando `ROW_NUMBER() OVER (PARTITION BY workId ORDER BY createdAt ASC) - 1` para tareas con work, y particionado por `sectorId` para tareas sueltas. Archivo: `prisma/migrations/<timestamp>_task_position/migration.sql`
- [x] T003 [haiku] Ejecutar `npx prisma generate` para regenerar el cliente Prisma

**Checkpoint**: Campo `position` existe en BD con datos migrados

---

## Phase 2: Foundational (Lógica de asignación de posición)

**Purpose**: La creación de tareas asigna `position` automáticamente

- [x] T004 [sonnet] Modificar `createOrUpdateTask()` en `src/server/tasks.ts`: al crear una tarea nueva, calcular `MAX(position WHERE workId = X) + 1` (o `MAX(position WHERE sectorId = X) + 1` para tareas sin work) y asignarlo al campo `position`

**Checkpoint**: Nuevas tareas reciben posición al final automáticamente

---

## Phase 3: User Story 1 - Tareas completas mantienen posición (Priority: P1)

**Goal**: Completar una tarea no cambia su posición en la lista de su trabajo

**Independent Test**: Crear tareas, completar intercaladas, verificar que el orden no cambia

### Implementation for User Story 1

- [x] T005 [P] [US1] [sonnet] Cambiar `orderBy` de `{ createdAt: "asc" }` a `{ position: "asc" }` en el query de tareas dentro de `src/app/api/works/[id]/route.ts`
- [x] T006 [P] [US1] [sonnet] Cambiar `orderBy` de `{ task: { createdAt: "asc" } }` a `{ task: { position: "asc" } }` en `src/app/api/board/route.ts`
- [x] T007 [P] [US1] [US2] [sonnet] Cambiar el ordenamiento de tareas dentro de cada grupo por trabajo en `src/app/api/sectors/[id]/tasks/route.ts` para usar `position` en lugar de `createdAt`

**Checkpoint**: Todas las vistas ordenan por `position`. Completar una tarea no mueve nada. Vista de sector incluida (US2).

---

## Phase 4: User Story 3 - Dashboard unificado sin split pending/done (Priority: P2)

**Goal**: El board muestra tareas en una sola lista por sector, sin separar por estado

**Independent Test**: Dashboard muestra tareas intercaladas (pending y done juntas) en orden de inserción

### Implementation for User Story 3

- [x] T008 [US3] [sonnet] Modificar endpoint `src/app/api/board/route.ts`: reemplazar la respuesta `{ pending: [...], done: [...] }` por `{ tasks: [...] }` (lista unificada ordenada por `position`)
- [x] T009 [US3] [sonnet] Actualizar componente del dashboard en `src/app/(main)/page.tsx` para renderizar `tasks` como lista única en lugar de dos columnas `pending`/`done`, manteniendo la diferenciación visual (tachado/opacidad) para tareas completadas

**Checkpoint**: Dashboard muestra una sola lista por sector con tareas en orden de inserción

---

## Phase 5: Polish & Cross-Cutting Concerns

- [x] T010 [haiku] Verificar que el tipado TypeScript compila sin errores: `npm run build`
- [x] T011 [sonnet] Ejecutar validación completa de quickstart.md: escenarios 1-4

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Sin dependencias — T001 → T002 → T003 secuencial
- **Phase 2 (Foundational)**: Depende de Phase 1
- **Phase 3 (US1)**: Depende de Phase 2. T005, T006, T007 en paralelo
- **Phase 4 (US3)**: Depende de Phase 3 (T006 como base). T008 → T009 secuencial
- **Phase 5 (Polish)**: Depende de todas las fases anteriores

### Parallel Opportunities

- T005, T006, T007 son [P] — archivos distintos, sin dependencias entre sí
- T001, T003 son mecánicos y rápidos

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1: Schema + migración (T001-T003)
2. Phase 2: Asignación de posición (T004)
3. Phase 3: Cambiar orderBy en todas las vistas (T005-T007)
4. **STOP & VALIDATE**: Verificar que tareas mantienen orden tras completar

### Incremental Delivery

1. MVP (US1) → orden estable en todas las vistas
2. US3 → dashboard unificado sin split
3. Polish → build + validación completa
