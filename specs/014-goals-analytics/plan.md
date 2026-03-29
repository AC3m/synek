# Implementation Plan: Goal Management & Analytics Dashboard

**Branch**: `014-goals-analytics` | **Date**: 2026-03-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/014-goals-analytics/spec.md`

## Summary

Add competition goals with automatic preparation-window tracking, extend the week summary with a per-sport breakdown toggle, and provide a longitudinal analytics view for coaches and athletes. The implementation adds a `goals` table, a `competition` session variant, a sport-breakdown computation utility, and a new analytics route — all following existing query/hook/component patterns.

## Technical Context

**Language/Version**: TypeScript 5 (strict)
**Primary Dependencies**: React 19, React Router 7 (SPA), TanStack Query 5, shadcn/ui (New York), i18next, date-fns 4, Zod 4
**Storage**: Supabase (PostgreSQL) with RLS; existing `week_plans` + `training_sessions` tables
**Testing**: Vitest (unit in `app/test/unit/`, integration in `app/test/integration/`)
**Target Platform**: Web (SPA), desktop + mobile responsive
**Project Type**: Web application (SPA, no SSR)
**Performance Goals**: Optimistic updates within one render frame (~16ms); analytics view loads within 2s for one year of data
**Constraints**: No new major dependencies; all new code must pass `pnpm typecheck`; both `en/` and `pl/` i18n files updated simultaneously
**Scale/Scope**: Single-athlete view (coach views one athlete at a time); tens of goals per athlete, hundreds of sessions per year

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Lean & Purposeful | PASS | Every addition maps to a spec requirement (FR-001–FR-021). No speculative abstractions. |
| II. Configuration Over Hardcoding | PASS | Competition colors go in `training-types.ts` config. Sport breakdown reads from existing config. No inline color literals. i18n added to both `en/` and `pl/`. |
| III. Type Safety & Boundary Validation | PASS | New `Goal` type, `CompetitionData` variant in discriminated union, Zod validation at DB boundary, row mappers for new tables. |
| IV. Modularity & Testability | PASS | Goals go through `queries/goals.ts` → `hooks/useGoals.ts`. Mock implementation first. Full optimistic-update cycle on all mutations. |
| V. Performance & Operational Discipline | PASS | No new heavy dependencies. Analytics queries select specific columns. Optimistic updates for goal CRUD. `pnpm typecheck` gate. |
| Security | PASS | RLS on `goals` table scoped to athlete. Self-plan flag checked at query level. No new public forms (no honeypot needed). |
| Merge Gates | PASS | Type check, mock parity, i18n, optimistic updates, no hardcoded colors, no direct DB in components, constitution check — all covered in design. |

## Project Structure

### Documentation (this feature)

```text
specs/014-goals-analytics/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── analytics-api.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
app/
├── types/
│   └── training.ts                    # Extended: Goal type, competition result fields on TrainingSession
├── lib/
│   ├── queries/
│   │   ├── keys.ts                    # Extended: goalKeys, analyticsKeys
│   │   ├── goals.ts                   # NEW: goal CRUD (real + mock)
│   │   └── analytics.ts              # NEW: analytics aggregation queries (real + mock)
│   ├── hooks/
│   │   ├── useGoals.ts               # NEW: useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal
│   │   ├── useAnalytics.ts           # NEW: useAnalytics query hook
│   │   └── useWeekView.ts            # Extended: sport breakdown stats computation
│   ├── utils/
│   │   ├── training-types.ts         # Extended: competition config (gold/amber)
│   │   ├── analytics.ts              # NEW: pure aggregation helpers
│   │   └── goals.ts                  # NEW: goal achievement logic, prep-window computation
│   └── mock-data/
│       ├── goals.ts                  # NEW: mock goals store + seed data
│       └── analytics.ts             # NEW: mock analytics responses
├── components/
│   ├── calendar/
│   │   ├── WeekSummary.tsx           # Extended: sport breakdown toggle
│   │   ├── SportBreakdown.tsx        # NEW: per-sport stats rows
│   │   ├── SessionCard.tsx           # Extended: competition visual treatment
│   │   └── GoalPrepBanner.tsx        # NEW: preparation-week indicator banner
│   ├── goals/
│   │   ├── GoalDialog.tsx            # NEW: create/edit goal form modal
│   │   ├── GoalCard.tsx              # NEW: goal summary card
│   │   └── GoalList.tsx              # NEW: list of goals for an athlete
│   └── analytics/
│       ├── AnalyticsView.tsx         # NEW: main analytics layout
│       ├── PeriodSelector.tsx        # NEW: year/quarter/month/goal-period picker
│       ├── SportFilter.tsx           # NEW: sport discipline filter
│       ├── VolumeChart.tsx           # NEW: training volume over time
│       └── CompetitionMilestone.tsx  # NEW: competition marker on timeline
├── routes/
│   ├── coach/
│   │   └── analytics.tsx             # NEW: coach analytics route
│   └── athlete/
│       └── analytics.tsx             # NEW: athlete analytics route
└── i18n/resources/
    ├── en/
    │   ├── coach.json                # Extended: analytics, breakdown keys
    │   ├── athlete.json              # Extended: analytics keys
    │   └── training.json             # Extended: competition, goal keys
    └── pl/
        ├── coach.json                # Extended: analytics, breakdown keys
        ├── athlete.json              # Extended: analytics keys
        └── training.json             # Extended: competition, goal keys

supabase/
└── migrations/
    └── XXX_create_goals.sql          # NEW: goals table + RLS policies
```

**Structure Decision**: Follows existing SPA architecture. Goals get their own query/hook/mock/component files. Analytics components are isolated in `components/analytics/`. No new directories outside the established pattern. The only new route is `analytics.tsx` under both coach and athlete namespaces.
