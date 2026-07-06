# Tasks: Fechas y Estados Configurables de Proyecto

**Input**: Design documents from `/specs/012-fechas-estados-proyecto/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: Se incluyen tests unitarios para la lógica de parsing de fechas (core de dominio, requerido por Constitution).

**Organization**: Tasks grouped by user story. Each story is independently testable.

## Format: `[ID] [P?] [Story] [model] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1, US2, US3
- **[model]**: [haiku] mecánico, [sonnet] código normal, [opus] lógica compleja/migración

---

## Phase 1: Setup (Schema & Migration)

**Purpose**: Extender el schema de Prisma con los campos y modelos nuevos

- [x] T001 [opus] Extender prisma/schema.prisma: agregar `dueDate DateTime?` a Task, modelo ProjectStage (id, name, color?, sortOrder, groupId con @@unique([groupId,name])), y relación Work.stageId → ProjectStage con onDelete:SetNull
- [x] T002 [haiku] Generar y aplicar migración Prisma `0005_project_stages` ejecutando `npx prisma migrate dev --name project_stages`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Parser de fechas y extensión de queries — MUST complete before user stories

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 [sonnet] Crear src/lib/domain/dates/parser.ts con función `parseDates(rawText: string): ParsedDate[]` — regex `\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b`, validación con Date, rango 2000-2099, retorna array con day/month/year/start/end/iso
- [x] T004 [P] [sonnet] Crear tests/unit/date-parser.test.ts — tests para parseDates: fecha válida DD/MM/AAAA, DD-MM-AAAA, fecha inválida (31/02, 32/01), fuera de rango, múltiples fechas, sin fechas, formato argentino (01/02 = 1 de febrero)
- [x] T005 [sonnet] Extender src/server/api.ts para incluir `stage: { id, name, color }` en los includes de Work (queries que devuelven Work deben traer la relación stage)
- [x] T006 [P] [haiku] Agregar estilos CSS en src/app/globals.css: variable --tag-date para color de fecha en overlay/chips, clase .date-chip para chip inline con ícono, clase .stage-badge para pills de estado con color dinámico

**Checkpoint**: Parser de fechas testeado, queries de Work incluyen stage, estilos CSS definidos. User stories pueden comenzar.

---

## Phase 3: User Story 1 — Fecha de entrega del proyecto (Priority: P1) 🎯 MVP

**Goal**: El usuario puede asignar, modificar y borrar la fecha de entrega de un proyecto desde su vista de detalle, con indicador visual de días restantes.

**Independent Test**: Abrir un proyecto → asignar fecha → recargar → verificar persistencia y "X días restantes" en StatusBar.

### Implementation for User Story 1

- [x] T007 [P] [US1] [sonnet] Extender PATCH en src/app/api/works/[id]/route.ts para aceptar `dueDate: string | null` en el body, parsear como Date y persistir con Prisma
- [x] T008 [P] [US1] [sonnet] Crear src/components/works/DatePicker.tsx — componente con `<input type="date">` nativo, props: value (Date|null), onChange, formato ISO para el value y display DD/MM/AAAA
- [x] T009 [US1] [sonnet] Integrar DatePicker en src/app/(main)/works/[id]/page.tsx — mostrar junto al header del proyecto, con lógica de días restantes ("X días" o "Vencido hace X días" en rojo), fetch PATCH al cambiar
- [x] T010 [US1] [haiku] Mostrar fecha de entrega en listados de proyectos: src/app/(main)/page.tsx, src/app/(main)/groups/[id]/page.tsx — texto sutil "Entrega: DD/MM" junto al nombre si existe dueDate

**Checkpoint**: US1 funcional. Se puede asignar/modificar/borrar fecha de entrega con indicador visual.

---

## Phase 4: User Story 2 — Detección automática de fechas en tareas (Priority: P2)

**Goal**: El usuario escribe una fecha DD/MM/AAAA en el texto de una tarea y el sistema la detecta, resalta durante la escritura, muestra como chip y persiste como dueDate.

**Independent Test**: Escribir "Entregar planos 20/07/2026 #Diseño" → verificar chip de fecha → verificar dueDate guardado.

### Implementation for User Story 2

- [x] T011 [P] [US2] [sonnet] Integrar parseDates en src/server/tasks.ts — en funciones de create y update, extraer primera fecha válida del rawText y guardar como dueDate de la tarea; si no hay fecha, dueDate = null
- [x] T012 [P] [US2] [sonnet] Extender PATCH en src/app/api/tasks/[id]/route.ts para que al actualizar rawText, re-ejecute parseDates y actualice dueDate; incluir dueDate en la respuesta JSON
- [x] T013 [US2] [sonnet] Extender src/components/tasks/TagHighlightInput.tsx — agregar detección de fechas en el overlay: parseDates sobre el texto del input y renderizar las fechas encontradas con --tag-date (definido en T006)
- [x] T014 [US2] [sonnet] Extender src/components/tasks/TaskItem.tsx renderInlineSegments — detectar fechas en el texto renderizado y mostrar como chip inline con ícono Calendar (lucide-react) usando clase .date-chip (definida en T006)

