# Tasks: Test Suite, Codebase Refactor, URL-Based Locale & Versioning

**Branch**: `005-tests-refactor`
**Input**: Design documents from `/specs/005-tests-refactor/`
**Spec**: `spec.md` | **Plan**: `plan.md` | **Research**: `research.md` | **Data model**: `data-model.md`

**Test philosophy**: Only tests that protect valuable journeys are included. Trivial config objects (training-types, query key tuples) are not tested — they add maintenance cost without catching real bugs. Row mappers, date math, data aggregation, and full data-layer flows are tested.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Parallelizable — different file, no in-flight dependency
- **[US#]**: User story this task belongs to
- Stories must execute in order (P1→P2→P3→P4) — each builds on the previous

---

## Phase 1: Setup

**Purpose**: Install test infrastructure, create config files, add npm scripts.

- [x] T001 Install test devDependencies in `package.json`: `vitest @vitest/coverage-v8 @vitejs/plugin-react @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom`
- [x] T002 [P] Install changelog devDependencies in `package.json`: `release-it @release-it/conventional-changelog`
- [x] T003 Create `vitest.config.ts` at repo root — uses `@vitejs/plugin-react` + `tsconfigPaths()`, environment `jsdom`, globals `true`, setupFiles `./app/test/setup.ts`, coverage include `app/lib/**` + `app/components/**` (exclude `app/components/ui/**`), thresholds `lines: 60, functions: 60`
- [x] T004 Create `app/test/setup.ts` — imports `@testing-library/jest-dom`; initialises a minimal i18n instance (`lng: 'en'`, empty resource bundles) so components using `useTranslation` don't throw in tests
- [x] T005 Add scripts to `package.json`: `"test": "vitest"`, `"test:run": "vitest run"`, `"test:coverage": "vitest run --coverage"`, `"release": "release-it"`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Export the private row mappers so unit tests can import them; build the shared test render utilities.

**⚠️ CRITICAL**: Phases 3–7 cannot begin until this phase is complete.

- [x] T006 Export `toSession` row mapper from `app/lib/queries/sessions.ts` — change `function toSession` to `export function toSession`
- [x] T007 [P] Export `toWeekPlan` row mapper from `app/lib/queries/weeks.ts` — change `function toWeekPlan` to `export function toWeekPlan`
- [x] T008 Create `app/test/utils/query-client.ts` — exports `createTestQueryClient()` returning a `QueryClient` with `retry: false`, `staleTime: Infinity`, `gcTime: Infinity` on queries and `retry: false` on mutations
- [x] T009 Create `app/test/utils/render.tsx` — exports `renderWithProviders(ui, options?)` wrapping `ui` in `QueryClientProvider` (fresh `createTestQueryClient()`) + a mock `AuthContext` pre-seeded with optional `mockUser` (id, role, name, email, selectedAthleteId); returns all RTL render result properties plus `queryClient` for cache assertions; accepts optional `initialRoute` and wraps in `createMemoryRouter` when provided

**Checkpoint**: `pnpm test:run` should find 0 test files and exit cleanly (no errors).

---

## Phase 3: User Story 1 — Test Suite (Priority: P1) 🎯 MVP

**Goal**: A developer can run `pnpm test:run` and get a pass/fail signal across all valuable unit and integration tests. No real Supabase credentials required.

**Independent Test**: Run `pnpm test:coverage` in a clean checkout with no `.env` file. All tests pass and coverage on `app/lib/**` reaches ≥ 60%.

### Unit Tests

- [x] T010 [P] [US1] Create `app/test/unit/date.test.ts` — tests for all 6 functions in `app/lib/utils/date.ts`: `getCurrentWeekId` (format `YYYY-WNN`), `weekIdToMonday` (returns correct Monday date string for known week IDs, throws on invalid input), `mondayToWeekId` (round-trip with `weekIdToMonday`), `getNextWeekId` + `getPrevWeekId` (boundary: week 1 / week 52–53), `getWeekDateRange` (correct start/end dates and formatted string)
- [x] T011 [P] [US1] Create `app/test/unit/week-view.test.ts` — tests for both functions in `app/lib/utils/week-view.ts`: `groupSessionsByDay` (sessions grouped into correct day buckets, sorted by `sortOrder`, empty days initialised as `[]`), `computeWeekStats` (completion percentage 0 when no sessions, 100 when all complete, rest_day sessions excluded from totals, `totalActualRunKm` only sums `run` type)
- [x] T012 [P] [US1] Create `app/test/unit/sessions-mapper.test.ts` — tests for the exported `toSession` from `app/lib/queries/sessions.ts`: snake_case fields map to correct camelCase properties (`week_plan_id → weekPlanId`, `day_of_week → dayOfWeek`, `is_completed → isCompleted`, `trainee_notes → athleteNotes`, etc.); null fields stay `null`; `type_specific_data` defaults to `{ type: training_type }` when absent
- [x] T013 [P] [US1] Create `app/test/unit/weeks-mapper.test.ts` — tests for the exported `toWeekPlan` from `app/lib/queries/weeks.ts`: all snake_case fields map correctly (`week_start → weekStart`, `week_number → weekNumber`, `total_planned_km → totalPlannedKm`, `actual_total_km → actualTotalKm`, etc.); nullable fields preserved

### Integration Tests

- [x] T014 [US1] Create `app/test/integration/useSessions.test.tsx` — `vi.mock('~/lib/queries/sessions')` substituting mock functions from `~/lib/mock-data`; test: `useSessions` transitions from loading → data with correct session list for a known `weekPlanId`; `useCreateSession` adds a new session and invalidates the cache; `useUpdateSession` applies optimistic update immediately and rolls back on simulated error; `useDeleteSession` removes the session optimistically
- [x] T015 [US1] Create `app/test/integration/useWeekPlan.test.tsx` — `vi.mock('~/lib/queries/weeks')` substituting mock functions; test: `useWeekPlan` returns `null` for unknown week, returns plan for known week with correct athlete scoping; `useGetOrCreateWeekPlan` seeding the cache on success; `useUpdateWeekPlan` applying optimistic update and rolling back on error
- [x] T016 [US1] Create `app/test/integration/login.test.tsx` — renders the login form via `renderWithProviders` (unauthenticated); submits valid credentials (`coach@synek.app` / `coach123`) and asserts session is established (user in auth context / redirect occurs); submits invalid credentials and asserts error message is shown and no redirect happens
- [x] T017 [US1] Create `app/test/integration/coach-week-view.test.tsx` — `vi.mock` sessions + weeks query modules; renders coach week view with a pre-seeded coach user + `selectedAthleteId: 'athlete-1'`; asserts sessions for Alice's W10 are rendered; triggers a session delete and asserts the session is removed from the rendered list (cache reflects the mutation); switching `selectedAthleteId` to `'athlete-2'` triggers a fresh data load showing Bob's sessions
- [x] T018 [US1] Create `app/test/integration/athlete-week-view.test.tsx` — `vi.mock` sessions + weeks query modules; renders athlete week view with `mockUser: { id: 'athlete-1', role: 'athlete' }`; asserts sessions are displayed in read-only mode (no add/delete controls); toggles a completion checkbox and asserts the session's `isCompleted` state updates in the cache

### Coverage Gate

- [x] T019 [US1] Run `pnpm test:coverage` and verify the threshold check passes (≥ 60% lines and functions on `app/lib/**`); fix any failing test or adjust a single threshold value in `vitest.config.ts` if a specific non-critical file skews the number

**Checkpoint**: `pnpm test:run` is green. All 9 test files pass. Coverage meets threshold.

---

## Phase 4: User Story 2 — Codebase Refactor (Priority: P2)

**Goal**: No non-shadcn source file exceeds 200 lines. Route files contain only orchestration logic. `pnpm typecheck` passes.

**Independent Test**: Run `find app -name "*.ts" -o -name "*.tsx" | grep -v "components/ui" | xargs wc -l | awk '$1 > 200 {print}'` and get zero output. Run `pnpm typecheck` → zero errors. Run `pnpm test:run` → all tests still pass.

- [x] T020 [US2] Create `app/lib/mock-data/` directory and split `app/lib/mock-data.ts` (1012 lines) into four focused modules: `sessions.ts` (session fixtures + mock CRUD functions), `weeks.ts` (week plan fixtures + mock CRUD), `profile.ts` (profile fixtures + mock profile functions), `strava.ts` (Strava fixtures + mock Strava functions); create `app/lib/mock-data/index.ts` as a barrel re-exporting everything from all four modules
- [x] T021 [US2] Delete `app/lib/mock-data.ts` and verify all existing import sites (`~/lib/mock-data`) continue to resolve through the barrel; fix any broken imports
- [x] T022 [US2] Extract `app/components/training/SessionFormFields.tsx` from `app/components/training/SessionForm.tsx` (398 lines) — move all field rendering (sport-specific fields, duration/distance inputs, coach comments textarea, type selector) into `SessionFormFields`; `SessionForm.tsx` keeps only form state management, validation, and submit handling; both files must be under 200 lines
- [x] T023 [US2] Audit `app/lib/context/AuthContext.tsx` (270 lines) — if file exceeds 200 lines after removing blank lines and comments, extract the session-restoration and athlete-loading side-effect logic into `app/lib/hooks/useAuthInit.ts`; `AuthContext.tsx` imports and calls the hook; ensure the public interface of `AuthContext` is unchanged
- [x] T024 [US2] Audit `app/routes/coach/week.$weekId.tsx` (160 lines) and `app/routes/settings.tsx` — extract any inline helper functions or large JSX blocks that push the file toward 200 lines into co-located component files; route files should contain only hook calls, event handler wiring, and top-level layout
- [x] T025 [US2] Run `pnpm typecheck` → fix any TypeScript errors introduced by the refactor (typically import path updates, type narrowing after file splits)
- [x] T026 [US2] Run `pnpm test:run` → confirm all tests from Phase 3 still pass; fix any test import paths broken by the mock-data split

**Checkpoint**: All files under 200 lines. `pnpm typecheck` clean. `pnpm test:run` green.

---

## Phase 5: User Story 3 — URL-Based Locale (Priority: P3)

**Goal**: Every application URL begins with `/pl/` or `/en/`. First-time visitors see Polish. Language toggle updates the URL. Unsupported locale segments redirect to `/pl/`.

**Independent Test**: Open app with no localStorage. URL shows `/pl/`. Toggle to English — URL changes to `/en/...`. Open `/de/coach/week` directly — redirected to `/pl/coach/week`. Copy an `/en/` URL into a fresh private tab — English is active.

- [x] T027 [US3] Update `app/routes.ts` — wrap all authenticated routes (`coach`, `athlete`, `settings`, `home`) under a `route(':locale', 'routes/locale-layout.tsx', [...])` parent; `login` route stays outside the locale wrapper (public, no prefix); run `pnpm typecheck` after this change as React Router will regenerate route types
- [x] T028 [US3] Create `app/routes/locale-layout.tsx` — reads `params.locale`; if not in `['pl', 'en']`, returns `<Navigate>` replacing the locale segment with `pl`; otherwise calls `i18n.changeLanguage(locale)` and `localStorage.setItem('locale', locale)`; renders `<Outlet />`; named export only
- [x] T029 [US3] Update `app/i18n/config.ts` — change default `lng` to `'pl'`; remove the `localStorage.getItem('language')` fallback (locale is now URL-driven, not storage-driven at init time); keep `fallbackLng: 'en'`
- [x] T030 [US3] Update `app/routes/home.tsx` — redirect bare `/` navigations to `/${storedLocale}/` where `storedLocale = localStorage.getItem('locale') ?? 'pl'`; if the user is authenticated, include the role-based sub-path (`/coach` or `/athlete`)
- [x] T031 [US3] Update `app/components/layout/LanguageToggle.tsx` — replace the current localStorage-only toggle with a `useNavigate` + `useParams` approach: read current `locale` from params, construct new path by replacing the locale segment, call `navigate(newPath)` and `localStorage.setItem('locale', newLocale)`
- [x] T032 [US3] Update all `useNavigate` calls and `<Link>` hrefs in coach and athlete route files to prepend the current locale segment (use `useParams().locale` inline or a small `useLocaleNavigate` hook if the pattern appears 3+ times)
- [x] T033 [US3] Add any new i18n keys introduced in this phase to both `app/i18n/resources/en/common.json` and `app/i18n/resources/pl/common.json` simultaneously
- [x] T034 [US3] Run `pnpm typecheck` + `pnpm test:run` — fix any regressions; update integration tests in `app/test/integration/` that use hardcoded paths (`/coach/week/...`) to include the `/pl/` prefix

**Checkpoint**: App loads in Polish by default. Language toggle works. All tests green. Typecheck clean.

---

## Phase 6: User Story 4 — Automated Changelog & Versioning (Priority: P4)

**Goal**: Every merge to `main` automatically updates `CHANGELOG.md` and bumps the version in `package.json`. Zero developer action required.

**Independent Test**: Run `pnpm release-it --dry-run` locally and verify it reports the computed version bump without writing any files. Merge a `feat:` commit to `main` and observe the GitHub Actions workflow produce a new git tag and prepend a changelog entry.

- [x] T035 [US4] Set `version` in `package.json` to `"0.1.0"` (from `"0.0.0"` or whatever placeholder exists)
- [x] T036 [US4] Create `CHANGELOG.md` at repo root with a `## [0.1.0]` entry summarising the five completed feature branches (001-sheets-data-migration, 002, 003, 004-settings-strava, 005-tests-refactor) as a human-readable historical baseline
- [x] T037 [US4] Create `.release-it.json` at repo root — configure: `git.commitMessage: "chore: release v${version}"`, `git.tagName: "v${version}"`, `git.requireBranch: "main"`, `github.release: true`, plugin `@release-it/conventional-changelog` with `preset: "conventionalcommits"` and `infile: "CHANGELOG.md"`; set `npm.publish: false`
- [x] T038 [US4] Create `.github/workflows/release.yml` — trigger on `push: branches: [main]`; jobs: `test` (runs `pnpm typecheck` + `pnpm test:run`) and `release` (needs `test`, runs `pnpm exec release-it --ci` with `GITHUB_TOKEN`, `permissions: contents: write`, `fetch-depth: 0` checkout)
- [x] T039 [US4] Run `pnpm release-it --dry-run` locally to verify the config is valid and the CHANGELOG format is correct; fix any config errors

**Checkpoint**: `.release-it.json` valid. Dry run exits cleanly. CI workflow file lints correctly (`gh workflow list` if GitHub CLI available).

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final quality gates and CI housekeeping.

- [x] T040 [P] Run `pnpm typecheck` one final time across the full branch — resolve any remaining TypeScript strict-mode errors (unused variables, type assertions, etc.)
- [x] T041 [P] Run `pnpm test:coverage` and confirm the coverage report shows ≥ 60% on the defined include paths; if any file dramatically undershoots consider whether a missing test case is genuinely valuable (not just coverage padding)
- [x] T042 Verify no non-shadcn source file exceeds 200 lines: `find app -name "*.ts" -o -name "*.tsx" | grep -v "components/ui" | xargs wc -l | sort -rn | head -20` — inspect top results and split any remaining oversized files
- [x] T043 Update `CLAUDE.md` `## Active Technologies` section with the test stack entry for feature 005: Vitest 3, @testing-library/react 16, release-it

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup)         — no dependencies, start immediately
Phase 2 (Foundational)  — depends on Phase 1; BLOCKS all user stories
Phase 3 (US1 Tests)     — depends on Phase 2; MVP increment
Phase 4 (US2 Refactor)  — depends on Phase 3 (tests are the safety net)
Phase 5 (US3 Locale)    — depends on Phase 4 (refactor restructures routing first)
Phase 6 (US4 Changelog) — depends on Phase 5 (needs clean baseline before first release)
Phase 7 (Polish)        — depends on Phases 3–6
```

### User Story Dependencies

- **US1** (P1 Tests): Can start after Foundational. Delivers standalone value — CI can run after this phase.
- **US2** (P2 Refactor): Requires US1 complete. Tests are the refactor's safety net.
- **US3** (P3 Locale): Requires US2 complete. Touches routing layer restructured in refactor.
- **US4** (P4 Changelog): Requires US3 complete. Cleanest to establish after the branch settles.

### Parallel Opportunities

Within Phase 1:
- T001 (test deps) and T002 (release-it deps) can run in parallel — different concerns

Within Phase 2:
- T006 (export `toSession`) and T007 (export `toWeekPlan`) are in different files — parallel
- T008 (`query-client.ts`) and T009 (`render.tsx`) are in different files — parallel (after T006/T007)

Within Phase 3:
- T010, T011, T012, T013 are independent unit test files — all can run in parallel

---

## Parallel Execution Examples

### Phase 2 — Parallel start:
```
Agent A: T006 — Export toSession from sessions.ts
Agent B: T007 — Export toWeekPlan from weeks.ts
→ Both done → Agent A: T008 (query-client.ts), Agent B: T009 (render.tsx)
```

### Phase 3 — Unit tests (all parallel):
```
Agent A: T010 — date.test.ts
Agent B: T011 — week-view.test.ts
Agent C: T012 — sessions-mapper.test.ts
Agent D: T013 — weeks-mapper.test.ts
→ All done → T014 useSessions.test.tsx → T015 useWeekPlan.test.tsx → ... (sequential, each builds on prior)
```

---

## Implementation Strategy

### MVP (US1 only — after Phases 1–3)

1. Phase 1: Install deps, create vitest.config.ts, setup.ts, scripts
2. Phase 2: Export mappers, create test utilities
3. Phase 3: Write unit + integration tests, verify coverage
4. **STOP**: `pnpm test:run` is green — CI is now possible, refactor can begin safely

### Full Delivery (sequential)

```
Phases 1–2 → Foundation ready
Phase 3    → Tests passing → merge or gate
Phase 4    → Refactor complete, no regressions
Phase 5    → Locale routing working
Phase 6    → Changelog automation live
Phase 7    → Polish + final QA
```

---

## Task Summary

| Phase | Story | Tasks | Parallelizable |
|-------|-------|-------|---------------|
| Phase 1: Setup | — | 5 | T001, T002 |
| Phase 2: Foundational | — | 4 | T006+T007, T008+T009 |
| Phase 3: Tests | US1 | 10 | T010–T013 |
| Phase 4: Refactor | US2 | 7 | — |
| Phase 5: Locale | US3 | 8 | — |
| Phase 6: Changelog | US4 | 5 | — |
| Phase 7: Polish | — | 4 | T040+T041 |
| **Total** | | **43** | |

**MVP scope**: Phases 1–3 (19 tasks) — test suite running in CI.
