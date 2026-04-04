# Tasks: Architecture Refactor — Module Structure

**Input**: Design documents from `specs/016-architecture-refactor/`
**Branch**: `refactor/architecture`
**Gate**: `pnpm typecheck && pnpm test:run` must be green before advancing each phase

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: User story from spec.md (US1–US5)
- Every task includes an exact file path

---

## Phase 1: Setup

**Purpose**: Update tooling config before any files move. Must complete before Phase 2.

- [ ] T001 Update `vitest.config.ts`: change `include` from `['app/test/**/*.test.{ts,tsx}']` to `['app/**/*.{test,spec}.{ts,tsx}']` and update `coverage.include` from `['app/lib/**']` to `['app/core/**', 'app/modules/**']`
- [ ] T002 Create directory scaffold: `app/core/components/ui/`, `app/core/components/layout/`, `app/core/components/ErrorBoundary/`, `app/core/context/`, `app/core/hooks/`, `app/core/utils/`, `app/core/types/`, `app/core/mock-data/`, `app/core/i18n/`, `app/core/test/utils/`, `app/core/lib/`

**Checkpoint**: `pnpm test:run` still passes (same tests, new discovery pattern)

---

## Phase 2: Foundational — Core Scaffold (US1)

**Purpose**: Populate `app/core/` with all shared primitives. All module migrations (US2–US4) depend on this phase.

**⚠️ CRITICAL**: No module work can begin until this phase is complete and gates pass.

**Goal**: Developer can find all shared primitives in `app/core/` and all `~/core/...` imports resolve.

**Independent Test**: `pnpm typecheck && pnpm test:run` green; `~/core/components/ui/button` resolves; `createQueryKeys` and `useErrorBoundary` are exported from their respective paths.

### Implementation

- [ ] T003 [US1] Implement `app/core/lib/query-keys.ts`: `createQueryKeys<TScope, TSchema>` factory — static keys return `{ _root, queryKey }`, dynamic keys are callable functions with `_root` property (see research.md Decision 2 for full API spec)
- [ ] T004 [P] [US1] Write `app/core/lib/query-keys.spec.ts`: tests for static key shape, dynamic key shape, `_root` invalidation key, TypeScript inference on args
- [ ] T005 [US1] Implement `app/core/components/ErrorBoundary/ErrorBoundary.tsx`: class component with `ErrorBoundaryContext`, `useErrorBoundary` hook, `onError` callback, `onReset` lifecycle; export `ErrorBoundary` and `useErrorBoundary` from `app/core/components/ErrorBoundary/index.ts`
- [ ] T006 [P] [US1] Write `app/core/components/ErrorBoundary/ErrorBoundary.spec.tsx`: test renders children, catches errors and shows fallback, resets via `useErrorBoundary().resetError()`
- [ ] T006b [US1] Mount `ErrorBoundary` in `app/routes/locale-layout.tsx`: wrap the route's JSX root with `<ErrorBoundary>` imported from `~/core/components/ErrorBoundary`; this is the single app-wide error boundary — must complete before T018 gate
- [ ] T007 [P] [US1] Move `app/components/ui/` → `app/core/components/ui/` (all 22 shadcn files); update all imports from `~/components/ui/` to `~/core/components/ui/`
- [ ] T008 [P] [US1] Move `app/components/layout/` → `app/core/components/layout/` (Header, BottomNav, Logo, LanguageToggle, ThemeToggle, UserMenu, RoleSwitcher); update all imports from `~/components/layout/` to `~/core/components/layout/`
- [ ] T009 [P] [US1] Move `app/lib/context/AuthContext.tsx`, `ThemeContext.tsx`, `SessionActionsContext.tsx` → `app/core/context/`; update all imports from `~/lib/context/` to `~/core/context/`
- [ ] T010 [P] [US1] Move `app/lib/hooks/useLocalePath.ts`, `useIsMobile.ts`, `useAsyncAction.ts`, `useNumericDraft.ts` → `app/core/hooks/`; update all imports
- [ ] T011 [P] [US1] Move all files from `app/lib/utils/` → `app/core/utils/` (date.ts, training-types.ts, format.ts, utils.ts, week-view.ts, session-copy.ts, lap-classification.ts, analytics.ts, goals.ts, strength.ts); update all imports from `~/lib/utils/` to `~/core/utils/`
- [ ] T012 [P] [US1] Move `app/types/` → `app/core/types/` (training.ts, strava.ts, feedback.ts, invites.ts, junction-poc.ts); update all imports from `~/types/` to `~/core/types/`
- [ ] T013 [P] [US1] Move `app/lib/mock-data/` → `app/core/mock-data/` (index.ts + all domain files); update all imports from `~/lib/mock-data` to `~/core/mock-data`
- [ ] T014 [P] [US1] Move `app/i18n/` → `app/core/i18n/` (config.ts, i18next.d.ts, resources/); update the i18n `config.ts` resource path; update all imports from `~/i18n/` to `~/core/i18n/`
- [ ] T015 [P] [US1] Move `app/test/setup.ts` → `app/core/test/setup.ts`; move `app/test/utils/render.tsx` and `app/test/utils/query-client.ts` → `app/core/test/utils/`; update `vitest.config.ts` `setupFiles` to `'./app/core/test/setup.ts'`; update imports in all test files from `~/test/utils/` to `~/core/test/utils/`
- [ ] T016 [P] [US1] Move `app/lib/supabase.ts` → `app/core/supabase.ts`; move `app/lib/auth.ts` → `app/core/auth.ts`; move `app/lib/config.ts` → `app/core/config.ts`; update all imports — including `app/routes/root-redirect.tsx` which imports from `~/lib/` and is easily missed
- [ ] T017 [US1] Move co-located unit tests that test core utilities: `app/test/unit/date.test.ts` → `app/core/utils/date.spec.ts`; `app/test/unit/analytics.test.ts` → `app/core/utils/analytics.spec.ts`; `app/test/unit/copy-sessions.test.ts` → `app/core/utils/session-copy.spec.ts`; `app/test/unit/week-view.test.ts` → `app/core/utils/week-view.spec.ts`; `app/test/unit/drag-end-handler.test.ts` → `app/core/utils/drag-end-handler.spec.ts`; `app/test/unit/useAsyncAction.test.ts` → `app/core/hooks/useAsyncAction.spec.ts`; update imports inside each test file
- [ ] T018 [US1] **Gate**: `pnpm typecheck && pnpm test:run` — must exit 0 before proceeding to US2

