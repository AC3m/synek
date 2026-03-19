# Tasks: Multi-Week Planning View & Copy/Drag

**Input**: Design documents from `/specs/012-multi-week-planning/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: Integration tests per user journey + unit tests for pure functions. Written **before** implementation (TDD: red → green).

**Organization**: Tasks grouped by user story. Tests come first in each phase — write them, confirm they fail, then implement.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1–US4)

---

## Phase 1: Setup

**Purpose**: Install new dependency required by DnD work (US4). Done first so all phases can reference @dnd-kit types without blocking.

- [X] T001 Install `@dnd-kit/core` and `@dnd-kit/sortable` via `pnpm add @dnd-kit/core @dnd-kit/sortable` — verify they appear in `package.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: DB function, TypeScript types, and i18n key scaffolding that all user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 Write `supabase/migrations/021_copy_sessions_rpc.sql` — define `copy_week_sessions(p_source_week_plan_id UUID, p_target_week_plan_id UUID) RETURNS integer` and `copy_day_sessions(p_source_week_plan_id UUID, p_source_day text, p_target_week_plan_id UUID, p_target_day text) RETURNS integer` per `contracts/rpc.md`; both `SECURITY DEFINER`, copy planned fields only (see `data-model.md` for exact field list)
- [X] T003 [P] Add TypeScript types `CopyWeekInput`, `CopyDayInput`, `ReorderSessionInput`, and `HistoryWeek` to `app/types/training.ts` per `data-model.md` New TypeScript Types section
- [X] T004 [P] Scaffold i18n keys in `app/i18n/resources/en/coach.json` and `app/i18n/resources/pl/coach.json` — add empty-string placeholder keys for: `history.weekLabel`, `history.sessionCount`, `history.copyWeek`, `history.copyDay`, `history.copySession`, `history.expand`, `history.collapse`, `history.noSessions`, `copy.successWeek`, `copy.successDay`, `copy.successSession`, `copy.error`, `dnd.moveToDay`

**Checkpoint**: Migration file written, types defined, i18n keys scaffolded — user story work can begin.

---

## Phase 3: User Story 1 — Multi-Week Overview (Priority: P1) 🎯 MVP

**Goal**: Coach sees 4 collapsible read-only history week rows above the current editable week.

**Independent Test**: Navigate to `/[locale]/coach/week/[weekId]` — 4 previous week rows render above current week grid, each collapsed by default (week label + session count), expandable to full read-only 7-day grid with no edit controls or drag handles.

### Tests for User Story 1

> **Write these first — confirm they FAIL before implementing T009–T012**

- [X] T005 [P] [US1] Create `app/test/unit/week-history.test.ts` — extract `computePreviousWeekIds(weekId: string, count: number): string[]` as a pure helper (to be added to `app/lib/utils/date.ts`); unit test: given `"2026-W13"` and `count=4` returns `["2026-W12","2026-W11","2026-W10","2026-W09"]`; edge case: wraps across year boundary correctly (e.g. `"2026-W01"` → `"2025-W52"`)
- [X] T006 [P] [US1] Create `app/test/integration/useWeekHistory.test.ts` — render `useWeekHistory("2026-W13", 4)` with a TanStack Query wrapper and mock data; assert: returns 4 entries in descending order, each with correct `weekId`, `weekPlan`, and `sessions` from mock store; assert: entry for a week with no plan has `weekPlan: null` and `sessions: []`
- [X] T007 [P] [US1] Create `app/test/integration/HistoryWeekRow.test.tsx` — (a) collapsed state: week label renders, session count badge renders, edit/add/delete controls are absent; (b) expanded state: clicking chevron reveals a `WeekGrid` with `readonly={true}`, all 7 day columns visible, no `+` add-session buttons; (c) read-only enforcement: no `onAddSession`/`onEditSession`/`onDeleteSession` props reach the inner grid
- [X] T008 [P] [US1] Create `app/test/integration/MultiWeekView.test.tsx` — render `MultiWeekView` with mocked `useWeekHistory`; assert: 4 `HistoryWeekRow` components render above the current `WeekGrid`; assert: current `WeekGrid` has editing props; assert: history rows do not receive editing props

### Implementation for User Story 1

