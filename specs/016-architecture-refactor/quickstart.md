# Quickstart: Per-Phase Verification

Run these checks after each phase to confirm no regression before advancing.

## After every module migration

```bash
pnpm typecheck      # must exit 0
pnpm test:run       # must exit 0, no skipped tests
```

If either fails — stop, fix, re-run before proceeding.

---

## Phase 1 — Core scaffold

After moving `components/ui/`, `components/layout/`, `lib/utils/`, `lib/types/`, `lib/context/`, `lib/hooks/` (shared), `lib/mock-data/`, `lib/supabase.ts`, `lib/auth.ts`, `lib/config.ts`, `i18n/`:

```bash
pnpm typecheck && pnpm test:run
```

Additional checks:
- [ ] `app/core/lib/query-keys.ts` exists and exports `createQueryKeys`
- [ ] `app/core/components/ErrorBoundary/` exports `ErrorBoundary` and `useErrorBoundary`
- [ ] vitest `include` updated — run `pnpm test:run` and confirm all existing tests still run (count should match pre-refactor)
- [ ] `~/core/...` imports resolve in at least one manually-edited file

---

## Phase 2 — Leaf feature modules (landing, auth, goals, stats, strength)

After each module:
```bash
pnpm typecheck && pnpm test:run
```

Per-module checks:
- [ ] Module directory exists with `components/`, `hooks/`, `queries/` (where applicable), `index.ts`
- [ ] `index.ts` exports match the contract in `contracts/modules.md`
- [ ] Query keys in `queries/keys.ts` use `createQueryKeys` factory
- [ ] Tests co-located as `.spec.{ts,tsx}` — no orphaned files in `app/test/`
- [ ] No imports from `~/lib/hooks/`, `~/lib/queries/`, `~/components/<category>/` remaining in this module

**Stats-specific**:
- [ ] `AnalyticsView` renamed to `StatsView` — old name must not exist in codebase
- [ ] `useAnalytics` renamed to `useStats` — old name must not exist
- [ ] `analyticsKeys` renamed to `statsKeys` — old name must not exist
- [ ] Route file `analytics.tsx` still in `routes/` (filename stays for URL compatibility) but exports from `~/modules/stats`

---

## Phase 3 — Core feature modules (settings, training, calendar)

After each module:
```bash
pnpm typecheck && pnpm test:run
```

Calendar-specific:
- [ ] `useSessions` full set (create/update/delete/copy/strava) exported from `~/modules/calendar`
- [ ] `useWeekView` exported from `~/modules/calendar`
- [ ] `calendarKeys` replaces all `queryKeys.weeks` and `queryKeys.sessions` references
- [ ] No remaining `import { queryKeys } from '~/lib/queries/keys'` for week/session keys

Training-specific:
- [ ] All type-fields components accessible via `~/modules/training`
- [ ] `useSessionFormState` and `useGoalDialogState` exported from `~/modules/training`

---

## Phase 4 — Role modules + thin routes

After athlete and coach modules:
```bash
pnpm typecheck && pnpm test:run
```

- [ ] `app/routes/athlete/week.$weekId.tsx` is ≤3 lines
- [ ] `app/routes/coach/week.$weekId.tsx` is ≤3 lines
- [ ] All 12 route files are thin wrappers (grep check: no `useState`, `useEffect`, `useMemo` in any route file)
- [ ] Smoke render tests exist for: `AthleteWeekPage`, `AthleteGoalsPage`, `AthleteStatsPage`, `AthleteStrengthPage`, `CoachWeekPage`, `CoachGoalsPage`
- [ ] Browser smoke: `pnpm dev` → navigate to `/en/athlete/week` and `/en/coach/week` in mock mode — no blank screen, no console errors

---

## Phase 5 — Docs update

Final checks:
```bash
pnpm typecheck && pnpm test:run
```

- [ ] `CLAUDE.md` contains module boundary rules and barrel import rule
- [ ] `docs/reference/conventions.md` has module structure, `createQueryKeys` pattern, `.spec.tsx` naming
- [ ] `docs/reference/anti-patterns.md` has: cross-module internal imports, raw `as const` query keys, tests outside source directory
- [ ] `app/components/` directory deleted (no orphans)
- [ ] `app/lib/` directory deleted (no orphans)
- [ ] `app/test/` directory deleted (no orphans)
- [ ] No `import ... from '~/components/'` anywhere (grep check)
- [ ] No `import ... from '~/lib/'` anywhere (grep check)
- [ ] Global `queryKeys` object from old `lib/queries/keys.ts` fully replaced by module-scoped keys

---

## Completion Checklist

```bash
# Final full check
pnpm typecheck
pnpm test:run
pnpm build   # production build must succeed
```

All three must exit 0 before the PR is opened.