**Checkpoint**: Phase 2 complete — all `~/core/...` imports resolve; factory and ErrorBoundary exist; all tests pass

---

## Phase 3: User Story 2 — Leaf Feature Modules (US2)

**Goal**: `landing`, `auth`, `goals`, `stats`, `strength` modules created; each self-contained with components, hooks, queries, co-located tests, and typed query keys.

**Independent Test**: `pnpm typecheck && pnpm test:run` green; `import { GoalListView } from '~/modules/goals'` resolves; `import { StatsView } from '~/modules/stats'` resolves.

- [ ] T019 [P] [US2] Create `app/modules/landing/`: move `app/components/landing/` → `app/modules/landing/components/`; extract `LandingPage` component + `meta` function from `app/routes/landing.tsx` into `app/modules/landing/pages/LandingPage.tsx`; create `app/modules/landing/index.ts` exporting `LandingPage`, `meta`, `LandingNav` and all landing components per `contracts/modules.md`
- [ ] T020 [P] [US2] Create `app/modules/auth/`: extract `LoginPage` component + `meta` from `app/routes/login.tsx` into `app/modules/auth/pages/LoginPage.tsx`; extract `RegisterPage` + `meta` from `app/routes/register.tsx` into `app/modules/auth/pages/RegisterPage.tsx`; extract `InvitePage` + `meta` from `app/routes/invite.$token.tsx` into `app/modules/auth/pages/InvitePage.tsx`; move `app/test/integration/login.test.tsx` → `app/modules/auth/pages/LoginPage.spec.tsx` (update imports); move `app/test/integration/invite-page.test.tsx` → `app/modules/auth/pages/InvitePage.spec.tsx` (update imports); create `app/modules/auth/index.ts`
- [ ] T021 [P] [US2] Create `app/modules/goals/`: move `app/components/goals/` → `app/modules/goals/components/`; move `app/lib/hooks/useGoals.ts` → `app/modules/goals/hooks/useGoals.ts`; move `app/lib/queries/goals.ts` → `app/modules/goals/queries/goals.ts`; create `app/modules/goals/queries/keys.ts` using `createQueryKeys('goals', { ... })` replacing `queryKeys.goals.*`; move `app/test/unit/goals-mapper.test.ts` → `app/modules/goals/queries/goals.spec.ts` (update imports); move `app/test/unit/goals.test.ts` → `app/modules/goals/hooks/useGoals.spec.ts` (update imports); move `app/test/integration/useGoals.test.tsx` → `app/modules/goals/hooks/useGoals.integration.spec.tsx` (update imports); create `app/modules/goals/index.ts`
- [ ] T022 [P] [US2] Create `app/modules/stats/`: move `app/components/analytics/` → `app/modules/stats/components/` and rename `AnalyticsView.tsx` → `StatsView.tsx` (update internal component name); move `app/lib/hooks/useAnalytics.ts` → `app/modules/stats/hooks/useStats.ts` (rename hook export `useAnalytics` → `useStats`); move `app/lib/queries/analytics.ts` → `app/modules/stats/queries/stats.ts`; create `app/modules/stats/queries/keys.ts` using `createQueryKeys('stats', { ... })` replacing `queryKeys.analytics.*`; move `app/test/unit/analytics-mapper.test.ts` → `app/modules/stats/queries/stats.spec.ts` (update imports); move `app/test/unit/analytics.test.ts` → `app/modules/stats/hooks/useStats.spec.ts` (update imports); create `app/modules/stats/index.ts`; update `app/routes/athlete/analytics.tsx` and `app/routes/coach/analytics.tsx` to import from `~/modules/stats` (filenames stay `analytics.tsx` for URL compatibility)
- [ ] T023 [P] [US2] Create `app/modules/strength/`: move `app/components/strength/` → `app/modules/strength/components/`; move `app/lib/hooks/useStrengthVariants.ts` → `app/modules/strength/hooks/useStrengthVariants.ts`; move `app/lib/queries/strength-variants.ts` → `app/modules/strength/queries/strength-variants.ts`; create `app/modules/strength/queries/keys.ts` using `createQueryKeys('strength', { ... })` replacing `queryKeys.strengthVariants.*`; move `app/test/unit/computePrefillSets.test.ts` → `app/modules/strength/components/PrefillBadge.spec.ts`; move `app/test/unit/per-set-reps.test.ts` → `app/modules/strength/queries/strength-variants.spec.ts`; move `app/test/integration/VariantCard.test.tsx` → `app/modules/strength/components/VariantCard.spec.tsx` (update imports); move `app/test/integration/IncrementField.test.tsx` → `app/modules/strength/components/IncrementField.spec.tsx`; move `app/test/integration/SessionExerciseLogger.test.tsx` → `app/modules/strength/components/SessionExerciseLogger.spec.tsx`; create `app/modules/strength/index.ts`
- [ ] T024 [US2] **Gate**: `pnpm typecheck && pnpm test:run` — must exit 0 before proceeding to US3

