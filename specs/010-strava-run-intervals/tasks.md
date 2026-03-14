# Tasks: Strava Run Interval Data

**Input**: Design documents from `/specs/010-strava-run-intervals/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/strava-fetch-laps.md ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1…US5)
- Exact file paths included in all task descriptions

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: DB schema, backend edge functions, TypeScript types, query layer, and hook — everything that must exist before any UI can be built.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T001 Write migration `supabase/migrations/018_strava_laps.sql`: add `workout_type INTEGER` to `strava_activities` with backfill from `raw_data`, create `strava_laps` table with all typed columns and UNIQUE constraint on `(strava_activity_id, lap_index)`, create indexes, enable RLS with owner + coach-confirmed policies, update `secure_training_sessions` view to expose `sa.workout_type AS strava_workout_type`
- [X] T002 Apply migration to local Supabase and verify schema via `pnpm typecheck` (no TS errors on new view column)
- [X] T003 Update `supabase/functions/strava-sync/index.ts`: add `workout_type: activity.workout_type ?? null` to the `strava_activities` upsert payload
- [X] T004 Create `supabase/functions/strava-fetch-laps/index.ts`: implement CORS headers, JWT verification via `anonClient.auth.getUser`, session ownership check, `strava_laps` cache check (return early if rows exist), Strava token retrieval + refresh, `GET /activities/{id}` fetch, segment classification (`classifyLaps` — name-first then position-heuristic), upsert via service-role client, return classified laps; follow `strava-auth/index.ts` pattern exactly
- [X] T005 [P] Add `StravaLapSegmentType` union type and `StravaLap` interface to `app/types/strava.ts` (fields: id, stravaActivityId, lapIndex, name, intensity, segmentType, distanceMeters, elapsedTimeSeconds, movingTimeSeconds, averageSpeed, averageHeartrate, maxHeartrate, averageCadence, paceZone)
- [X] T006 [P] Add `stravaWorkoutType: number | null` field to `TrainingSession` in `app/types/training.ts`
- [X] T007 Add `stravaWorkoutType: row.strava_workout_type as number | null` to the `toSession()` mapper in `app/lib/queries/sessions.ts` (depends on T006)
- [X] T008 [P] Add `sessionLaps` key factory to `app/lib/queries/keys.ts`: `all: ['sessionLaps'] as const` and `bySession: (sessionId: string) => ['sessionLaps', sessionId] as const`
- [X] T009 Create `app/lib/mock-data/strava-laps.ts`: seed data for three scenarios — (a) structured session with WU + 3 active intervals + 2 recoveries + CD, (b) session with no laps (regular run), (c) session with auto-laps only (all `intensity: 'active'`); export `MOCK_LAPS` seed and `resetMockLaps()` using deep clone (`.map(i => ({ ...i }))`)
- [X] T010 Create `app/lib/queries/strava-laps.ts`: implement `toLap()` row mapper (snake_case → camelCase), `fetchSessionLaps(sessionId)` calling the edge function and parsing response with Zod, `mockFetchSessionLaps(sessionId)` returning seeded data with 300 ms simulated delay
- [X] T011 Create `app/lib/hooks/useSessionLaps.ts`: export `useSessionLaps(sessionId: string, enabled: boolean)` — `useQuery` with `queryKey: sessionLapsKeys.bySession(sessionId)`, `queryFn: () => fetchSessionLaps(sessionId)`, `enabled: !!sessionId && enabled`, `staleTime: Infinity` (cached permanently after first fetch); expose `data`, `isLoading`, `isError`, `refetch`

**Checkpoint**: Foundation ready — all types compile, mock data available, hook queryable. No UI yet.

---

## Phase 2: User Story 1 — Athlete Opens Interval Details from Session Card (Priority: P1) 🎯 MVP

**Goal**: A confirmed workout-type session card shows an "Intervals" button; tapping it opens a modal with a CSS bar chart and a lap-by-lap table (WU / Interval N / Recovery N / CD) with duration, distance, pace, and HR/zone.

**Independent Test**: Sync a workout-type Strava run with structured laps. Confirm the session card shows an "Intervals" button with no change to the rest of the card layout. Tap the button — confirm the modal opens with chart and lap table. Close — confirm card unchanged.

- [X] T012 [P] [US1] Add EN interval translation keys to `app/i18n/resources/en/training.json`: `intervals.viewButton`, `intervals.modalTitle`, `intervals.loadError`, `intervals.retry`, `intervals.columns.{segment,duration,distance,pace,heartRate}`, `intervals.segments.{warmup,interval,recovery,cooldown}`
- [X] T013 [P] [US1] Add PL interval translation keys to `app/i18n/resources/pl/training.json` (same key structure as T012, Polish values)
- [X] T014 [P] [US1] Create `app/components/training/IntervalChart.tsx`: accepts `laps: StravaLap[]`; renders a flex-row of bars, width proportional to `elapsedTimeSeconds` relative to total duration (minimum bar width 4px for rest laps); colours by `segmentType` — interval → `bg-blue-500`, recovery → `bg-muted-foreground/30`, warmup/cooldown → `bg-teal-500`; shows segment type badge above each bar and formatted pace (`mm:ss /km` from `averageSpeed`) below
- [X] T015 [P] [US1] Create `app/components/training/LapTable.tsx`: accepts `laps: StravaLap[]`; renders table with columns `#`, Segment (label from i18n), Duration (`elapsedTimeSeconds` → `mm:ss`), Distance (`distanceMeters / 1000` → `X.XX km`), Pace (`1000 / averageSpeed / 60` → `mm:ss /km`), HR-or-Zone (`averageHeartrate` bpm when present, else `Z{paceZone}`, column hidden if no lap has either); scrollable when >10 laps; all strings via `useTranslation('training')`
- [X] T016 [US1] Create `app/components/training/IntervalDetailsModal.tsx`: shadcn `Dialog` accepting `open: boolean`, `onOpenChange`, `laps: StravaLap[]`, `sessionName: string`; renders modal title from i18n, `IntervalChart` above `LapTable`; all strings via `useTranslation('training')` (depends on T014, T015)
- [X] T017 [US1] Update `app/components/calendar/SessionCard.tsx`: import `useSessionLaps`; derive `isWorkoutRun = trainingType === 'run' && stravaWorkoutType === 3`; when `isWorkoutRun && isStravaConfirmed`: on `isSuccess` with at least one rest lap, render "Intervals" button (no skeleton yet — that is US2); button opens `IntervalDetailsModal` with session laps; on `isSuccess` with no rest laps, render nothing extra; add `IntervalDetailsModal` with local `open` state (depends on T012, T013, T016)