- [X] T009 [P] [US1] Add `computePreviousWeekIds(weekId: string, count: number): string[]` pure helper to `app/lib/utils/date.ts` using `getPrevWeekId` iteratively — this makes T005 pass
- [X] T010 [P] [US1] Create `app/lib/hooks/useWeekHistory.ts` — export `useWeekHistory(currentWeekId: string, count: number = 4): HistoryWeek[]`; call `computePreviousWeekIds` for week IDs; compose existing `useWeekPlan` + `useSessions` hooks for each; return array most-recent-first — this makes T006 pass
- [X] T011 [US1] Create `app/components/calendar/HistoryWeekRow.tsx` — collapsed: chevron + week label + session count badge + copy button placeholder; expanded: read-only `WeekGrid readonly={true}`; local `isExpanded` state; `className?: string`; i18n via `useTranslation('coach')` — this makes T007 pass
- [X] T012 [US1] Create `app/components/calendar/MultiWeekView.tsx` — renders `useWeekHistory(currentWeekId, 4)` mapped to `HistoryWeekRow` at top + visual divider + current `WeekGrid` with all editing props; accepts full `MultiWeekViewProps` from `contracts/components.md`; `className?: string` — this makes T008 pass
- [X] T013 [US1] Update `app/routes/coach/week.$weekId.tsx` — replace `<WeekGrid …/>` with `<MultiWeekView …/>` passing `currentWeekId={weekId}` and all existing handler props; no other changes in this file

**Checkpoint**: History view live. Collapse/expand works. Current week unchanged. All US1 tests green.

---

## Phase 4: User Story 2 — Copy Day or Entire Week (Priority: P2)

**Goal**: Coach can copy all sessions from a previous week or a single day into the current week with one action.

**Independent Test**: Expand a history week row → click "Copy week ↓" → all sessions appear in the current week. Click "Copy day ↓" on a day header → that day's sessions appear in the matching day of the current week. Both persist on page refresh.

### Tests for User Story 2

> **Write these first — confirm they FAIL before implementing T018–T023**

- [X] T014 [P] [US2] Create `app/test/unit/copy-sessions.test.ts` — unit test `mockCopyWeekSessions`: (a) copies sessions from source week to target week in mock store; (b) copied sessions contain `trainingType`, `description`, `coachComments`, `plannedDurationMinutes`, `plannedDistanceKm`, `typeSpecificData`; (c) copied sessions do NOT contain `isCompleted`, `actualDurationMinutes`, `actualDistanceKm`, `avgHeartRate`, `stravaActivityId`, `traineeNotes`, `coachPostFeedback`; (d) returns correct count; same assertions for `mockCopyDaySessions` scoped to one day
- [X] T015 [P] [US2] Add to `app/test/integration/useSessions.test.ts` — `useCopyWeekSessions`: mock `supabase.rpc` with `vi.fn()`; assert mutation calls `copy_week_sessions` RPC with correct args; assert `sessions.byWeek(targetWeekPlanId)` is invalidated on success; assert error toast shown on failure; same for `useCopyDaySessions` with `copy_day_sessions`
- [X] T016 [P] [US2] Add to `app/test/integration/MultiWeekView.test.tsx` — render expanded `HistoryWeekRow` with a week that has sessions; click "Copy week ↓" button; assert `useCopyWeekSessions` mutation was called with `sourceWeekPlanId` and `currentWeekPlan.id`; click "Copy day ↓" on Monday column; assert `useCopyDaySessions` called with `sourceDay: 'monday'` and `targetDay: 'monday'`

### Implementation for User Story 2

