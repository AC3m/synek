# Quickstart: Goal Management & Analytics Dashboard

**Feature**: 014-goals-analytics
**Branch**: `014-goals-analytics`

## Prerequisites

- Node.js 18+, pnpm installed
- Supabase CLI installed (for migrations)
- `.env.local` with valid Supabase credentials (or omit for mock mode)

## Setup

```bash
git checkout 014-goals-analytics
pnpm install
```

## Development Flow

### 1. Run the migration (if using real Supabase)

```bash
supabase db push
```

Or apply manually via Supabase dashboard SQL editor.

### 2. Start dev server

```bash
pnpm dev
```

Mock mode activates automatically when Supabase credentials are absent.

### 3. Verify new features

**Goals (P1)**:
- Navigate to `/coach/week/:weekId` (or athlete equivalent)
- Look for the "Add Goal" button (near week navigation or in a goals panel)
- Create a goal: name, discipline, date, distance, prep weeks
- Verify: competition session appears on the target day with gold/amber styling
- Verify: prep-week banners appear on weeks within the preparation window

**Sport Breakdown (P2)**:
- On any week view, look for the "By Sport" toggle in the WeekSummary card header
- Toggle to see per-sport rows with session count, distance, duration
- Verify: competition sessions show in a distinct row

**Analytics (P3)**:
- Navigate to `/coach/analytics` or `/athlete/analytics`
- Select a period (year/quarter/month/goal)
- Apply a sport filter
- Verify: chart shows volume data, competitions appear as milestones

### 4. Run checks

```bash
pnpm typecheck   # Must pass
pnpm test         # Run all tests
```

## Key Files to Review

| Area | Files |
|------|-------|
| Types | `app/types/training.ts` — Goal, CompetitionSession extensions |
| Queries | `app/lib/queries/goals.ts`, `app/lib/queries/analytics.ts` |
| Hooks | `app/lib/hooks/useGoals.ts`, `app/lib/hooks/useAnalytics.ts` |
| Utils | `app/lib/utils/goals.ts`, `app/lib/utils/analytics.ts` |
| Components | `app/components/goals/`, `app/components/analytics/` |
| Week ext. | `app/components/calendar/WeekSummary.tsx`, `SportBreakdown.tsx`, `GoalPrepBanner.tsx` |
| Routes | `app/routes/coach/analytics.tsx`, `app/routes/athlete/analytics.tsx` |
| Config | `app/lib/utils/training-types.ts` — competition color config |
| i18n | `app/i18n/resources/en/training.json`, `pl/training.json` |
| Migration | `supabase/migrations/XXX_create_goals.sql` |
| Mock data | `app/lib/mock-data/goals.ts`, `app/lib/mock-data/analytics.ts` |

## Architecture Notes

- **Goal ↔ Session link**: `training_sessions.goal_id` FK. A session with `goal_id IS NOT NULL` is a competition session.
- **No new training type enum**: Competitions use the existing discipline type (e.g. `run`) + `goal_id` as the discriminator.
- **Prep-week indicators**: Computed at query time from `goal.competition_date` and `goal.preparation_weeks`. Not materialized.
- **Analytics aggregation**: Server-side via `get_analytics_summary` RPC for period views. Client-side computation for single-week sport breakdown.
- **Achievement status**: Computed (not stored) by comparing result vs goal target.