**Checkpoint**: Intervals button visible on confirmed workout-type runs; modal opens with chart and table; non-workout cards unchanged.

---

## Phase 3: User Story 2 — Loading State During First Interval Data Fetch (Priority: P2)

**Goal**: A skeleton placeholder occupies the interval button area while lap data loads for the first time; it transitions to the button without a layout shift. Subsequent views show the button immediately.

**Independent Test**: Open a workout-type session card with no cached lap data — confirm a skeleton appears in the interval button area. Confirm it transitions to the "Intervals" button without reflow. Reload — button appears instantly with no skeleton.

- [X] T018 [US2] Update `app/components/calendar/SessionCard.tsx`: in the `isWorkoutRun && isStravaConfirmed` branch, add `isLoading` case — render `<Skeleton className="h-6 w-20 rounded-full" />` in the same DOM slot where the button appears, so card height is reserved and does not shift when data loads (depends on T017)

**Checkpoint**: Workout-type cards show skeleton on first load and transition cleanly to "Intervals" button; non-workout cards unchanged.

---

## Phase 4: User Story 3 — Retry When Interval Data Fetch Fails (Priority: P3)

**Goal**: When the lap fetch fails, the skeleton is replaced by a retry prompt ("Could not load intervals — Retry") in the same area; tapping it re-triggers the fetch.

**Independent Test**: Simulate a network failure during lazy lap fetch. Confirm skeleton is replaced by retry prompt. Tap retry — skeleton reappears. On success — "Intervals" button appears.

- [X] T019 [US3] Update `app/components/calendar/SessionCard.tsx`: in the `isWorkoutRun && isStravaConfirmed` branch, add `isError` case — render inline retry prompt using `t('intervals.loadError')` text + "Retry" button that calls `refetch()`; prompt occupies same space as skeleton/button (depends on T018)

**Checkpoint**: All three states (loading / error+retry / success) work correctly; card layout stable across all transitions.

---

## Phase 5: User Story 4 — Coach Views Athlete Interval Breakdown (Priority: P4)

**Goal**: A coach sees the "Intervals" button and full modal for confirmed athlete interval sessions. Before confirmation, no interval affordance appears.

**Independent Test**: Coach account — view unconfirmed workout run, confirm no "Intervals" button. Confirm the session; view card again — "Intervals" button and modal work identically to athlete view.

- [X] T020 [US4] Update `app/components/calendar/SessionCard.tsx`: verify the `isWorkoutRun && isStravaConfirmed` guard already handles the coach confirmation gate (coaches see the view only after `isStravaConfirmed = true`); ensure `useSessionLaps` is only `enabled` when the session is confirmed for coach-viewed sessions — `enabled: isWorkoutRun && (isOwner || isConfirmed)` (depends on T019)

**Checkpoint**: Coach sees interval affordance on confirmed runs only; unconfirmed runs show existing masked state with no interval elements.

---

## Phase 6: User Story 5 — Workout-Type Run Without Structured Lap Data (Priority: P5)

**Goal**: When `workout_type = 3` but all laps are `intensity: 'active'` (auto-laps, no rest laps), no "Intervals" button or skeleton appears — the card looks like a standard run.

**Independent Test**: Sync an activity with `workout_type = 3` but only auto-laps. Confirm no skeleton, no retry, no "Intervals" button on the card.

- [X] T021 [US5] Verify `app/components/calendar/SessionCard.tsx` correctly handles the no-rest-laps case (success with laps where none have `intensity: 'rest'` → render nothing); verify `app/lib/mock-data/strava-laps.ts` seed scenario (c) covers this case; manually test with auto-laps mock session (depends on T020)

