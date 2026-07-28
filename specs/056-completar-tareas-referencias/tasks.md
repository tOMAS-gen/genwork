# Tasks: Completar tareas de referencia desde el sector de referencia

**Input**: Design documents from `/specs/056-completar-tareas-referencias/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] [C:complexity->model] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- **[C:complexity->model]**: Task complexity (`high` | `medium` | `low`) and the model assigned to execute it, taken from `models.json` (`by_complexity`)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Inspect current permission rule and references rendering.

- [x] T001 [C:low->9router/cc/claude-haiku-4-5-20251001] Inspect `src/lib/domain/permissions/index.ts` (Regla 5 / `canToggle`) and `src/app/(main)/sectors/[id]/page.tsx` references section to confirm current behavior

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core permission rule change that MUST be complete before UI work.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T002 [C:high->9router/cc/claude-opus-4-8] Extend `canToggle` in `src/lib/domain/permissions/index.ts` to allow completing when the user operates any `refSector`, and update the JSDoc comment for Regla 5

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Completar tareas de referencia desde el sector que las referencia (Priority: P1) 🎯 MVP

**Goal**: Allow reference tasks in the sector view to be completed/changed-status when the user operates that sector.

**Independent Test**: Open a sector with reference tasks, complete one from the "Referencias" section, and verify it persists in its execution sector.

### Tests for User Story 1

- [x] T003 [P] [US1] [C:medium->9router/cx/gpt-5.4] Update `src/lib/domain/permissions/__tests__/permissions.test.ts`: change the existing "EXEC habilita, REF no" test to "REF also enables when user operates the REF sector", and add cases for REF-read-only and mixed EXEC/REF
- [x] T004 [P] [US1] [C:medium->9router/cx/gpt-5.4] Add integration test `src/server/__tests__/setTaskStatus.test.ts` for `setTaskStatus` covering: success when user operates a REF sector, forbidden when user only reads the REF sector

### Implementation for User Story 1

- [x] T005 [US1] [C:medium->9router/cx/gpt-5.4] Update error message in `src/server/tasks.ts` `setTaskStatus` to a generic permission-denied message (no longer says "no desde una referencia")
- [x] T006 [US1] [C:medium->9router/cx/gpt-5.4] Update `src/app/(main)/sectors/[id]/page.tsx` to pass `canToggle={canOperate}` to `TaskItem` instances inside `view.refs`
- [x] T007 [P] [US1] [C:low->9router/cc/claude-haiku-4-5-20251001] Verify the checkbox and status selector now appear for reference tasks when the user operates the sector, and remain hidden for read-only users

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Actualizar la ayuda textual del apartado Referencias (Priority: P2)

**Goal**: Update the explanatory text of the "Referencias" section to match the new behavior.

**Independent Test**: Open a sector with references and verify the helper text no longer says references can only be completed in their execution sector.

### Implementation for User Story 2

- [x] T008 [US2] [C:low->9router/cc/claude-haiku-4-5-20251001] Replace the explanatory paragraph in `src/app/(main)/sectors/[id]/page.tsx` references section with text that indicates tasks can be completed from this view

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Documentation alignment, full test run, and quickstart validation.

- [x] T009 [P] [C:low->9router/cc/claude-haiku-4-5-20251001] Update `specs/001-gestion-trabajos-sectores/data-model.md` (or equivalent docs) if it documents "REF never enables complete"; align with new rule
- [x] T010 [C:medium->9router/cx/gpt-5.4] Run `npm run lint` and `npm run test` and fix any regressions introduced by the changes
- [x] T011 [C:low->9router/cc/claude-haiku-4-5-20251001] Run quickstart.md validation steps manually in the local app: complete a reference task from the references section and verify it reflects in the execution sector

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
- **User Story 2 (P2)**: Can start after Foundational (Phase 2). UI-only text change.

### Within Each User Story

- Tests (if included) MUST be written and FAIL before implementation
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- T003 and T004 can run in parallel (different test files).
- T005, T006, T008 can run in parallel once T002 is done (different files).
- T009 and T010 can run in parallel.

---

## Implementation Strategy

### MVP First (User Story 1 + User Story 2)

1. Complete Phase 1: Setup inspection
2. Complete Phase 2: Foundational permission rule change
3. Complete Phase 3: User Story 1 (enable completing references)
4. Complete Phase 4: User Story 2 (update helper text)
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
