# Tasks: Dashboard de sectores y tareas agrupadas por proyecto

**Input**: Design documents from `/specs/013-sector-dashboard-tareas/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md

## Format: `[ID] [P?] [Story] [model] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1–US5)
- **[model]**: haiku | sonnet | opus
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Migración de base de datos — agregar campo `color` al modelo Sector

- [x] T001 [haiku] Agregar campo `color LabelColor?` al modelo Sector en prisma/schema.prisma y generar migración en prisma/migrations/0005_sector_color/

---

## Phase 2: Foundational

**Purpose**: Lógica de dominio compartida y cambios a la API que necesitan todas las user stories

- [x] T002 [P] [sonnet] Crear función de asignación automática de color en src/lib/domain/sectors/colorAssign.ts — recibe la cantidad de sectores existentes en el ámbito, devuelve un LabelColor rotando por la lista de colores
- [x] T003 [P] [sonnet] Actualizar POST /api/sectors en src/app/api/sectors/route.ts — aceptar campo `color` opcional en el body, si no se pasa llamar a colorAssign para asignar automáticamente. Incluir `color` en el response
- [x] T004 [sonnet] Actualizar PATCH /api/sectors/[id] en src/app/api/sectors/[id]/route.ts — aceptar campo `color` en el body (LabelColor o null), validar con zod. Response incluye color actualizado
- [x] T005 [sonnet] Actualizar GET /api/sectors en src/app/api/sectors/route.ts — incluir campo `color` del sector y agregar métricas de tareas (total, done, pending) para cada sector. Métricas = contar tareas via TaskLink EXEC + tareas sueltas con sectorId, agrupando por state

**Checkpoint**: API de sectores devuelve colores y métricas. Migración aplicada.

---

## Phase 3: User Story 1 — Dashboard de sectores con métricas (P1) 🎯 MVP

**Goal**: Página `/sectors` muestra cards con color, conteo de tareas y barra de progreso

**Independent Test**: Navegar a `/sectors`, verificar cards con color, metrics (done/total) y progress bar

- [x] T006 [P] [US1] [sonnet] Crear componente SectorCard en src/components/sectors/SectorCard.tsx — recibe sector con color, metrics (total, done, pending). Muestra: dot de color, nombre con `#`, conteo "done/total tareas", barra de progreso con porcentaje. Usar clases CSS con convención `sc-*` (sector card). Link al sector
- [x] T007 [P] [US1] [sonnet] Agregar estilos del SectorCard en src/app/globals.css — clases `sc-card`, `sc-dot`, `sc-name`, `sc-metrics`, `sc-progress-track`, `sc-progress-fill`. Dot de color con border-radius 50%. Barra similar a `status-progress-track`/`status-progress-fill`. Pills con border-radius 8px (feedback del usuario)
- [x] T008 [US1] [sonnet] Rediseñar src/app/(main)/sectors/page.tsx — reemplazar las cards actuales con SectorCard. Usar la nueva respuesta de la API con métricas. Mantener formulario de creación de sector (agregar selector de color opcional con paleta visual). Mantener empty state

**Checkpoint**: Dashboard de sectores funcional con métricas y colores

---

## Phase 4: User Story 2 — Colores identificatorios de sector (P1)

**Goal**: Color editable en cada sector, visible en dashboard y detalle

**Independent Test**: Cambiar color de un sector, verificar que se refleja en dashboard y en la vista de detalle

- [x] T009 [US2] [sonnet] Agregar selector de color en la vista de detalle del sector en src/app/(main)/sectors/[id]/page.tsx — usar paleta visual de colores (misma paleta `LabelColor`) al lado del nombre del sector. Al seleccionar un color, hacer PATCH al endpoint. Mostrar dot de color junto al `#nombre`

**Checkpoint**: Colores editables y visibles en dashboard y detalle

---

## Phase 5: User Story 3 — Vista de sector con tareas agrupadas por proyecto (P1)

**Goal**: Tareas en el sector aparecen agrupadas: sueltas primero, luego por proyecto

**Independent Test**: Entrar a un sector con tareas sueltas y de proyectos, verificar agrupación visual

- [x] T010 [US3] [opus] Reestructurar GET /api/sectors/[id]/tasks en src/app/api/sectors/[id]/tasks/route.ts — en lugar de devolver `exec` y `refs` planos, devolver `{ sector: {id, name, color}, level, loose: TaskDto[], byWork: [{work: {id, name, status}, tasks: TaskDto[]}], refs: TaskDto[] }`. Agrupar tareas exec por workId: las que tienen workId=null van a `loose`, las demás se agrupan en `byWork` ordenadas por nombre del proyecto. Mantener filtros existentes. Incluir `color` en el sector del response
- [x] T011 [US3] [sonnet] Rediseñar src/app/(main)/sectors/[id]/page.tsx — consumir la nueva estructura del API. Renderizar: (1) sección "Tareas del sector" con tareas `loose` si hay, (2) por cada entrada en `byWork` un encabezado con nombre del proyecto (link clickeable al proyecto) y sus tareas — si el proyecto está ARCHIVED marcar el encabezado con "(Archivado)", (3) sección "Referencias" al final con `refs`. Cada sección usa TaskItem existente. Mostrar dot de color del sector junto al nombre