- [X] T017 [US2] Add `copyWeekSessions(input: CopyWeekInput): Promise<number>` to `app/lib/queries/sessions.ts` — real: `supabase.rpc('copy_week_sessions', …)`; mock `mockCopyWeekSessions`: copies planned fields from source to target in mock store, returns count — makes T014 + T015 pass
- [X] T018 [US2] Add `copyDaySessions(input: CopyDayInput): Promise<number>` to `app/lib/queries/sessions.ts` — real: `supabase.rpc('copy_day_sessions', …)`; mock `mockCopyDaySessions`: filters by `sourceDay`, appends to `targetDay` with sort offset — makes T014 + T015 pass
- [X] T019 [US2] Add `useCopyWeekSessions()` to `app/lib/hooks/useSessions.ts` — `mutationFn: copyWeekSessions`; `onSuccess`: invalidate `queryKeys.sessions.byWeek(input.targetWeekPlanId)` + toast `copy.successWeek`; `onError`: toast `copy.error`
- [X] T020 [US2] Add `useCopyDaySessions()` to `app/lib/hooks/useSessions.ts` — same pattern; success toast `copy.successDay`; invalidate `queryKeys.sessions.byWeek(input.targetWeekPlanId)`
- [X] T021 [P] [US2] Update `app/components/calendar/HistoryWeekRow.tsx` — add `onCopyWeek` and `onCopyDay` props; render "Copy week ↓" button in header (disabled with tooltip when no sessions); in expanded grid pass `onCopyDay` into each `DayColumn` via new `onCopyDay` prop — makes T016 pass
- [X] T022 [P] [US2] Update `app/components/calendar/DayColumn.tsx` — add `onCopyDay?: (targetDay: DayOfWeek) => void`; in `readonly` mode render small "Copy day ↓" button in column header; calls `onCopyDay(day)` — makes T016 pass
- [X] T023 [US2] Update `app/components/calendar/MultiWeekView.tsx` — instantiate `useCopyWeekSessions` and `useCopyDaySessions`; wire handlers that supply `targetWeekPlanId` from `currentWeekPlan?.id`; pass into each `HistoryWeekRow`

**Checkpoint**: Copy week and copy day functional. US2 tests green.

---

## Phase 5: User Story 3 — Copy Individual Session (Priority: P3)

**Goal**: Coach can copy a single session from any history week to a chosen day in the current week.

**Independent Test**: Expand history week → hover session → click copy icon → day picker appears → select target day → session appears in that day with all planned fields intact; actual/Strava fields absent.

### Tests for User Story 3

> **Write these first — confirm they FAIL before implementing T027–T030**

- [X] T024 [US3] Add to `app/test/unit/copy-sessions.test.ts` — unit test the planned-field extraction used by `useCopySession`: given a `TrainingSession` with both planned AND actual fields populated, the `CreateSessionInput` built for copy contains only planned fields (`trainingType`, `description`, `coachComments`, `plannedDurationMinutes`, `plannedDistanceKm`, `typeSpecificData`) and target `weekPlanId` + `dayOfWeek`; actual/strava/athlete fields must be absent
- [X] T025 [US3] Add to `app/test/integration/HistoryWeekRow.test.tsx` — render `HistoryWeekRow` expanded with sessions; click copy icon on a session card; assert day-picker (7 day pill buttons) becomes visible; click "Thursday" pill; assert `onCopySession(session, 'thursday')` was called; press Escape; assert picker closes without calling `onCopySession`

### Implementation for User Story 3

- [X] T026 [US3] Add `useCopySession()` to `app/lib/hooks/useSessions.ts` — `mutationFn`: extract planned fields from `session` and call `createSession({ ...plannedFields, weekPlanId: targetWeekPlanId, dayOfWeek: targetDay })`; `onSuccess`: invalidate `queryKeys.sessions.byWeek(targetWeekPlanId)` + toast `copy.successSession`; `onError`: toast `copy.error` — makes T024 pass
- [X] T027 [US3] Update `app/components/training/SessionCard.tsx` — add `onCopy?: (session: TrainingSession) => void`; when provided render a `Copy` lucide icon button (14px) in the action area, visible on card hover; `stopPropagation` on click to prevent modal open — makes T025 pass (partially)
- [X] T028 [US3] Update `app/components/calendar/HistoryWeekRow.tsx` — add `onCopySession` prop; on session copy-icon click show inline day-picker (7 `DayOfWeek` pill buttons) positioned below the card; selecting a day calls `onCopySession(session, targetDay)` and hides picker; clicking outside or Escape hides picker without calling — makes T025 pass
- [X] T029 [US3] Update `app/components/calendar/MultiWeekView.tsx` — instantiate `useCopySession`; wire `onCopySession` handler supplying `targetWeekPlanId`; pass into each `HistoryWeekRow`

**Checkpoint**: All three copy granularities functional. US3 tests green.

---

## Phase 6: User Story 4 — Drag and Drop Within Current Week (Priority: P4)

**Goal**: Coach drags sessions between days and reorders within a day; changes persist.