**Checkpoint**: 5 leaf modules self-contained; all imports updated; tests co-located and passing

---

## Phase 4: User Story 3 — Core Feature Modules (US3)

**Goal**: `settings`, `training`, `calendar` modules created; calendar owns all week/session hooks and query keys; no remaining imports from `~/lib/hooks/` or `~/lib/queries/` for these domains.

**Independent Test**: `pnpm typecheck && pnpm test:run` green; `import { useSessions } from '~/modules/calendar'` and `import { SessionForm } from '~/modules/training'` resolve.

> **Note on inline gates in T025 and T026**: Each task ends with `run pnpm typecheck && pnpm test:run`. This is intentional — settings, training, and calendar are complex enough that catching breakage immediately within the task is safer than batching to T029. These are intermediate checkpoints, not duplicates of T029.

- [ ] T025 [US3] Create `app/modules/settings/`: move `app/components/settings/` → `app/modules/settings/components/`; move `app/lib/hooks/useProfile.ts`, `useStravaConnection.ts`, `useJunctionConnection.ts`, `useInvites.ts` → `app/modules/settings/hooks/`; move `app/lib/queries/profile.ts`, `strava-connection.ts`, `junction-poc.ts`, `invites.ts` → `app/modules/settings/queries/`; create `app/modules/settings/queries/keys.ts` using `createQueryKeys` replacing `queryKeys.profile.*`, `queryKeys.stravaConnection.*`, `queryKeys.invites.*`, `queryKeys.selfPlan.*`, `queryKeys.junctionPoc.*`; move `app/test/unit/invites-mapper.test.ts` → `app/modules/settings/queries/invites.spec.ts`; move `app/test/unit/profiles.test.ts` → `app/modules/settings/queries/profile.spec.ts`; move `app/test/integration/useInvites.test.tsx` → `app/modules/settings/hooks/useInvites.spec.tsx` (update imports); move `app/test/integration/useSelfPlanPermission.test.tsx` → `app/modules/settings/hooks/useSelfPlanPermission.spec.tsx`; move `app/test/integration/delete-account-dialog.test.tsx` → `app/modules/settings/components/DeleteAccountDialog.spec.tsx`; move `app/test/integration/AthletePicker.test.tsx` → temporarily stay (AthletePicker moves to coach module in US4); create `app/modules/settings/index.ts`; run `pnpm typecheck && pnpm test:run`
- [ ] T026 [US3] Create `app/modules/training/`: move `app/components/training/` (excluding type-fields subdirectory first) → `app/modules/training/components/`; move `app/components/training/type-fields/` → `app/modules/training/components/type-fields/`; move `app/lib/hooks/useSessionLaps.ts`, `useFeedback.ts`, `useSessionFormState.ts`, `useGoalDialogState.ts` → `app/modules/training/hooks/`; move `app/lib/queries/strava-laps.ts`, `feedback.ts` → `app/modules/training/queries/`; create `app/modules/training/queries/keys.ts` using `createQueryKeys` replacing `queryKeys.sessionLaps.*`, `queryKeys.feedback.*`; move `app/test/unit/useSessionFormState.test.ts` → `app/modules/training/hooks/useSessionFormState.spec.ts` (update imports); move `app/test/integration/StravaSyncButton.test.tsx` → `app/modules/training/components/StravaSyncButton.spec.tsx`; move `app/test/integration/StravaConfirmButton.test.tsx` → `app/modules/training/components/StravaConfirmButton.spec.tsx`; move remaining training integration tests (before executing, run `grep -rl 'training\|SessionForm\|type-fields\|Garmin\|Strava' app/test/integration/` to identify all; known candidates: `app/test/integration/SessionForm.test.tsx` → `app/modules/training/components/SessionForm.spec.tsx`; `app/test/integration/CompletionToggle.test.tsx` → `app/modules/training/components/CompletionToggle.spec.tsx`; `app/test/integration/AthleteFeedback.test.tsx` → `app/modules/training/components/AthleteFeedback.spec.tsx`; move all remaining matches); create `app/modules/training/index.ts`; run `pnpm typecheck && pnpm test:run`
- [ ] T027 [US3] Create `app/modules/calendar/`: move `app/components/calendar/` → `app/modules/calendar/components/`; move `app/lib/hooks/useWeekPlan.ts`, `useSessions.ts`, `useWeekView.ts`, `useWeekHistory.ts` → `app/modules/calendar/hooks/`; move `app/lib/queries/weeks.ts`, `sessions.ts` → `app/modules/calendar/queries/`; create `app/modules/calendar/queries/keys.ts` using `createQueryKeys` replacing ALL remaining `queryKeys.weeks.*` and `queryKeys.sessions.*` references across the entire codebase; move `app/test/unit/weeks-mapper.test.ts` → `app/modules/calendar/queries/weeks.spec.ts`; move `app/test/unit/sessions-mapper.test.ts` → `app/modules/calendar/queries/sessions.spec.ts`; move `app/test/integration/useWeekPlan.test.tsx` → `app/modules/calendar/hooks/useWeekPlan.spec.tsx`; move `app/test/integration/useSessions.test.tsx` → `app/modules/calendar/hooks/useSessions.spec.tsx`; move `app/test/integration/athlete-week-view.test.tsx` → `app/modules/calendar/hooks/athlete-week-view.spec.tsx`; move `app/test/integration/coach-week-view.test.tsx` → `app/modules/calendar/hooks/coach-week-view.spec.tsx`; move `app/test/integration/useWeekView.test.ts` → `app/modules/calendar/hooks/useWeekView.spec.ts`; move `app/test/integration/useWeekHistory.test.tsx` → `app/modules/calendar/hooks/useWeekHistory.spec.tsx`; move `app/test/integration/MultiWeekView.test.tsx` → `app/modules/calendar/components/MultiWeekView.spec.tsx`; move `app/test/integration/HistoryWeekRow.test.tsx` → `app/modules/calendar/components/HistoryWeekRow.spec.tsx`; move `app/test/integration/SessionCard.intervals.test.tsx` → `app/modules/calendar/components/SessionCard.intervals.spec.tsx`; move `app/test/integration/WeekGrid.dnd.test.tsx` → `app/modules/calendar/components/WeekGrid.dnd.spec.tsx`; move `app/test/integration/WeekSummary.test.tsx` → `app/modules/calendar/components/WeekSummary.spec.tsx`; move `app/test/integration/strava-sync-cta.test.tsx` → `app/modules/calendar/components/strava-sync-cta.spec.tsx` (grep the file first to confirm it tests calendar-level strava sync CTA, not the training-level `StravaSyncButton`); create `app/modules/calendar/index.ts`; update all `vi.mock('~/lib/queries/weeks'...)` and `vi.mock('~/lib/queries/sessions'...)` patterns in moved test files to new paths; update all imports in all test files
- [ ] T028 [US3] Delete the now-empty `app/lib/queries/keys.ts` (global `queryKeys` object); verify no remaining imports of `queryKeys` from `~/lib/queries/keys` anywhere in the codebase (grep check)
- [ ] T029 [US3] **Gate**: `pnpm typecheck && pnpm test:run` — must exit 0 before proceeding to US4