**Checkpoint**: Auto-laps runs are indistinguishable from regular runs — no interval affordance at any point.

---

## Phase 7: Tests

**Purpose**: Unit tests for the data layer classifiers and mappers; integration test for SessionCard across all states.

- [X] T022 [P] Write unit tests in `app/test/unit/strava-laps.test.ts`: test `toLap()` mapper with a raw DB row (all fields present, nullable fields absent); test `classifyLaps()` with (a) name-based WU/CD labels, (b) position-heuristic path (no names), (c) all-active laps (no rest), (d) empty laps array
- [X] T023 Write integration tests in `app/test/integration/SessionCard.intervals.test.tsx`: render `SessionCard` with TanStack Query wrapper and mocked `useSessionLaps`; assert (a) skeleton appears while loading, (b) "Intervals" button appears on success with rest laps, (c) no button when no rest laps, (d) retry prompt appears on error and calls `refetch` when tapped, (e) no interval affordance on non-workout session, (f) no interval affordance for coach on unconfirmed session

**Checkpoint**: `pnpm test` passes on all new tests; `pnpm typecheck` passes.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T024 Run `pnpm typecheck` and fix any remaining TypeScript errors introduced by this feature
- [X] T025 Update or create Strava integration documentation: if existing Strava docs cover sync, extend them with interval data fetching behaviour (`workout_type` detection, lazy `strava-fetch-laps` call, `strava_laps` table); if no existing docs cover the interval modal pattern or lap data model, create `docs/strava-intervals.md` per spec.md post-implementation requirement

**Checkpoint**: All checks pass, documentation updated.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies — start immediately. **BLOCKS all subsequent phases.**
- **US1 (Phase 2)**: Depends on Phase 1 completion.
- **US2 (Phase 3)**: Depends on US1 (T017) — adds loading state to existing SessionCard branch.
- **US3 (Phase 4)**: Depends on US2 (T018) — adds error state to same branch.
- **US4 (Phase 5)**: Depends on US3 (T019) — adds confirmation gate guard.
- **US5 (Phase 6)**: Depends on US4 (T020) — verifies no-rest-laps guard.
- **Tests (Phase 7)**: Can begin after US1 is complete; T022 can run in parallel with US2–US5.
- **Polish (Phase 8)**: Depends on all phases complete.

### User Story Dependencies

- **US1** → **US2** → **US3** → **US4** → **US5**: All modify `SessionCard.tsx` in the same branch; must be sequential.
- **US1 components** (T014, T015, T016): all parallelizable — different files.
- **US1 translations** (T012, T013): parallelizable with components.

### Parallel Opportunities

Within Phase 1:
- T005, T006 (type additions) can run in parallel — different files.
- T008 (key factory) is independent of T005/T006.
- T001–T004 (DB + edge functions) can start in parallel with T005–T008 (types) if two developers are available.
- T010 depends on T005 (types must exist); T011 depends on T008 and T010.

Within Phase 2 (US1):
- T012, T013 (translations), T014 (IntervalChart), T015 (LapTable) — all parallelizable.
- T016 (IntervalDetailsModal) depends on T014 + T015.
- T017 (SessionCard update) depends on T016 + T012 + T013.

---

## Parallel Example: Phase 2 (US1)

```bash
# These four tasks can run simultaneously:
Task T012: Add EN translations → app/i18n/resources/en/training.json
Task T013: Add PL translations → app/i18n/resources/pl/training.json
Task T014: Create IntervalChart → app/components/training/IntervalChart.tsx
Task T015: Create LapTable     → app/components/training/LapTable.tsx

# Then T016 (depends on T014 + T015):
Task T016: Create IntervalDetailsModal → app/components/training/IntervalDetailsModal.tsx

# Then T017 (depends on T016 + T012 + T013):
Task T017: Update SessionCard → app/components/calendar/SessionCard.tsx
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Foundational (T001–T011)
2. Complete Phase 2: US1 (T012–T017)
3. **STOP and VALIDATE**: Confirm "Intervals" button + modal work end-to-end on a confirmed workout-type session.
4. Demo/deploy if ready.

### Incremental Delivery

1. Foundation → US1 → **MVP** (intervals button + modal fully functional)
2. Add US2 → smooth loading state, no layout shift
3. Add US3 → retry on failure
4. Add US4 → coach confirmation gate verified
5. Add US5 → auto-laps guard verified
6. Tests + Polish → production ready

---

## Summary

| Phase | Tasks | Parallelizable | User Story |
|-------|-------|---------------|------------|
| Foundational | T001–T011 (11) | T005, T006, T008, T009 | — |
| US1 | T012–T017 (6) | T012, T013, T014, T015 | US1 |
| US2 | T018 (1) | — | US2 |
| US3 | T019 (1) | — | US3 |
| US4 | T020 (1) | — | US4 |
| US5 | T021 (1) | — | US5 |
| Tests | T022–T023 (2) | T022 | — |
| Polish | T024–T025 (2) | — | — |
| **Total** | **25** | **8** | — |

**Suggested MVP scope**: Phases 1 + 2 (T001–T017) — delivers the full P1 user story end-to-end.
