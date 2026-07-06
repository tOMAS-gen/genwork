# Tasks: Rediseño del flujo de plantillas

**Input**: Design documents from `specs/018-plantillas-rediseno/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] [model] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1, US2, US3)
- **[model]**: haiku | sonnet | opus

---

## Phase 1: Setup

**Purpose**: Preparar backend para el nuevo flujo

- [x] T001 [sonnet] Agregar `isTemplate: z.boolean().optional()` al `createSchema` en `src/app/api/works/route.ts` — en el `tx.work.create`, pasar `isTemplate: isTemplate ?? false` al campo data. NO cambiar la validación de `cloneFromId` (plantillas existentes siguen requiriendo `isTemplate: true` para clonar desde ellas)

---

## Phase 2: User Story 2 — Guardar proyecto como plantilla (P1)

**Goal**: Opción "Guardar como plantilla" en menú ⋮ que copia el proyecto

**Independent Test**: Abrir proyecto con tareas, menú ⋮ → "Guardar como plantilla", ir a Plantillas, verificar copia

### Implementation

- [x] T002 [US2] [sonnet] Crear endpoint `POST /api/works/[id]/clone/route.ts` — leer el work original (name, doc.content, status=ACTIVE), crear nuevo work con `isTemplate: true` y `name: "[original] (plantilla)"`, copiar doc content, llamar `cloneTasksFromTemplate(originalId, newWorkId, userId, tx)`. Usar `withApi` + `requireWriter` + validar que el work original existe y es ACTIVE. Retornar `{ id, name }`
- [x] T003 [US2] [sonnet] Agregar opción "Guardar como plantilla" al menú ⋮ en `src/components/projects/ProjectMenu.tsx` — solo para proyectos ACTIVE. La opción llama `POST /api/works/${workId}/clone`, muestra toast de éxito con el nombre de la plantilla creada. Usar ícono `BookTemplate` (ya importado en otros archivos). Agregar import de `BookTemplate` desde `@/components/ui/icons` y `useToast` desde `@/components/ui/Toast`

**Checkpoint**: Se pueden guardar proyectos como plantilla desde el menú ⋮

---

## Phase 3: User Story 1 — Crear plantilla directamente (P1) 🎯 MVP

**Goal**: Botón "Nueva plantilla" en la vista de plantillas

**Independent Test**: Filtro Plantillas → "Nueva plantilla" → verificar que nace como plantilla

### Implementation

- [x] T004 [US1] [sonnet] Modificar el botón de creación en `src/app/(main)/page.tsx` — cuando `queryFilterKind === "templates"`, cambiar el menú de creación para mostrar solo "Nueva plantilla" (sin "Desde plantilla") que abre el dialog de creación pasando `isTemplate: true`. Modificar `CreateProjectDialog` para aceptar prop `isTemplate?: boolean` y pasarlo en el body del POST. Cuando `queryFilterKind !== "templates"`, mantener el menú actual sin cambios

**Checkpoint**: Se pueden crear plantillas directamente desde la sección Plantillas

---

## Phase 4: User Story 3 — Eliminar toggle (P1)

**Goal**: Quitar el botón "Usar como plantilla" de la vista de detalle

**Independent Test**: Abrir cualquier proyecto, verificar que NO aparece toggle de plantilla

### Implementation

- [x] T005 [P] [US3] [haiku] Eliminar la función `handleToggleTemplate` y el bloque del botón `template-toggle-btn` de `src/app/(main)/works/[id]/page.tsx` — borrar líneas de la función (79-96) y el botón (147-158). También quitar el import de `BookTemplate` si ya no se usa en el archivo. El campo `isTemplate` en la interfaz `WorkFull` puede quedarse (se usa para otras lógicas futuras)

**Checkpoint**: Toggle de plantilla eliminado

---

## Phase 5: Polish & Verificación

**Purpose**: Verificación final

- [x] T006 [P] [haiku] Eliminar los estilos CSS de `.template-toggle-btn` en `src/app/globals.css` — buscar y borrar el bloque completo
- [x] T007 [sonnet] Ejecutar validación de quickstart.md — los 4 escenarios

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Sin dependencias
- **Phase 2 (US2)**: Depende de Phase 1 (T001 para que POST /api/works acepte isTemplate). T002 y T003 son secuenciales (T003 usa el endpoint de T002)
- **Phase 3 (US1)**: Depende de Phase 1 (T001 para isTemplate en POST)
- **Phase 4 (US3)**: Sin dependencias (solo borra código)
- **Phase 5 (Polish)**: Depende de todas las fases

### Parallel Opportunities

- T005 y T006 son paralelas (archivos distintos)
- Phase 3 (US1) y Phase 4 (US3) pueden ser paralelas tras Phase 1
- T002 puede correr en paralelo con T004 y T005 (archivos distintos)

---

## Implementation Strategy

### MVP (US1 + US2 + US3)

1. Phase 1: T001 (isTemplate en POST)
2. Phase 2: T002 (endpoint clone) → T003 (menú ⋮)
3. Phase 3: T004 (botón "Nueva plantilla")
4. Phase 4: T005 (quitar toggle)
5. Phase 5: T006 + T007 (CSS cleanup + validación)