**Independent Test**: Drag session from Monday to Thursday → moves, persists on refresh. Reorder two sessions within same day → new order persists. Release drag outside grid → session returns to original position unchanged.

### Tests for User Story 4

> **Write these first — confirm they FAIL before implementing T034–T038**

- [X] T030 [P] [US4] Create `app/test/unit/drag-end-handler.test.ts` — extract `computeDragResult(activeId: string, activeDay: DayOfWeek, overDay: DayOfWeek, sessionsByDay: SessionsByDay): ReorderSessionInput | null` as a pure function (to live in `app/lib/utils/week-view.ts`); unit test: (a) drop on different day → returns `{ sessionId, dayOfWeek: overDay, sortOrder: appendedValue }`; (b) drop on same day at different position → returns updated `sortOrder`; (c) `over` is null → returns `null` (cancel)
- [X] T031 [P] [US4] Create `app/test/integration/WeekGrid.dnd.test.tsx` — render `WeekGrid` with `onReorderSession` mock; (a) simulate pointer-down on a session drag handle, pointer-move to a different day column, pointer-up → assert `onReorderSession` called with `{ sessionId, dayOfWeek: targetDay, sortOrder: any }`; (b) simulate drag within same day to different position → assert `onReorderSession` called with same `dayOfWeek` and updated `sortOrder`; (c) simulate pointer-down then pointer-up outside any droppable → assert `onReorderSession` NOT called and session renders in original position

### Implementation for User Story 4