**Checkpoint**: All 8 feature modules complete; no remaining imports from `~/lib/hooks/` or `~/lib/queries/`

---

## Phase 5: User Story 4 — Role Modules + Thin Routes (US4)

**Goal**: `athlete` and `coach` role modules created as page-composition layers; all 20 route files reduced to thin re-exports; smoke render tests added for all page components.

**Independent Test**: `pnpm typecheck && pnpm test:run` green; all route files contain ≤3 lines; smoke render tests pass; browser smoke in mock mode shows no blank screen.

- [ ] T030 [P] [US4] Create `app/modules/athlete/`: extract page component logic from `app/routes/athlete/week.$weekId.tsx` → `app/modules/athlete/pages/AthleteWeekPage.tsx`; extract from `app/routes/athlete/goals.tsx` → `app/modules/athlete/pages/AthleteGoalsPage.tsx`; extract from `app/routes/athlete/analytics.tsx` → `app/modules/athlete/pages/AthleteStatsPage.tsx`; extract from `app/routes/athlete/strength.tsx` → `app/modules/athlete/pages/AthleteStrengthPage.tsx`; extract from `app/routes/athlete/strength.$variantId.tsx` → `app/modules/athlete/pages/AthleteStrengthVariantPage.tsx`; create athlete layout component from `app/routes/athlete/layout.tsx` → `app/modules/athlete/pages/AthleteLayout.tsx`; create `app/modules/athlete/index.ts`; reduce each corresponding route file to `export { X as default } from '~/modules/athlete'`; `app/routes/athlete/week.tsx` (redirect stub, if present) — keep as-is with import path updates only, do not extract
- [ ] T031 [P] [US4] Create `app/modules/coach/`: move `app/components/coach/AthletePicker.tsx` → `app/modules/coach/components/AthletePicker.tsx`; move `app/test/integration/AthletePicker.test.tsx` → `app/modules/coach/components/AthletePicker.spec.tsx` (update imports); extract page logic from `app/routes/coach/week.$weekId.tsx` → `app/modules/coach/pages/CoachWeekPage.tsx`; extract from `app/routes/coach/goals.tsx` → `app/modules/coach/pages/CoachGoalsPage.tsx`; extract from `app/routes/coach/analytics.tsx` → `app/modules/coach/pages/CoachStatsPage.tsx`; extract from `app/routes/coach/strength.tsx` → `app/modules/coach/pages/CoachStrengthPage.tsx`; extract from `app/routes/coach/strength.$variantId.tsx` → `app/modules/coach/pages/CoachStrengthVariantPage.tsx`; create coach layout from `app/routes/coach/layout.tsx` → `app/modules/coach/pages/CoachLayout.tsx`; create `app/modules/coach/index.ts`; reduce each corresponding route file to `export { X as default } from '~/modules/coach'`; `app/routes/coach/week.tsx` (redirect stub, if present) — keep as-is with import path updates only, do not extract
- [ ] T032 [US4] Reduce remaining route files to thin wrappers: `app/routes/settings.tsx` → `export { SettingsPage as default } from '~/modules/settings'`; `app/routes/landing.tsx` → `export { LandingPage as default, meta } from '~/modules/landing'`; `app/routes/login.tsx` → `export { LoginPage as default, meta } from '~/modules/auth'`; `app/routes/register.tsx` → `export { RegisterPage as default, meta } from '~/modules/auth'`; `app/routes/invite.$token.tsx` → `export { InvitePage as default, meta } from '~/modules/auth'`; `app/routes/home.tsx` → keep as-is (contains only redirect logic and meta export; no page component to extract; update `~/core/` import paths only if present); `app/routes/locale-layout.tsx` and `app/routes/locale-bare-layout.tsx` → keep as-is (layout files are structural, not page logic)
- [ ] T033 [P] [US4] Write smoke render tests for role module pages: `app/modules/athlete/pages/AthleteWeekPage.spec.tsx` — renders without crashing with mock providers; `app/modules/athlete/pages/AthleteGoalsPage.spec.tsx`; `app/modules/coach/pages/CoachWeekPage.spec.tsx`; `app/modules/coach/pages/CoachGoalsPage.spec.tsx`; use `renderWithProviders` from `~/core/test/utils/render`; assert a meaningful element renders — prefer `screen.getByRole('main')` or a labelled landmark; avoid bare "container not empty" assertions as they pass on empty renders
- [ ] T034 [US4] Move remaining unmoved integration tests: `app/test/integration/AthleteWeekView.selfplan.test.tsx` → `app/modules/athlete/pages/AthleteWeekPage.selfplan.spec.tsx`; `app/test/integration/athlete-week-loading.test.tsx` → `app/modules/athlete/pages/AthleteWeekPage.loading.spec.tsx`; `app/test/integration/coach-week-loading.test.tsx` → `app/modules/coach/pages/CoachWeekPage.loading.spec.tsx`; `app/test/integration/SessionActionsContext.test.tsx` → `app/core/context/SessionActionsContext.spec.tsx`; `app/test/integration/ConfirmDialog.test.tsx` → `app/core/components/ui/ConfirmDialog.spec.tsx`; `app/test/integration/DeleteConfirmationDialog.test.tsx` → `app/modules/training/components/DeleteConfirmationDialog.spec.tsx`; `app/test/integration/useFeedback.ts` (if exists) → `app/modules/training/hooks/useFeedback.spec.tsx`; `app/test/integration/PerformanceChipGroup.test.tsx` → `app/modules/training/components/PerformanceChipGroup.spec.tsx`; `app/test/integration/LandingNav.test.tsx` → `app/modules/landing/components/LandingNav.spec.tsx`; update all imports inside moved test files
- [ ] T035 [US4] **Gate**: `pnpm typecheck && pnpm test:run` — must exit 0; verify all route files are ≤3 lines (grep for `useState\|useEffect\|useMemo` in `app/routes/` — must return 0 matches)

