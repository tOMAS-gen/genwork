# Tasks: Plantillas de Proyecto

**Input**: Design documents from `specs/016-plantillas-proyecto/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api-contracts.md, quickstart.md

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] [model] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1, US2, US3, US4)
- **[model]**: haiku | sonnet | opus — model tag per speckit-auto pipeline

---

## Phase 1: Setup

**Purpose**: Schema migration and shared infrastructure

- [x] T001 [haiku] Agregar campo `isTemplate Boolean @default(false)` al modelo Work en `prisma/schema.prisma`
- [x] T002 [sonnet] Crear migración Prisma `0005_work_templates` y aplicarla en `prisma/migrations/0005_work_templates/migration.sql`

---

## Phase 2: Foundational

**Purpose**: Lógica de clonación de tareas — bloquea US1 y US2

- [x] T003 [opus] Crear función `cloneTasksFromTemplate(templateWorkId, newWorkId, creatorId, tx)` en `src/lib/domain/works/cloneFromTemplate.ts` — dentro de una transacción Prisma, leer tareas PENDING del template con sus TaskLinks preservando el orden de creación, crear nuevas Tasks en el proyecto destino preservando rawText/displayText/sectorId, y recrear TaskLinks válidos (verificar existencia de sector/usuario target antes de crear cada link)
- [x] T004 [sonnet] Crear test unitario para `cloneFromTemplate` en `tests/unit/clone-template.test.ts` — verificar: clona solo tareas PENDING, preserva texto y etiquetas, no clona tareas DONE, tareas clonadas son independientes, links a sectores inexistentes se omiten

**Checkpoint**: Lógica de clonación lista y testeada

---

## Phase 3: User Story 1 — Marcar proyecto como plantilla (P1) 🎯 MVP

**Goal**: Toggle isTemplate en proyectos existentes, indicador visual en listado y detalle

**Independent Test**: Marcar un proyecto como plantilla, verificar badge visible en listado, desmarcar y confirmar que desaparece

### Implementation

- [x] T005 [US1] [sonnet] Modificar `PATCH /api/works/[id]` en `src/app/api/works/[id]/route.ts` para aceptar campo `isTemplate: boolean` en el body y persistirlo
- [x] T006 [US1] [sonnet] Modificar `GET /api/works` en `src/app/api/works/route.ts` para incluir `isTemplate` en la respuesta de cada Work
- [x] T007 [US1] [sonnet] Agregar toggle "Usar como plantilla" en la vista de detalle del proyecto en `src/app/(main)/works/[id]/page.tsx` — switch o botón que llama PATCH con `{isTemplate: true/false}`
- [x] T008 [US1] [sonnet] Agregar badge/ícono de plantilla en las cards de proyecto en `src/app/(main)/page.tsx` — mostrar indicador visual cuando `work.isTemplate === true`
- [x] T009 [US1] [haiku] Agregar ícono de plantilla (BookTemplate o similar de Lucide) en `src/components/ui/icons.tsx`

**Checkpoint**: Se puede marcar/desmarcar proyectos como plantilla con feedback visual

---

## Phase 4: User Story 2 — Crear proyecto desde plantilla (P1)

**Goal**: Seleccionar plantilla al crear proyecto, clonar tareas automáticamente

**Independent Test**: Crear proyecto desde plantilla, verificar que todas las tareas pendientes se clonaron, modificar tarea clonada y confirmar que plantilla no se afecta

### Implementation

- [x] T010 [US2] [sonnet] Modificar `POST /api/works` en `src/app/api/works/route.ts` para aceptar `cloneFromId` opcional en body — si presente, validar que es plantilla activa y llamar a `cloneTasksFromTemplate` después de crear el Work
- [x] T011 [US2] [sonnet] Crear componente `TemplateSelector` en `src/components/works/TemplateSelector.tsx` — modal/dialog que lista plantillas disponibles (GET /api/works?filter=templates), permite seleccionar una, muestra preview de cantidad de tareas, y retorna el ID seleccionado
- [x] T012 [US2] [sonnet] Integrar `TemplateSelector` en el flujo de creación de proyecto en `src/app/(main)/page.tsx` — al crear proyecto nuevo, ofrecer opción "Desde plantilla" que abre el selector, y pasar `cloneFromId` al POST

**Checkpoint**: Se pueden crear proyectos desde plantilla con tareas clonadas automáticamente

---

## Phase 5: User Story 3 — Filtrar y ver plantillas (P2)

**Goal**: Filtro dedicado para ver solo plantillas en el listado

**Independent Test**: Filtrar por "Plantillas" y verificar que solo aparecen proyectos marcados como tal

### Implementation

- [x] T013 [US3] [sonnet] Modificar `GET /api/works` en `src/app/api/works/route.ts` para soportar `?filter=templates` — filtrar `WHERE isTemplate=true AND status=ACTIVE`
- [x] T014 [US3] [sonnet] Agregar opción "Plantillas" al toolbar de filtros en `src/app/(main)/page.tsx` — análogo a los filtros existentes (mine, favorites, archived)

**Checkpoint**: Filtro de plantillas funcional en el listado

---

## Phase 6: User Story 4 — Acceso rápido desde drawer (P3)

**Goal**: Acceso a creación desde plantilla desde la navegación lateral

**Independent Test**: Desde el drawer, acceder a crear proyecto desde plantilla sin navegar al listado

### Implementation

- [x] T015 [US4] [sonnet] Agregar enlace o botón "Nuevo desde plantilla" en la sección de Proyectos del drawer en `src/components/nav/DrawerNav.tsx` — link que navega a la página de proyectos con parámetro para abrir el selector de plantillas (ej: `/?newFromTemplate=1`)

**Checkpoint**: Acceso rápido desde drawer funcional

---

## Phase 7: Polish & Cross-Cutting

**Purpose**: Verificación final y edge cases

- [x] T016 [P] [sonnet] Verificar que archivar una plantilla la excluye del selector de plantillas — test manual via quickstart.md escenario 4
- [x] T017 [P] [haiku] Actualizar label de "Dashboard" a "Vista de tareas" si queda alguna referencia pendiente — buscar en todo el proyecto
- [x] T018 [sonnet] Ejecutar validación completa de quickstart.md — los 4 escenarios + verificación por API

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Sin dependencias — empezar inmediatamente
- **Phase 2 (Foundational)**: Depende de Phase 1 (schema + migration)
- **Phase 3 (US1)**: Depende de Phase 1 (campo isTemplate en schema). T005-T006 pueden arrancar tras T002.
- **Phase 4 (US2)**: Depende de Phase 2 (función de clonación) + Phase 3 (necesita plantillas existentes para clonar)
- **Phase 5 (US3)**: Depende de Phase 1. Puede ejecutarse en paralelo con Phase 3.
- **Phase 6 (US4)**: Depende de Phase 4 (necesita el TemplateSelector funcional)
- **Phase 7 (Polish)**: Depende de todas las fases anteriores

### Parallel Opportunities

- T001 y T009 son paralelas (schema y ícono, archivos distintos)
- T005 y T006 son paralelas (archivos distintos dentro de US1)
- T007 y T008 son paralelas (páginas distintas dentro de US1)
- T013 y T014 son paralelas (API y UI de filtro, dentro de US3)
- Phase 3 (US1) y Phase 5 (US3) pueden ejecutarse en paralelo tras Phase 1
- T016 y T017 son paralelas en Phase 7

---

## Implementation Strategy

### MVP (US1 + US2)

1. Phase 1: Setup → campo isTemplate + migración
2. Phase 2: Foundational → lógica de clonación + test
3. Phase 3: US1 → marcar como plantilla + indicador visual
4. Phase 4: US2 → crear desde plantilla
5. **STOP y VALIDAR**: probar escenarios 1 y 2 de quickstart.md

### Incremental

6. Phase 5: US3 → filtro de plantillas
7. Phase 6: US4 → acceso desde drawer
8. Phase 7: polish + validación completa
