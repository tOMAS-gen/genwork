# Tasks: Indicador de grupo para tareas agrupadas por proyecto en sector

**Input**: Design documents from `/specs/055-indicador-grupo-tareas/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] [C:complexity->model] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- **[C:complexity->model]**: Task complexity (`high` | `medium` | `low`) and the model assigned to execute it, taken from `models.json` (`by_complexity`)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: No shared infrastructure changes required; this feature is pure frontend presentation on existing components.

- [x] T001 [C:low->9router/cc/claude-haiku-4-5-20251001] Inspect current sector page and TaskItem rendering to confirm group header location and work-tag injection logic in `src/app/(main)/sectors/[id]/page.tsx` and `src/components/tasks/TaskItem.tsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T002 [C:medium->9router/cx/gpt-5.4] Create reusable `TaskGroupHeader` component in `src/components/tasks/TaskGroupHeader.tsx` with design-system tokens (fondo suave, borde, tipografía, truncamiento con ellipsis) and semantic heading

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Ver claramente a qué proyecto pertenece cada grupo de tareas en un sector (Priority: P1) 🎯 MVP

**Goal**: Replace the subtle `<h3>` project name in the sector task list with a clear `TaskGroupHeader` so each grouped block is visually identifiable as belonging to a project.

**Independent Test**: Open a sector with tasks from multiple projects and verify each group has a distinct header with the project name.

### Implementation for User Story 1

- [x] T003 [US1] [C:medium->9router/cx/gpt-5.4] Replace inline `<h3>` group title in `src/app/(main)/sectors/[id]/page.tsx` (lines ~248) with `<TaskGroupHeader work={group.work} />` for each `byWork` group
- [x] T004 [P] [US1] [C:low->9router/cc/claude-haiku-4-5-20251001] Add or extend CSS classes in `src/app/globals.css` for `.task-group-header` and variants using design-system tokens (`--surface`, `--muted`, `--border`, `--radius-sm`, `--text-sm`)
- [x] T005 [US1] [C:medium->9router/cx/gpt-5.4] Ensure loose tasks section remains visually separate and does not use `TaskGroupHeader` (or uses a dedicated "Sin proyecto" label if desired per spec FR-003)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Eliminar el nombre de proyecto redundante de cada tarea en la vista de sector (Priority: P1)

**Goal**: Suppress the automatically injected `/NombreDelProyecto` chip in `TaskItem` when the task is rendered inside a project group in the sector view.

**Independent Test**: Open a sector with project-grouped tasks and verify no task shows the redundant `/NombreDelProyecto` chip, while explicit user-written `/NombreProyecto` tags remain visible.

### Tests for User Story 2

- [x] T006 [P] [US2] [C:low->9router/cc/claude-haiku-4-5-20251001] Add unit tests in `tests/unit/task-suppress-work-tag.test.ts` covering: auto-tag suppressed in sector group, explicit tag preserved, no suppression outside sector group

### Implementation for User Story 2

- [x] T007 [US2] [C:medium->9router/cx/gpt-5.4] Add optional `suppressWorkTag` prop to `TaskItem` context and skip automatic `/workName` chip rendering in `src/components/tasks/TaskItem.tsx` when true
- [x] T008 [US2] [C:low->9router/cc/claude-haiku-4-5-20251001] Pass `suppressWorkTag={true}` from `src/app/(main)/sectors/[id]/page.tsx` to `TaskItem` instances inside `byWork` groups; leave loose tasks and board view unchanged
- [x] T009 [P] [US2] [C:low->9router/cc/claude-haiku-4-5-20251001] Verify dashboard, board view, and global task views still show the `/NombreDelProyecto` chip as before (no regression)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Component tests, accessibility verification, and quickstart validation.

- [x] T010 [P] [C:low->9router/cc/claude-haiku-4-5-20251001] Add component test for `TaskGroupHeader` in `tests/unit/task-group-header.test.tsx` verifying render, project name display, and semantic heading
- [x] T011 [C:medium->9router/cx/gpt-5.4] Run `npm run lint` and `npm run test` (or `vitest run`) and fix any regressions introduced by the changes
- [x] T012 [C:low->9router/cc/claude-haiku-4-5-20251001] Run quickstart.md validation steps manually in the local app: sector view shows group headers, no redundant project chip, loose tasks separate, other views unchanged

---

## Phase 6: Convergence — Mostrar grupo del proyecto en el encabezado

**Purpose**: El encabezado de grupo debe mostrar también el grupo al que pertenece el proyecto, no solo el nombre del proyecto.

- [x] T013 [C:medium->9router/cx/gpt-5.4] Extender `GET /api/sectors/:id/tasks` en `src/app/api/sectors/[id]/tasks/route.ts` para incluir `work.group` (`id`, `name`) en cada grupo `byWork`
- [x] T014 [C:low->9router/cc/claude-haiku-4-5-20251001] Actualizar el tipo `SectorView` en `src/app/(main)/sectors/[id]/page.tsx` para reflejar `work.group`
- [x] T015 [C:medium->9router/cx/gpt-5.4] Actualizar `TaskGroupHeader` en `src/components/tasks/TaskGroupHeader.tsx` para mostrar "Grupo — Proyecto" cuando el proyecto tenga grupo, y solo el proyecto cuando no
- [x] T016 [P] [C:low->9router/cc/claude-haiku-4-5-20251001] Actualizar tests de `TaskGroupHeader` para cubrir proyecto con grupo y proyecto personal sin grupo
- [x] T017 [C:medium->9router/cx/gpt-5.4] Actualizar `spec.md`, `plan.md` y `data-model.md` para documentar que el encabezado incluye el grupo del proyecto

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2). No dependencies on User Story 2.
- **User Story 2 (P1)**: Can start after Foundational (Phase 2). Depends on User Story 1 in the sense that the sector page must already render grouped tasks, but the suppression logic can be developed in parallel and wired after T003.

### Within Each User Story

- Tests (if included) MUST be written and FAIL before implementation
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- T003 and T007 can run in parallel once T002 is done (different files: page.tsx vs TaskItem.tsx).
- T004, T006, T008, T010 can run in parallel when dependencies allow.

---

## Implementation Strategy

### MVP First (User Story 1 + User Story 2)

1. Complete Phase 1: Setup inspection
2. Complete Phase 2: Foundational `TaskGroupHeader`
3. Complete Phase 3: User Story 1 (group header in sector page)
4. Complete Phase 4: User Story 2 (suppress redundant work tag)
5. **STOP and VALIDATE**: Test both stories independently
6. Complete Phase 5: Polish & tests

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. User Story 1 → Test independently
3. User Story 2 → Test independently
4. Polish → Deploy/Demo

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