**Checkpoint**: Role modules complete; all routes are thin wrappers; smoke tests added; browser smoke passes

---

## Phase 6: Polish — Docs + Cleanup (US5)

**Purpose**: Codify the new architecture rules, remove old directories, verify final state.

- [ ] T036 [P] Update `CLAUDE.md` (repo root, not inside `app/`): replace "Architecture" and "Key directories" sections with new module layout; replace Critical Rules with updated rules including: module boundary rule (`import from ~/modules/<feature> barrel only`), route thin-wrapper rule, `createQueryKeys` rule (no raw `as const` query key arrays), co-located test rule (`.spec.ts` naming)
- [ ] T037 [P] Update `docs/reference/conventions.md`: add "Module Structure" section documenting the `core/` + `modules/` topology, module directory layout template, `createQueryKeys` usage pattern with example, `.spec.{ts,tsx}` test naming and co-location rule; update "File Naming" table to add module and page conventions; note the analytics/stats naming convention: route files may keep legacy filenames (e.g. `analytics.tsx`) for URL backward compatibility while exporting from the canonical module (`~/modules/stats`)
- [ ] T038 [P] Update `docs/reference/anti-patterns.md`: add rows: (1) importing from `~/modules/<feature>/components/X` directly — use barrel; (2) `import { queryKeys } from '~/lib/queries/keys'` — use module-scoped `createQueryKeys` keys; (3) test files in `app/test/` — co-locate as `.spec.{ts,tsx}` next to source; (4) logic in route files — move to `modules/<feature>/pages/`
- [ ] T038b [P] Write ADR `docs/architecture/decisions/016-module-structure.md`: document the decision to adopt `core/` + `modules/` topology, the `createQueryKeys` factory choice (custom, zero deps), co-located test strategy, and thin route wrapper pattern — one paragraph per decision with rationale and rejected alternatives
- [ ] T039 Delete empty directories: `app/components/` (must be empty), `app/lib/` (must be empty), `app/test/` (must be empty), `app/types/` (must be empty); if any directory is not empty, the corresponding move task was incomplete — do not force-delete
- [ ] T040 Final verification: run `grep -r "from '~/components/" app/ --include="*.ts" --include="*.tsx"` — must return 0 results; run `grep -r "from '~/lib/" app/ --include="*.ts" --include="*.tsx"` — must return 0 results; run `grep -r "from '~/types/" app/ --include="*.ts" --include="*.tsx"` — must return 0 results
- [ ] T041 **Completion gate**: `pnpm typecheck && pnpm test:run && pnpm build` — all three must exit 0; record final test count and confirm it matches or exceeds pre-refactor count

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (US1 — Core)**: Depends on Phase 1 — BLOCKS all module phases
- **Phase 3 (US2 — Leaf modules)**: Depends on Phase 2 completion — can proceed in parallel per module
- **Phase 4 (US3 — Core features)**: Depends on Phase 2; `settings` and `training` can start after Phase 2; `calendar` should come last (most deps)
- **Phase 5 (US4 — Role modules)**: Depends on Phase 3 AND Phase 4 completion — athlete/coach need all feature modules
- **Phase 6 (Polish)**: Depends on Phase 5 completion

