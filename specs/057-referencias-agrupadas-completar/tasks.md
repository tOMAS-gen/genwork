# Tasks: Agrupar referencias por proyecto/sector y permitir completar en tabla y Mis referencias

**Input**: Design documents from `/specs/057-referencias-agrupadas-completar/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] [C:complexity->model] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- **[C:complexity->model]**: Task complexity (`high` | `medium` | `low`) and the model assigned to execute it, taken from `models.json` (`by_complexity`)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm current reference display paths and shared data shapes.

- [x] T001 [C:low->9router/cc/claude-haiku-4-5-20251001] Inspect `src/app/(main)/sectors/[id]/page.tsx`, `src/app/(main)/references/page.tsx`, and `src/app/api/me/references/route.ts` to confirm current flat/grouped reference rendering and available fields

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build reusable grouping/header primitives before updating views.

- [x] T002 [C:medium->9router/cx/gpt-5.4] Extend `src/components/tasks/TaskGroupHeader.tsx` to support a sector-origin header (`Sector — Grupo`) in addition to project headers (`Proyecto — Grupo`)
- [x] T003 [P] [C:medium->9router/cx/gpt-5.4] Create pure helper `src/components/tasks/groupReferencesBySource.ts` that groups `TaskDto[]` by work first, then home sector fallback, preserving stable alphabetical ordering
- [x] T004 [P] [C:low->9router/cc/claude-haiku-4-5-20251001] Add unit tests in `tests/unit/references-grouping.test.ts` for work grouping, sector fallback grouping, sorting, and missing-group fallback labels

**Checkpoint**: Foundation ready - user story implementation can now begin.

---

## Phase 3: User Story 1 - Agrupar las referencias de un sector por proyecto o sector de origen (Priority: P1) MVP

**Goal**: Render sector references grouped under meaningful headers instead of a flat list.

**Independent Test**: Open a sector with references from multiple projects/sectors and verify grouped headers `Proyecto — Grupo` or `Sector — Grupo`.

### Implementation for User Story 1

- [x] T005 [US1] [C:medium->9router/cx/gpt-5.4] Update `src/app/api/sectors/[id]/tasks/route.ts` to include `homeSector.group` in reference task data when needed for sector-origin grouping
- [x] T006 [US1] [C:medium->9router/cx/gpt-5.4] Update `src/app/(main)/sectors/[id]/page.tsx` references section to render groups from `groupReferencesBySource(view.refs)` with `TaskGroupHeader`
- [x] T007 [US1] [C:low->9router/cc/claude-haiku-4-5-20251001] Preserve `canToggle={canOperate}` and `onChanged={load}` for every referenced task in grouped rendering in `src/app/(main)/sectors/[id]/page.tsx`

**Checkpoint**: User Story 1 should be fully functional and testable independently.

---

## Phase 4: User Story 2 - Completar referencias en la vista de tabla del sector (Priority: P1)

**Goal**: Ensure references remain completable when the sector is in board/table mode.

**Independent Test**: Switch a sector to board/table view and complete a reference task from the references area.

### Implementation for User Story 2

- [x] T008 [US2] [C:medium->9router/cx/gpt-5.4] Verify/update `src/app/(main)/sectors/[id]/page.tsx` so the references section renders after both list and board views and keeps completion enabled for operable users

**Checkpoint**: User Story 2 should be testable independently.

---

## Phase 5: User Story 3 - Mis referencias agrupadas y completables (Priority: P1)

**Goal**: Make `/references` use the same grouping and completion behavior.

**Independent Test**: Open `/references`, verify grouping by project/sector with group, and complete an operable reference task.

### Implementation for User Story 3

- [x] T009 [US3] [C:medium->9router/cx/gpt-5.4] Extend `src/app/api/me/references/route.ts` to include `work.group`, `homeSector.group`, labels as needed by `TaskItem`, and `statusOptions`
- [x] T010 [US3] [C:high->9router/cc/claude-opus-4-8] Add per-task completion eligibility to `/api/me/references` response so `/references` can pass `canToggle` only when the user operates a relevant REF sector
- [x] T011 [US3] [C:medium->9router/cx/gpt-5.4] Update `src/app/(main)/references/page.tsx` to render grouped references using `groupReferencesBySource`, `TaskGroupHeader`, and per-task completion eligibility
- [x] T012 [P] [US3] [C:medium->9router/cx/gpt-5.4] Add/extend tests for `/api/me/references` response shape and completion eligibility if an existing API test pattern is available

**Checkpoint**: User Story 3 should be fully functional and testable independently.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verification, docs, and quickstart validation.

- [x] T013 [C:medium->9router/cx/gpt-5.4] Run `npm run test` and fix regressions introduced by grouping/completion changes
- [x] T014 [C:low->9router/cc/claude-haiku-4-5-20251001] Run `npm run lint` and confirm only pre-existing unrelated lint issues remain, or fix new issues
- [x] T015 [C:low->9router/cc/claude-haiku-4-5-20251001] Validate `specs/057-referencias-agrupadas-completar/quickstart.md` manually or by code inspection where UI execution is not available

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup completion
- **User Stories (Phase 3+)**: Depend on Foundational completion
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1**: Depends on grouping helper and header support.
- **US2**: Depends on US1 grouped references rendering in the sector page.
- **US3**: Depends on grouping helper and may proceed in parallel with US1 after foundational tasks, but endpoint changes must precede page changes.

### Parallel Opportunities

- T003 and T004 can run in parallel after T002 if file ownership is clear.
- T005 and T009 can run in parallel because they touch different endpoints.
- T006 and T011 can run in parallel after the helper is complete.

---

## Implementation Strategy

### MVP First

1. Complete Phase 1 and Phase 2.
2. Implement US1 for sector references grouping.
3. Verify references remain completable in sector list/board context.
4. Implement US3 for `/references`.
5. Run full tests and quickstart validation.

---

## Notes

- Keep UI strings in Spanish.
- Do not add new DB schema fields.
- Keep `TaskItem` behavior unchanged outside reference contexts unless required by explicit eligibility props.
