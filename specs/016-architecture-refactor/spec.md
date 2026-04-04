# Feature Spec: Architecture Refactor — Module Structure

**Branch**: `refactor/architecture` | **Date**: 2026-04-04

## Problem

The current `app/` structure is layer-first: all hooks in `lib/hooks/`, all queries in `lib/queries/`, all components in `components/<category>/`. This creates:
- No enforced module boundaries — anything can import anything
- Difficulty navigating: understanding "calendar" requires visiting 5+ directories
- Tests divorced from source (`app/test/` is a mirror structure)
- Growing coupling between unrelated features

## Goal

Introduce a `core/` + `modules/` topology: `core/` for shared primitives, `modules/<feature>/` for everything domain-specific. Each module is self-contained and exposes a single public `index.ts` barrel.

---

## User Stories

### US1 (P1) — Core scaffold + factory

**As a developer**, I can find all shared primitives (UI, layout, utils, types, context) in `app/core/` so that the boundary between shared infrastructure and feature code is explicit.

**Acceptance criteria**:
- `app/core/` exists with `components/ui/`, `components/layout/`, `components/ErrorBoundary/`, `context/`, `hooks/`, `utils/`, `types/`, `mock-data/`, `i18n/`, `test/`, `lib/query-keys.ts`
- `createQueryKeys` factory implemented with static and dynamic key support
- `ErrorBoundary` class component with `useErrorBoundary` hook implemented
- All existing imports updated to new `~/core/` paths
- `pnpm typecheck && pnpm test:run` green
- vitest `include` pattern updated to discover co-located tests

### US2 (P1) — Leaf feature modules (landing, auth, goals, stats, strength)

**As a developer**, I can navigate to `app/modules/goals/` to find all goal-related code (components, hooks, queries, tests, i18n) without visiting any other directory.

**Acceptance criteria**:
- Modules `landing`, `auth`, `goals`, `stats`, `strength` created
- Each module has an `index.ts` barrel exporting its public API
- Module query keys use `createQueryKeys` factory
- Tests co-located as `.spec.{ts,tsx}` next to source
- All imports updated
- `pnpm typecheck && pnpm test:run` green after each module

### US3 (P1) — Core feature modules (settings, training, calendar)

**As a developer**, I can navigate to `app/modules/calendar/` to find week/session components, hooks, and queries without visiting `lib/` or `components/`.

**Acceptance criteria**:
- Modules `settings`, `training`, `calendar` created and fully populated
- `calendar` contains: `useWeekPlan`, `useSessions`, `useWeekView`, `useWeekHistory`, all calendar components, weeks and sessions queries with new typed keys
- `training` contains: `SessionForm`, all type-fields, Strava/Garmin UI, `useSessionLaps`, `useFeedback`, `useSessionFormState`, `useGoalDialogState`
- Cross-module imports go only through the consuming module's barrel
- `pnpm typecheck && pnpm test:run` green after each module

### US4 (P1) — Role modules + thin routes

**As a developer**, I can see how athlete and coach views are composed by reading `app/modules/athlete/pages/` and `app/modules/coach/pages/`, and all `app/routes/` files are 1–3 line re-exports.

**Acceptance criteria**:
- `athlete` module contains `AthleteWeekPage`, `AthleteGoalsPage`, `AthleteStatsPage`, `AthleteStrengthPage`
- `coach` module contains the above coach variants + `AthletePicker`
- All routes in `app/routes/` are thin wrappers (`export { X as default } from '~/modules/...'`)
- Smoke render tests added for all page components
- `pnpm typecheck && pnpm test:run` green

### US5 (P2) — Docs + rules update

**As a developer**, I can read `CLAUDE.md`, `docs/reference/conventions.md`, and `docs/reference/anti-patterns.md` to find the definitive rules for the new module structure, import conventions, query key factory usage, and co-located test naming.

**Acceptance criteria**:
- `CLAUDE.md` Critical Rules section updated with module boundary and barrel rules
- `conventions.md` updated with module structure, query key factory pattern, test co-location
- `anti-patterns.md` updated with cross-module internal imports, raw `as const` query keys, tests outside source directory
- Old `app/components/`, `app/lib/`, `app/test/` directories removed (no orphaned files)
- Final `pnpm typecheck && pnpm test:run` green on clean run