### User Story Dependencies

- **US1**: Unblocked — start after Phase 1
- **US2**: Depends on US1 (needs `~/core/` imports)
- **US3**: Depends on US1; `settings` independent of US2; `training` independent of US2; `calendar` independent of US2 but should come after training
- **US4**: Depends on US2 + US3 (role pages compose feature modules)
- **US5**: Depends on US4

### Within Each Phase

- All [P]-marked tasks within a phase can execute simultaneously (different files)
- Gate tasks (T018, T024, T029, T035, T041) are always sequential — never parallelize

---

## Parallel Opportunities

### Phase 2 (Core scaffold) — run together after T003/T004/T005:

```
T007 Move ui/          T008 Move layout/      T009 Move context/
T010 Move hooks/       T011 Move utils/        T012 Move types/
T013 Move mock-data/   T014 Move i18n/         T015 Move test/
T016 Move supabase/auth/config
```

### Phase 3 (Leaf modules) — all parallel:

```
T019 landing    T020 auth    T021 goals    T022 stats    T023 strength
```

### Phase 4 (Core features) — sequential by dependency:

```
T025 settings   →   T026 training   →   T027 calendar   →   T028/T029 gate
```

### Phase 5 (Role modules) — parallel extraction:

```
T030 athlete   T031 coach   →   T032 thin routes   →   T033/T034 tests
```