**Checkpoint**: US2 funcional. Fechas inline se detectan, resaltan, muestran como chip y persisten como dueDate.

---

## Phase 5: User Story 3 — Estados de producción configurables (Priority: P3)

**Goal**: Admin configura estados de producción (nombre + color). Usuarios asignan un estado a cada proyecto. El estado se muestra como badge en detalle y listados.

**Independent Test**: Crear estados en /admin/stages → asignar uno a un proyecto → verificar badge en detalle y listado.

### Implementation for User Story 3

- [x] T015 [P] [US3] [sonnet] Crear API CRUD de stages: src/app/api/stages/route.ts (GET list por groupId, POST create) y src/app/api/stages/[id]/route.ts (PATCH update, DELETE con SetNull en works) — validar unicidad nombre+groupId, sortOrder automático
- [x] T016 [P] [US3] [sonnet] Crear src/app/api/stages/reorder/route.ts — PUT que recibe array de ids y actualiza sortOrder según posición
- [x] T017 [P] [US3] [sonnet] Crear src/app/(main)/admin/stages/page.tsx — página admin con lista de stages, formulario para crear/editar (nombre + color picker), botones reorder y delete, siguiendo el patrón visual de /admin/labels
- [x] T018 [US3] [haiku] Agregar link "Estados de producción" en src/app/(main)/admin/page.tsx apuntando a /admin/stages, con ícono apropiado
- [x] T019 [US3] [sonnet] Crear src/components/works/StageSelector.tsx — selector dropdown que lista stages del grupo, muestra pill con color, y hace PATCH a /api/works/[id] con stageId al seleccionar; usa clase .stage-badge (definida en T006)
- [x] T020 [US3] [sonnet] Integrar StageSelector en src/app/(main)/works/[id]/page.tsx — mostrar junto al header del proyecto (cerca del DatePicker), visible solo si hay stages configurados
- [x] T021 [US3] [sonnet] Mostrar stage badge (pill con color) en listados de proyectos: src/app/(main)/page.tsx, src/app/(main)/groups/[id]/page.tsx, src/app/(main)/sectors/[id]/page.tsx — junto a labels existentes

**Checkpoint**: US3 funcional. Stages se configuran en admin, se asignan a proyectos, y se muestran como badge.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validación final y ajustes transversales

- [x] T022 [haiku] Ejecutar validaciones de quickstart.md: las 6 validaciones manuales del documento

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (schema must be migrated)
- **US1 (Phase 3)**: Depends on Phase 2 — dueDate on Work already exists, but needs api.ts extended
- **US2 (Phase 4)**: Depends on Phase 2 — needs parseDates() and Task.dueDate
- **US3 (Phase 5)**: Depends on Phase 2 — needs ProjectStage model and api.ts stage includes
- **Polish (Phase 6)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (P1)**: Independent. Can start after Phase 2.
- **US2 (P2)**: Independent of US1. Can start after Phase 2. Uses parseDates from Phase 2.
- **US3 (P3)**: Independent of US1 and US2. Can start after Phase 2.
- **US1, US2, US3 can proceed in parallel** after Phase 2 completes.

### Within Each User Story

- API routes before UI components that consume them
- Components before page integration
- Core functionality before display in listings

### Parallel Opportunities

**Phase 2**: T003, T004, T005, T006 can run in parallel (different files, no dependencies).

**Phase 3 (US1)**: T007 (API) and T008 (component) in parallel → T009 (integration) → T010 (listings).

**Phase 4 (US2)**: T011 (server) and T012 (API) in parallel → T013 (input overlay) → T014 (display chip).

**Phase 5 (US3)**: T015, T016, T017 in parallel (API + admin page) → T018 (admin link) + T019 (selector) → T020 (integration) → T021 (listings).

---

## Parallel Example: All User Stories After Phase 2

```
# After Phase 2 completes, launch all three stories:

# US1 — parallel start:
Agent: T007 "Extend PATCH works/[id] for dueDate"
Agent: T008 "Create DatePicker component"

# US2 — parallel start:
Agent: T011 "Integrate parseDates in server/tasks.ts"
Agent: T012 "Extend PATCH tasks/[id] for date re-parse"

# US3 — parallel start:
Agent: T015 "Create stages CRUD API"
Agent: T016 "Create stages reorder endpoint"
Agent: T017 "Create admin stages page"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Schema + migration
2. Phase 2: Parser + query extension
3. Phase 3: US1 — Date picker for projects
4. **STOP and VALIDATE**: Test date assignment/persistence/display
5. Deploy if ready

### Incremental Delivery

1. Phase 1 + 2 → Foundation ready
2. + US1 → Fecha de proyecto funcional (MVP)
3. + US2 → Fechas inline en tareas
4. + US3 → Estados configurables
5. + Polish → Validación completa

---

## Notes

- Constitution: parseDates es core de dominio → tests obligatorios (T004)
- Constitution: fecha inline extiende Principio II (etiquetado inline)
- Constitution: ProjectStage NO reemplaza estados de tarea (Principio IV)
- [P] tasks = different files, no dependencies
- Model tags: [haiku] mecánico, [sonnet] normal, [opus] migración/riesgo
