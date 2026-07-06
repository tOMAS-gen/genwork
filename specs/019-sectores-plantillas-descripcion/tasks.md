# Tasks: Sectores, plantillas y descripción de tareas

**Input**: Design documents from `specs/019-sectores-plantillas-descripcion/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] [model] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1, US2, US3)
- **[model]**: haiku | sonnet | opus

---

## Phase 1: Setup

**Purpose**: Migración de base de datos para nuevo campo

- [x] T001 [sonnet] Agregar campo `description String?` al modelo `Task` en `prisma/schema.prisma` — ubicarlo después de `lastEditedAt`. Crear migración con `npx prisma migrate dev --name task_description`. Correr `npx prisma generate`

---

## Phase 2: User Story 1 — Excluir tareas de plantillas de sectores (P1)

**Goal**: Las vistas de sector no muestran tareas de proyectos marcados como plantilla

**Independent Test**: Crear plantilla con tareas en un sector, verificar que no aparecen en la vista del sector

### Implementation

- [x] T002 [US1] [sonnet] Modificar queries en `src/app/api/sectors/[id]/tasks/route.ts` — en las 3 queries (execLinks línea 46, refLinks línea 50, loose línea 54), agregar condición para excluir tareas de plantillas. En execLinks y refLinks, cambiar el `OR` del where `task` para que además de `work.status: "ACTIVE"` exija `work.isTemplate: false`. En loose, agregar where `{ work: { isTemplate: false } }` o `{ workId: null }` (tareas sueltas sin proyecto no tienen plantilla). Verificar que las tareas sueltas (sin workId) siguen apareciendo
- [x] T003 [US1] [sonnet] Modificar queries de métricas en `src/app/api/sectors/route.ts` — en execLinks (línea 43), agregar al where `task: { work: { isTemplate: false } }` para que las métricas de conteo (total/done/pending) no incluyan tareas de plantillas. Las looseCounts (línea 36) ya filtran por `workId: null` así que no necesitan cambio

**Checkpoint**: Sectores no muestran tareas de plantillas, métricas correctas

---

## Phase 3: User Story 2 — Descripción expandible en tareas (P1)

**Goal**: Campo de descripción opcional en tareas, editable inline

**Independent Test**: Expandir tarea, agregar descripción, guardar, verificar que persiste y muestra indicador

### Implementation

- [x] T004 [US2] [sonnet] Agregar `description` al endpoint PATCH en `src/app/api/tasks/[id]/route.ts` — agregar `description: z.string().max(2000).nullable().optional()` al schema de validación del PATCH. En la lógica de update, pasar `description` al `prisma.task.update` si está presente en el body. Asegurarse de que el include del response incluya `description`
- [x] T005 [US2] [sonnet] Agregar `description` al tipo `TaskDto` y al include de tareas — en `src/components/tasks/TaskItem.tsx`, agregar `description: string | null` a la interfaz `TaskDto`. En los archivos que hacen queries con `taskInclude` (`src/app/api/sectors/[id]/tasks/route.ts`, `src/app/(main)/works/[id]/page.tsx`, `src/app/api/works/[id]/route.ts`), verificar que el select/include del Task retorna `description`. En el endpoint GET de tareas del work, agregar `description` al select
- [x] T006 [US2] [sonnet] Implementar UI de descripción en `src/components/tasks/TaskItem.tsx` — agregar estado `expanded` (boolean). Si la tarea tiene `description`, mostrar un indicador visual (ícono pequeño de "texto" o "…" junto al texto). Al hacer click en el indicador o en la tarea, togglear `expanded`. Cuando `expanded` es true, mostrar debajo del texto principal un `<textarea>` o `<div>` editable con la descripción. Al hacer blur del textarea, si el valor cambió, hacer PATCH a `/api/tasks/${task.id}` con el nuevo `description`. Usar estilos consistentes con el diseño existente (muted text, padding reducido)
- [x] T007 [US2] [sonnet] Copiar `description` en `src/lib/domain/works/cloneFromTemplate.ts` — en la función `cloneTasksFromTemplate`, agregar `description: tpl.description` al data de `tx.task.create` para que al clonar tareas desde plantillas la descripción se copie. Verificar que el `findMany` de templateTasks incluye `description` en los campos retornados (Prisma lo incluye por defecto para campos escalares)

**Checkpoint**: Tareas con descripción editable, indicador visual, clonación correcta

---

## Phase 4: User Story 3 — Grupo visible en drawer de sectores (P2)

**Goal**: El drawer muestra a qué grupo pertenece cada sector

**Independent Test**: Expandir SECTORES en el drawer, verificar que cada sector muestra su grupo

### Implementation

- [x] T008 [US3] [sonnet] Extender `SectorItem` y renderizado en `src/components/nav/DrawerNav.tsx` — agregar `group: { name: string } | null` a la interfaz `SectorItem`. El endpoint `GET /api/sectors` ya devuelve `group` con `{ id, name }`. En el renderizado de sectores dentro de la función `group()`, mostrar el nombre del grupo como texto muted (font-size smaller, color muted) debajo o al lado del nombre del sector. Para sectores sin grupo, no mostrar nada adicional

**Checkpoint**: Drawer muestra grupo de cada sector

---

## Phase 5: Verificación

**Purpose**: Validación final

- [x] T009 [sonnet] Ejecutar validación de quickstart.md — los 5 escenarios

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Sin dependencias — migración primero
- **Phase 2 (US1)**: Sin dependencias de Phase 1 (no usa campo description)
- **Phase 3 (US2)**: Depende de Phase 1 (T001 para campo description). T004→T005→T006 secuenciales. T007 paralelo con T006
- **Phase 4 (US3)**: Sin dependencias (solo cambia DrawerNav)
- **Phase 5**: Depende de todas las fases

### Parallel Opportunities

- T002 y T003 son paralelas entre sí (archivos distintos dentro de US1)
- T007 puede correr en paralelo con T006 (archivos distintos)
- T008 puede correr en paralelo con cualquier tarea de US1 o US2 (archivo distinto)
- US1 (Phase 2) y US3 (Phase 4) pueden ejecutarse en paralelo con Phase 1

---

## Implementation Strategy

### MVP (US1 + US2)

1. Phase 1: T001 (migración description)
2. Phase 2: T002 + T003 en paralelo (excluir plantillas de sectores)
3. Phase 3: T004 → T005 → T006 + T007 en paralelo (descripción de tareas)
4. Phase 4: T008 (grupo en drawer) — puede ir en paralelo con Phase 2/3
5. Phase 5: T009 (validación)