---

## Implementation Strategy

### MVP (Phase 1 + 2 only)

1. Phase 1: Setup vitest config
2. Phase 2: Core scaffold — `createQueryKeys`, `ErrorBoundary`, all shared primitives in `~/core/`
3. **Validate**: `pnpm typecheck && pnpm test:run` green
4. The codebase now has `core/` populated; modules can be migrated incrementally

### Incremental Delivery (recommended)

1. Phase 1 + 2 → Core ready
2. Phase 3 (leaf modules) → 5 simpler modules migrated
3. Phase 4 (core features) → settings → training → calendar
4. Phase 5 (role modules) → athlete + coach + thin routes
5. Phase 6 (docs) → rules codified, old dirs deleted

Each phase leaves the codebase in a runnable, type-checked state.

---

## Notes

- **Pure structural refactor**: no logic changes. If a task requires changing component behaviour to make it work, stop and flag it.
- **Test file renaming**: `.test.tsx` → `.spec.tsx` is intentional. The vitest `include` pattern (updated in T001) covers both suffixes during transition.
- **`analytics.tsx` route filenames**: kept as-is for URL backward compatibility. The route exports from `~/modules/stats`.
- **`app/routes/locale-layout.tsx` and `locale-bare-layout.tsx`**: these are React Router layout files, not page components — they stay as-is with only import path updates.
- **`app/routes/home.tsx`**: if it only contains a redirect and `meta`, it stays as a route file with updated imports rather than being extracted to a module.
- Commit after each phase (or after each module within a phase) to enable clean rollback.