**Checkpoint**: Vista de sector muestra tareas agrupadas por proyecto

---

## Phase 6: User Story 4 — Creación de tareas en sector con restricciones (P2)

**Goal**: Inputs de creación contextuales con `/proyecto` habilitado y `#sector` bloqueado

**Independent Test**: Crear tarea suelta, crear tarea con `/proyecto`, verificar que `#` no funciona

- [x] T012 [US4] [sonnet] Agregar inputs de creación por grupo en src/app/(main)/sectors/[id]/page.tsx — (1) input general arriba para tareas sueltas o con `/proyecto`, (2) dentro de cada grupo de proyecto un TaskListEditor con context `{ sectorId, workId }` para crear tareas directamente vinculadas al proyecto
- [x] T013 [US4] [sonnet] Modificar src/components/tasks/TaskListEditor.tsx (o src/components/tasks/useTagAutocomplete.ts) — cuando el contexto incluye `sectorId` (vista de sector), deshabilitar el autocompletado y procesamiento de `#` (hashtag). El parser no debe generar sugerencias de sector ni crear links de sector cuando se está creando desde un sector. El `/` (slash) sigue funcionando normalmente para referenciar proyectos

**Checkpoint**: Creación de tareas funcional con restricciones correctas

---

## Phase 7: User Story 5 — Tareas creadas en sector visibles en proyecto (P2)

**Goal**: Tareas creadas desde el sector con `/proyecto` aparecen en la vista del proyecto

**Independent Test**: Crear tarea desde sector con `/Tina`, navegar al proyecto Tina, verificar que aparece

- [x] T014 [US5] [sonnet] Verificar y ajustar si es necesario la lógica de creación de tareas en src/server/tasks.ts — cuando se crea una tarea desde contexto sector con un workId (vía `/proyecto`), asegurar que la tarea queda asociada al work correctamente (workId seteado) y que el TaskLink EXEC apunta al sector. Verificar que la vista de proyecto (`GET /api/works/[id]`) incluye estas tareas en su lista

**Checkpoint**: Consistencia bidireccional sector ↔ proyecto verificada

---

## Phase 8: Polish & Cross-Cutting

**Purpose**: Ajustes finales y test de integración

- [x] T015 [P] [haiku] Agregar estilos para la agrupación por proyecto en la vista de sector en src/app/globals.css — clases para encabezado de grupo de proyecto (`sg-group-header`), separador entre grupos, indentación visual. Consistente con el estilo de la app
- [x] T016 [P] [sonnet] Test unitario para colorAssign en tests/unit/color-assign.test.ts — verificar rotación cíclica, que no falla con 0 sectores, que devuelve LabelColor válido
- [x] T017 [sonnet] Verificación manual end-to-end siguiendo specs/013-sector-dashboard-tareas/quickstart.md — los 5 escenarios

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Sin dependencias — migración primero
- **Phase 2 (Foundational)**: Depende de Phase 1 (schema actualizado)
- **Phase 3 (US1 Dashboard)**: Depende de Phase 2 (API con métricas y colores)
- **Phase 4 (US2 Colores)**: Depende de Phase 2 (PATCH con color). Parallelizable con Phase 3
- **Phase 5 (US3 Agrupación)**: Depende de Phase 2 (API base). Parallelizable con Phases 3-4
- **Phase 6 (US4 Creación)**: Depende de Phase 5 (vista agrupada como base para los inputs)
- **Phase 7 (US5 Consistencia)**: Depende de Phase 6 (creación funcional)
- **Phase 8 (Polish)**: Depende de todas las fases anteriores

### Parallel Opportunities

- T002, T003 pueden correr en paralelo (archivos diferentes)
- T006, T007 pueden correr en paralelo (componente + CSS)
- Phases 3, 4, 5 pueden correr en paralelo después de Phase 2
- T015, T016 pueden correr en paralelo

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Migración
2. Complete Phase 2: API con colores y métricas
3. Complete Phase 3: Dashboard con SectorCard
4. **STOP and VALIDATE**: Dashboard funcional con métricas

### Incremental Delivery

1. Setup + Foundational → API lista
2. US1 (Dashboard) → cards con métricas y colores
3. US2 (Colores editables) → selector de color en detalle
4. US3 (Agrupación) → vista de sector reestructurada
5. US4 (Creación) → inputs contextuales
6. US5 (Consistencia) → verificación bidireccional
7. Polish → tests, estilos, validación E2E

---

## Notes

- Reutilizar `LabelColor` enum existente — no crear sistema de colores nuevo
- Sector cards con border-radius 8px (no pills ovaladas) — feedback del usuario
- La restricción de `#` es solo client-side — el server sigue procesando normalmente
- Los filtros existentes en la vista de sector se mantienen compatibles