- [X] T032 [P] [US4] Add `computeDragResult` pure function to `app/lib/utils/week-view.ts` — takes `activeId`, `activeDay`, `overDay`, `sessionsByDay`; returns `ReorderSessionInput` with appended `sortOrder` for cross-day, recomputed `sortOrder` for within-day; returns `null` when `over` is null — makes T030 pass
- [X] T033 [P] [US4] Update `app/components/training/SessionCard.tsx` — add `draggable?: boolean` prop; when `true` use `useSortable({ id: session.id, data: { day } })` from `@dnd-kit/sortable`; apply `transform`/`transition` styles; render `GripVertical` lucide drag handle at card left edge; attach `listeners`+`attributes` to handle only (not whole card, preserving modal-open click)
- [X] T034 [P] [US4] Update `app/components/calendar/DayColumn.tsx` — add `droppable?: boolean` prop; when `true` use `useDroppable({ id: day })` from `@dnd-kit/core`; apply `ring-2 ring-primary/40 bg-primary/5` drop-indicator styles to column container when `isOver` is true
- [X] T035 [US4] Update `app/components/calendar/WeekGrid.tsx` — add `onReorderSession?: (input: ReorderSessionInput) => void`; when provided and `readonly` is false: wrap grid in `<DndContext onDragEnd={handleDragEnd}>`; wrap each day's session list in `<SortableContext items={sessionIds} strategy={verticalListSortingStrategy}>`; pass `draggable={true}` to `SessionCard` + `droppable={true}` to `DayColumn`; `handleDragEnd` calls `computeDragResult` and invokes `onReorderSession` — makes T031 pass
- [X] T036 [US4] Update `app/components/calendar/MultiWeekView.tsx` — instantiate `useUpdateSession`; wire `onReorderSession` handler calling `updateSession({ id, dayOfWeek, sortOrder })` (existing hook's optimistic update handles instant UI feedback); pass to current `WeekGrid` only
- [X] T037 [US4] Update `app/components/training/SessionCard.tsx` — add `onMoveToDay?: (sessionId: string, targetDay: DayOfWeek) => void` prop; add "Move to day" sub-menu item to existing session action menu (visible when `draggable` is true); renders 7 day options using `dnd.moveToDay` i18n key; wire `onMoveToDay` prop through `DayColumn` → `WeekGrid` → `MultiWeekView` → calls `onReorderSession` with session appended at end of target day

**Checkpoint**: DnD live. All four user stories functional. US4 tests green.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T038 [P] Fill all EN translation values in `app/i18n/resources/en/coach.json` — replace scaffolded empty strings from T004 with final English copy for all `history.*`, `copy.*`, `dnd.*` keys
- [X] T039 [P] Fill all PL translation values in `app/i18n/resources/pl/coach.json` — Polish equivalents matching the exact key structure
- [X] T040 Run `pnpm typecheck` — resolve all TypeScript errors introduced by this feature; pay attention to @dnd-kit type imports, new prop additions threading through `MultiWeekView → WeekGrid → DayColumn → SessionCard`
- [X] T041 Smoke-test all items in `specs/012-multi-week-planning/quickstart.md` manual checklist — confirm all pass; note any regressions

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS all user stories
- **Phase 3 (US1)**: Depends on Phase 2
- **Phase 4 (US2)**: Depends on Phase 3 (copy buttons live in `HistoryWeekRow`/`DayColumn` from US1)
- **Phase 5 (US3)**: Depends on Phase 3; independent of Phase 4
- **Phase 6 (US4)**: Depends on Phase 3; independent of Phase 4/5
- **Phase 7 (Polish)**: Depends on all user story phases

### Within Each User Story

1. Write tests → confirm **FAIL** (red)
2. Implement pure functions / helpers → run unit tests
3. Implement query functions + mock variants
4. Implement hooks
5. Implement leaf components (`SessionCard`, `DayColumn`)
6. Implement container components (`HistoryWeekRow`, `WeekGrid`, `MultiWeekView`)
7. Update route — confirm all tests **PASS** (green)

### Parallel Opportunities

| Tasks | Why parallel |
|-------|-------------|
| T003 + T004 | Different files (types vs i18n) |
| T005 + T006 + T007 + T008 | All different test files; none depend on each other |
| T009 + T010 | Different files (date.ts vs useWeekHistory.ts) |
| T014 + T015 + T016 | Different test files (unit vs integration) |
| T021 + T022 | Different component files (HistoryWeekRow vs DayColumn) |
| T030 + T031 | Different test files (unit vs integration) |
| T032 + T033 + T034 | Different files (week-view.ts vs SessionCard vs DayColumn) |
| T038 + T039 | Different files (en vs pl) |

---

## Parallel Example: User Story 1

```
# All four test files are independent — write simultaneously:
T005: app/test/unit/week-history.test.ts
T006: app/test/integration/useWeekHistory.test.ts
T007: app/test/integration/HistoryWeekRow.test.tsx
T008: app/test/integration/MultiWeekView.test.tsx

# Then implementation (T009 + T010 also parallel — different files):
T009: computePreviousWeekIds in date.ts
T010: useWeekHistory.ts
```

## Parallel Example: User Story 4

```
# Tests + helper implementation parallel (all different files):
T030: app/test/unit/drag-end-handler.test.ts
T031: app/test/integration/WeekGrid.dnd.test.tsx
T032: computeDragResult in week-view.ts

# Component work parallel (different files):
T033: SessionCard.tsx (draggable)
T034: DayColumn.tsx (droppable)

# Sequential after T033+T034:
T035: WeekGrid.tsx (DndContext)
T036: MultiWeekView.tsx (wire handler)
T037: SessionCard.tsx ("Move to day" menu)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup (T001)
2. Phase 2: Foundational (T002–T004)
3. Phase 3: US1 tests (T005–T008) → confirm red → implement (T009–T013) → confirm green
4. **STOP and VALIDATE**: 4 history weeks render with expand/collapse
5. Ship — coach can review history

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. US1 → history view (MVP) — `pnpm typecheck` ✅
3. US2 → copy week/day — `pnpm typecheck` ✅
4. US3 → individual copy — `pnpm typecheck` ✅
5. US4 → drag-and-drop — `pnpm typecheck` ✅
6. Polish → translations complete, smoke test passes

---

## Notes

- **41 tasks total** across 7 phases (13 test tasks, 28 implementation tasks)
- Tests in `app/test/unit/` — pure functions, no React, no module mocks
- Tests in `app/test/integration/` — hooks + components with TanStack Query wrapper
- `computePreviousWeekIds` (T009) and `computeDragResult` (T032) are the two new pure functions worth unit testing; both are extracted from hook/component logic
- `@dnd-kit` must be installed (T001) before any DnD test or implementation compiles
- Mock implementations for `copyWeekSessions`/`copyDaySessions` live in `app/lib/queries/sessions.ts` (inline with real implementations, behind `isMockMode` guard) — same pattern as existing query files
- `MultiWeekView` owns all mutations; child components receive only callback props — keeps testing of children simple (no mutation mocking needed in component tests)
