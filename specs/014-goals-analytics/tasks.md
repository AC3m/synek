# Tasks: Goal Management & Analytics Dashboard

**Input**: Design documents from `/specs/014-goals-analytics/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓, quickstart.md ✓

**Organization**: Tasks grouped by user story (US1 → US2 → US3) to enable independent, incremental delivery.

**Tests**: Unit tests for pure functions and row mappers (`app/test/unit/`). Integration tests for the optimistic-update hook cycle and the WeekSummary toggle (`app/test/integration/`). All test tasks are written before their implementations (TDD: confirm fail → implement → confirm pass).

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no shared dependency)
- **[Story]**: Which user story this task belongs to

---

## Phase 1: Setup

**Purpose**: Add the one new dependency and create the database migration.

- [X] T001 Add Recharts dependency via `pnpm add recharts` and verify it appears in `package.json` (~45KB gzip; documented in research.md R-006 per constitution Principle V)
- [X] T002 Create `supabase/migrations/XXX_goals_and_competition.sql`: `goals` table (id, athlete_id, created_by, name, discipline, competition_date, preparation_weeks, goal_distance_km, goal_time_seconds, notes, created_at, updated_at), FK + check constraints, indexes, RLS policies (coach and self-plan athlete access); add `goal_id UUID REFERENCES goals(id) ON DELETE SET NULL`, `result_distance_km`, `result_time_seconds`, `result_pace` columns to `training_sessions`; add `get_analytics_summary` SQL RPC function per `contracts/analytics-api.md` specification

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: TypeScript types, query keys, utility skeletons, and mock data that every user story depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T003 Extend `app/types/training.ts`: add `Goal`, `CreateGoalInput`, `UpdateGoalInput` types per `data-model.md`; add `AnalyticsPeriod`, `AnalyticsParams`, `AnalyticsBucket`, `AnalyticsResponse`, `CompetitionMilestone`, `SportBreakdownEntry`, `CompetitionSummary` types; extend `TrainingSession` with `goalId: string | null`, `resultDistanceKm: number | null`, `resultTimeSeconds: number | null`, `resultPace: string | null`; extend `WeekStats` with `byType: Partial<Record<TrainingType, SportBreakdownEntry>>` and `competitionSessions: CompetitionSummary[]`
- [X] T004 [P] Extend `app/lib/queries/keys.ts`: add `queryKeys.goals` (`all`, `byAthlete(athleteId)`, `byId(goalId)`) and `queryKeys.analytics` (`all`, `byParams(params)`) following the existing factory pattern with `as const`
- [X] T005 [P] Create `app/lib/mock-data/goals.ts`: in-memory `Map<string, Goal>`, `resetMockGoals()` with deep-clone seed, `mockFetchGoals(athleteId)`, `mockCreateGoal(input)`, `mockUpdateGoal(input)`, `mockDeleteGoal(id)` — seed with 2 goals for `athlete-1` (one upcoming run competition 8 weeks out, one past cycling competition with result filled)
- [X] T006 [P] Create `app/lib/mock-data/analytics.ts`: `mockGetAnalytics(params)` returning hardcoded `AnalyticsResponse` with realistic bucket data for each period type and 2 competition milestones matching the mock goals seed
- [X] T007 [P] Write unit tests for `app/lib/utils/goals.ts` in `app/test/unit/utils/goals.test.ts` — confirm they FAIL before T008: `computeGoalAchievement` — (a) `'pending'` when session has no result, (b) `'achieved'` when `resultDistanceKm >= goalDistanceKm`, (c) `'missed'` when `resultDistanceKm < goalDistanceKm`, (d) `'achieved'` when `resultTimeSeconds <= goalTimeSeconds`, (e) `'missed'` when `resultTimeSeconds > goalTimeSeconds`, (f) `'pending'` when goal has no target set; `isWeekInPrepWindow` — (g) `true` for week inside window, (h) `false` for the competition week itself, (i) `false` for week after competition, (j) `false` when `preparationWeeks` is 0; `getPrepWeekRange` — (k) start is Monday of week `N − preparationWeeks`, end is `competitionDate`, (l) equal start/end when prep weeks is 0
- [X] T008 [P] Create `app/lib/utils/goals.ts`: pure functions `computeGoalAchievement(goal: Goal, session: Pick<TrainingSession, 'resultDistanceKm' | 'resultTimeSeconds'>): 'achieved' | 'missed' | 'pending'`, `getPrepWeekRange(goal: Goal): { start: string; end: string }`, `isWeekInPrepWindow(weekStart: string, goal: Goal): boolean` — all T007 tests must pass

**Checkpoint**: Types, query keys, mock stores, and pure utilities ready — user story implementation can begin.

---

## Phase 3: User Story 1 — Set a Competition Goal (Priority: P1) 🎯 MVP

**Goal**: Coach and self-plan athlete can create, edit, and delete goals. Competition sessions appear on the goal date with distinct gold/amber styling. Preparation-week banners appear on all prep weeks.

**Independent Test**: In mock mode, create a goal with 4 prep weeks → confirm a gold-bordered competition card appears on the competition day and "Competition prep" banners appear on 4 preceding weeks; edit prep weeks to 2 → banners update; delete goal → banners and competition card disappear.

- [X] T009 [P] [US1] Write unit tests for `toGoal` mapper in `app/test/unit/queries/goals.test.ts` — confirm they FAIL before T010: (a) all snake_case DB columns map to camelCase `Goal` fields (`athlete_id` → `athleteId`, `created_by` → `createdBy`, `competition_date` → `competitionDate`, `preparation_weeks` → `preparationWeeks`, `goal_distance_km` → `goalDistanceKm`, `goal_time_seconds` → `goalTimeSeconds`, `created_at` → `createdAt`, `updated_at` → `updatedAt`); (b) nullable fields (`goal_distance_km`, `goal_time_seconds`, `notes`) preserved as `null`; (c) required string fields (`id`, `name`, `discipline`) forwarded unchanged
- [X] T010 [P] [US1] Create `app/lib/queries/goals.ts`: `toGoal(row: Record<string, unknown>): Goal` row mapper (all T009 tests must pass); `fetchGoals(athleteId)` — real (explicit column select, ordered by `competition_date`) + mock; `createGoal(input)` — real + mock; `updateGoal(input)` — real (partial update) + mock; `deleteGoal(id)` — real + mock; gate all with `isMockMode`
- [X] T011 [P] [US1] Extend `app/lib/utils/training-types.ts`: add `competitionConfig` export — `{ color: 'text-amber-700', bgColor: 'bg-amber-100', borderColor: 'border-amber-400', icon: 'Trophy' }`
- [X] T012 [P] [US1] Add goal and competition i18n keys to `app/i18n/resources/en/training.json` AND `app/i18n/resources/pl/training.json` simultaneously: `goal.create`, `goal.edit`, `goal.delete`, `goal.name`, `goal.discipline`, `goal.competitionDate`, `goal.preparationWeeks`, `goal.goalDistance`, `goal.goalTime`, `goal.notes`, `goal.deleteConfirm`, `competition.label`, `competition.result`, `competition.achieved`, `competition.missed`, `competition.pending`, `goalPrep.banner`
- [X] T013 [US1] Write integration tests for `useGoals` mutations in `app/test/integration/hooks/useGoals.test.ts` — confirm they FAIL before T014; mock supabase with `vi.mock('~/lib/supabase', () => ({ supabase: { auth: { getSession: vi.fn() } }, isMockMode: true }))` so the mock data store is used; wrap renders in a `QueryClientProvider`; call `resetMockGoals()` in `beforeEach`; test: (a) `useCreateGoal` — after `mutate(input)`, the new goal appears optimistically in the `useGoals` cache before the mutation settles; (b) `useDeleteGoal` — after `mutate(id)`, the goal is removed optimistically; on simulated error (`vi.spyOn(mockDeleteGoal).mockRejectedValueOnce`), the goal is restored in the cache; (c) `useUpdateGoal` — after `mutate(input)`, the updated field is reflected optimistically in cached data (depends on T010 for query functions, T005 for mock store)
- [X] T014 [US1] Create `app/lib/hooks/useGoals.ts`: `useGoals(athleteId: string)` query with `enabled: !!athleteId`, `placeholderData: prev`; `useCreateGoal()`, `useUpdateGoal()`, `useDeleteGoal()` — each with full `onMutate` (cancel queries + snapshot) → `onError` (rollback to snapshot) → `onSettled` (invalidate `queryKeys.goals.byAthlete`) cycle — all T013 tests must pass (depends on T010)
- [X] T015 [P] [US1] Create `app/components/goals/GoalDialog.tsx`: modal form (using existing `Dialog` + shadcn fields pattern) — name (text), discipline (select via `TRAINING_TYPES`), competition date (date input), preparation weeks (number 0–52), goal distance km (optional), goal time as hh:mm:ss inputs (optional), notes (textarea); Zod validation; `onSubmit` calls `onCreate` or `onUpdate` prop; `useTranslation('training')` for all labels
- [X] T016 [P] [US1] Create `app/components/goals/GoalCard.tsx`: shows goal name, discipline badge (`trainingTypeConfig` color), competition date, prep weeks, achievement status badge (amber for achieved, muted for pending/missed); accepts `goal: Goal`, `canEdit: boolean`, `onEdit`, `onDelete` props; two-step delete (show consequence text → require confirm click)
- [X] T017 [P] [US1] Create `app/components/goals/GoalList.tsx`: list of `GoalCard` components; "Add Goal" button when `canEdit: boolean`; opens `GoalDialog`; empty state; accepts `goals: Goal[]`, `canEdit: boolean`, `athleteId: string` props
- [X] T018 [P] [US1] Create `app/components/calendar/GoalPrepBanner.tsx`: slim banner above the week grid for each goal whose prep window covers the current week; shows goal name, discipline icon, days until competition; accepts `goals: Goal[]`, `weekStart: string`; calls `isWeekInPrepWindow` to filter; one banner row per overlapping goal
- [X] T019 [US1] Extend `app/components/calendar/SessionCard.tsx`: when `session.goalId` is set, apply `border-amber-400` border, render Trophy icon from `competitionConfig`, show "Competition" label; display `resultDistanceKm`/`resultTimeSeconds` read-only if filled; no changes to non-competition sessions (depends on T011)
- [X] T020 [US1] Wire goals into `app/routes/coach/week.$weekId.tsx`: call `useGoals(effectiveAthleteId)`, pass goals to `GoalPrepBanner` above the grid and to `GoalList` (`canEdit: true`) alongside the grid; on goal create call `useCreateSession` to create the competition session on `competitionDate` with `goalId` set and `trainingType` matching the goal discipline (depends on T014, T015, T017, T018, T019)
- [X] T021 [US1] Wire goal view into `app/routes/athlete/week.$weekId.tsx`: call `useGoals(user.id)`, pass to `GoalPrepBanner`; pass `canEdit: hasSelfPlan` to `GoalList`; competition session cards use gold styling via extended `SessionCard` (depends on T014, T017, T018, T019)

**Checkpoint**: US1 fully functional in mock mode — goals, prep banners, and competition session cards all work.

---

## Phase 4: User Story 2 — Week Summary Sport Breakdown (Priority: P2)

**Goal**: Week summary gains a "Cumulative / By Sport" toggle. Breakdown mode shows one row per discipline with session count, planned/actual distance, and duration. Competition sessions appear as a distinct row.

**Independent Test**: In mock mode on a week with run + cycling + one competition session, toggle to "By Sport" → three rows appear (run, cycling, competitions); toggle back → cumulative restored; navigate away and back → toggle state persists.

- [X] T022 [P] [US2] Write unit tests for `computeSportBreakdown` in `app/test/unit/utils/analytics.test.ts` — confirm they FAIL before T023: (a) groups training sessions by `trainingType`, summing `plannedDistanceKm`, `actualDistanceKm`, `plannedDurationMinutes`, counting sessions per type; (b) sessions with `goalId` set are excluded from `byType` and collected in `competitionSessions`; (c) `achievementStatus` on each competition summary derived from `computeGoalAchievement` (spy/mock that import); (d) empty array → empty `byType`, empty `competitionSessions`; (e) week with only competition sessions → empty `byType`
- [X] T023 [P] [US2] Create `app/lib/utils/analytics.ts`: `computeSportBreakdown(sessions: TrainingSession[]): { byType: Partial<Record<TrainingType, SportBreakdownEntry>>; competitionSessions: CompetitionSummary[] }` — all T022 tests must pass; pure function, no side effects
- [X] T024 [P] [US2] Add sport breakdown i18n keys to `app/i18n/resources/en/coach.json` AND `app/i18n/resources/pl/coach.json`: `weekSummary.viewCumulative`, `weekSummary.viewBySport`, `weekSummary.competitions`, `weekSummary.noBreakdown`
- [X] T025 [US2] Extend `app/lib/hooks/useWeekView.ts`: after computing existing `WeekStats`, call `computeSportBreakdown(sessions)` and merge `byType` and `competitionSessions` into the returned stats (depends on T023)
- [X] T026 [US2] Create `app/components/calendar/SportBreakdown.tsx`: one row per non-zero entry in `stats.byType` using `trainingTypeConfig` colors/icons; row shows sport icon, name, session count, planned distance, actual distance, duration; "Competitions" row at bottom in amber styling for `stats.competitionSessions`; accepts `stats: WeekStats` prop (depends on T023 types)
- [X] T027 [US2] Write integration tests for the sport breakdown toggle in `app/test/integration/components/WeekSummary.test.ts` — confirm they FAIL before T028; render `<WeekSummary>` with `stats` containing run sessions, cycling sessions, and one competition session (goalId set); mock `useWeekView` to return controlled stats via `vi.mock`; test: (a) cumulative view renders by default (existing stats grid visible, no sport rows); (b) clicking "By Sport" toggle renders `SportBreakdown` with run row, cycling row, and competition row; (c) clicking "Cumulative" restores the original layout; (d) `sessionStorage.getItem('weekSummary.view')` equals `'by-sport'` after toggling (depends on T025, T026)
- [X] T028 [US2] Extend `app/components/calendar/WeekSummary.tsx`: add `'cumulative' | 'by-sport'` local state defaulting to `'cumulative'`, persisted in `sessionStorage` key `'weekSummary.view'`; add toggle button pair in `CardHeader` using existing Button/ghost pattern; when `'by-sport'`, render `<SportBreakdown stats={stats} />` in place of the two-column layout — all T027 tests must pass (depends on T025, T026)

**Checkpoint**: US2 fully functional — toggle works, breakdown shows per-sport stats and competition row.

---

## Phase 5: User Story 3 — Performance Analytics View (Priority: P3)

**Goal**: Coach and athlete can navigate to an analytics page, select a period (year/quarter/month/goal), filter by sport, and see a bar chart of training volume with competition milestones.

**Independent Test**: In mock mode, open `/coach/analytics`, select "Quarter", filter "run" — chart shows weekly bars with only run data; switch to "Goal Period", select mock goal — prep-week data shown and competition milestone appears with achievement status.

- [X] T029 [P] [US3] Write unit tests for `toAnalyticsBucket` mapper in `app/test/unit/queries/analytics.test.ts` — confirm they FAIL before T030: (a) all snake_case RPC fields map to camelCase (`start_date` → `startDate`, `end_date` → `endDate`, `total_sessions` → `totalSessions`, `completed_sessions` → `completedSessions`, `total_distance_km` → `totalDistanceKm`, `total_duration_minutes` → `totalDurationMinutes`, `completion_rate` → `completionRate`); (b) `label` string forwarded unchanged; (c) all numeric fields returned as `number` not `string`
- [X] T030 [P] [US3] Create `app/lib/queries/analytics.ts`: `toAnalyticsBucket(row: Record<string, unknown>): AnalyticsBucket` mapper (all T029 tests must pass); `fetchAnalytics(params: AnalyticsParams): Promise<AnalyticsResponse>` — real calls `supabase.rpc('get_analytics_summary', { p_athlete_id, p_period, p_goal_id: params.goalId ?? null, p_training_type: params.trainingType ?? null, p_reference_date: null })` and maps result; mock calls `mockGetAnalytics(params)`; gate with `isMockMode`
- [X] T031 [P] [US3] Add analytics i18n keys to `app/i18n/resources/en/coach.json`, `pl/coach.json`, `en/athlete.json`, `pl/athlete.json`: `analytics.title`, `analytics.period.year`, `analytics.period.quarter`, `analytics.period.month`, `analytics.period.goal`, `analytics.period.selectGoal`, `analytics.filter.allSports`, `analytics.chart.distance`, `analytics.chart.sessions`, `analytics.empty`, `analytics.milestone.achieved`, `analytics.milestone.missed`, `analytics.milestone.pending`
- [X] T032 [US3] Create `app/lib/hooks/useAnalytics.ts`: `useAnalytics(params: AnalyticsParams | null)` — query with `enabled: !!params && !!params.athleteId`, `queryKey: queryKeys.analytics.byParams(params)`, `queryFn: () => fetchAnalytics(params!)`, `placeholderData: prev` (depends on T030)
- [X] T033 [P] [US3] Create `app/components/analytics/PeriodSelector.tsx`: button group for year / quarter / month / goal; when "Goal Period" selected renders a `Select` dropdown of `goals: Goal[]`; emits `onPeriodChange(period: AnalyticsPeriod, goalId?: string)`; accepts `role: 'coach' | 'athlete'` for i18n namespace
- [X] T034 [P] [US3] Create `app/components/analytics/SportFilter.tsx`: filter buttons (one per `TrainingType` + "All Sports" default) using `trainingTypeConfig` colors; emits `onFilterChange(type: TrainingType | undefined)`; selected sport uses its `bgColor`
- [X] T035 [US3] Create `app/components/analytics/VolumeChart.tsx`: Recharts `ResponsiveContainer` + `BarChart` rendering `AnalyticsBucket[]`; X-axis = `label`; Y-axis = `totalDistanceKm`; tooltip shows all bucket fields; empty array shows a text placeholder; accepts `buckets: AnalyticsBucket[]` (depends on T001 Recharts)
- [X] T036 [US3] Create `app/components/analytics/CompetitionMilestone.tsx`: card showing goal name, discipline badge, competition date, goal target vs actual result, achievement status badge (amber = achieved, muted = missed/pending); accepts `milestone: CompetitionMilestone`
- [X] T037 [US3] Create `app/components/analytics/AnalyticsView.tsx`: composes `PeriodSelector`, `SportFilter`, `VolumeChart`, list of `CompetitionMilestone` cards; manages `period`, `goalId`, `trainingType` state; calls `useAnalytics`; shows skeleton while loading, i18n empty state when `buckets` is empty; accepts `athleteId: string`, `goals: Goal[]`, `role: 'coach' | 'athlete'` (depends on T032, T033, T034, T035, T036)
- [X] T038 [P] [US3] Create `app/routes/coach/analytics.tsx`: reads `effectiveAthleteId` from auth context; calls `useGoals(athleteId)`; renders `<AnalyticsView role="coach" />`; page title from i18n (depends on T037)
- [X] T039 [P] [US3] Create `app/routes/athlete/analytics.tsx`: reads `user.id` from auth context; calls `useGoals(user.id)`; renders `<AnalyticsView role="athlete" />` (depends on T037)
- [X] T040 [US3] Register new routes in `app/routes.ts`: add `route('analytics', 'routes/coach/analytics.tsx')` inside the coach layout prefix; add `route('analytics', 'routes/athlete/analytics.tsx')` inside the athlete layout prefix; run `pnpm typecheck` after to regenerate React Router types (depends on T038, T039)

**Checkpoint**: All 3 user stories independently functional in mock mode.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T041 Run `pnpm typecheck` and fix all TypeScript errors — no `any`, no `@ts-ignore` without documented justification
- [X] T042 [P] Audit i18n completeness: every key in `en/` has a matching key in `pl/` across all modified files — use `/i18n-check` skill or manual diff
- [X] T043 Validate feature end-to-end against `specs/014-goals-analytics/quickstart.md` acceptance scenarios in mock mode: goal creation → competition session → prep banners → sport breakdown toggle → analytics view with period/filter

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — **BLOCKS all user stories**
- **US1 (Phase 3)**: Depends on Phase 2
- **US2 (Phase 4)**: Depends on Phase 2; independently startable alongside US1
- **US3 (Phase 5)**: Depends on Phase 2 + T001 (Recharts); independently startable alongside US1/US2
- **Polish (Phase 6)**: Depends on all desired stories being complete

### User Story Dependencies

- **US1 (P1)**: Fully independent after Phase 2
- **US2 (P2)**: Reads `session.goalId` type from Phase 2; independently testable before US1 is wired
- **US3 (P3)**: Uses `Goal[]` type from Phase 2; independently testable

### Within Each User Story

- Unit tests before implementations: T007→T008, T009→T010, T022→T023, T029→T030
- Integration tests before the component/hook they exercise: T013→T014, T027→T028
- Queries before hooks: T010→T014, T030→T032
- Utilities before components: T023→T026
- Components before route wiring: T015–T019→T020–T021
- Route files before route registration: T038–T039→T040

---

## Parallel Opportunities

### Phase 2 (after T003)
```
T004 (keys.ts) | T005 (mock/goals.ts) | T006 (mock/analytics.ts) | T007 (unit: goals utils)
→ T008 (utils/goals.ts — after T007 confirmed failing)
```

### Phase 3 US1 (first wave, after Phase 2)
```
T009 (unit: toGoal) | T011 (training-types.ts) | T012 (i18n)
→ T010 (queries/goals.ts — after T009 confirmed failing)
T015 (GoalDialog) | T016 (GoalCard) | T017 (GoalList) | T018 (GoalPrepBanner)
```

### Phase 4 US2 (after Phase 2)
```
T022 (unit: computeSportBreakdown) | T024 (i18n)
→ T023 (utils/analytics.ts — after T022 confirmed failing)
```

### Phase 5 US3 (after Phase 2 + T001)
```
T029 (unit: toAnalyticsBucket) | T031 (i18n) | T033 (PeriodSelector) | T034 (SportFilter)
→ T030 (queries/analytics.ts — after T029 confirmed failing)
T038 (coach analytics route) | T039 (athlete analytics route)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational ← **blocks everything**
3. Complete Phase 3: US1 (goals, competition sessions, prep banners)
4. **STOP and VALIDATE**: Create a goal in mock mode, verify competition card and prep banners appear
5. Ship US1 behind feature flag or to staging

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. US1 complete → competition goals visible in week view (**MVP**)
3. US2 complete → sport breakdown toggle in week summary
4. US3 complete → analytics page with charts and milestones
5. Polish → typecheck + i18n audit + quickstart validation

---

## Notes

- **43 tasks total** — 2 setup, 6 foundational, 13 US1, 7 US2, 12 US3, 3 polish
- **Unit test tasks** (4, `app/test/unit/`): T007, T009, T022, T029 — pure functions and row mappers, no React
- **Integration test tasks** (2, `app/test/integration/`): T013 (`useGoals` optimistic mutations), T027 (`WeekSummary` sport breakdown toggle)
- **[P] tasks**: T004–T009, T010–T012, T015–T018, T022–T024, T029–T031, T033–T034, T038–T039, T042
- Competition sessions use `goal_id IS NOT NULL` as discriminator — not a new `training_type` enum value (research.md R-001)
- Run `pnpm typecheck` after T040 (route registration) — React Router regenerates types
- Commit after each checkpoint (end of US1, US2, US3) for clean rollback points
