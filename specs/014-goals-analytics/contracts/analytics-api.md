# Contract: Analytics API (Supabase RPC)

**Feature**: 014-goals-analytics
**Date**: 2026-03-28

## RPC: `get_analytics_summary`

Server-side aggregation function for the analytics view. Called from `app/lib/queries/analytics.ts`.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| p_athlete_id | UUID | yes | Target athlete |
| p_period | text | yes | One of: `'year'`, `'quarter'`, `'month'`, `'goal'` |
| p_goal_id | UUID | no | Required when `p_period = 'goal'` |
| p_training_type | text | no | Sport filter (omit for all sports) |
| p_reference_date | date | no | Anchor date for period calculation (defaults to CURRENT_DATE) |

### Return Shape

```json
{
  "buckets": [
    {
      "label": "Jan",
      "start_date": "2026-01-01",
      "end_date": "2026-01-31",
      "total_sessions": 12,
      "completed_sessions": 10,
      "total_distance_km": 85.5,
      "total_duration_minutes": 420,
      "completion_rate": 83.3
    }
  ],
  "competitions": [
    {
      "goal_id": "uuid",
      "goal_name": "Spring 10K",
      "discipline": "run",
      "competition_date": "2026-04-15",
      "goal_distance_km": 10.0,
      "goal_time_seconds": 3000,
      "result_distance_km": 10.0,
      "result_time_seconds": 2880,
      "achievement_status": "achieved"
    }
  ],
  "totals": {
    "total_sessions": 48,
    "completed_sessions": 40,
    "total_distance_km": 350.2,
    "total_duration_minutes": 1680,
    "overall_completion_rate": 83.3
  }
}
```

### Period Bucketing Logic

| Period | Buckets | Granularity |
|--------|---------|-------------|
| year | 12 | Monthly (Jan–Dec of reference year) |
| quarter | ~13 | Weekly (13 weeks of reference quarter) |
| month | ~30 | Daily (days of reference month) |
| goal | N | Weekly (each prep week + competition week) |

### Filtering Rules

- When `p_training_type` is set, only sessions matching that type are counted in buckets and totals
- Competition sessions (`goal_id IS NOT NULL`) are **always excluded** from bucket aggregations — they appear only in the `competitions` array
- When `p_period = 'goal'`, the date range is derived from `goal.competition_date - (goal.preparation_weeks * 7 days)` through `goal.competition_date`

### Auth

- Caller must be authenticated (JWT via `auth.uid()`)
- Function enforces: caller is the athlete OR caller is a coach of the athlete
- Returns empty result (not error) if athlete has no data for the period

## Goal CRUD Queries

Standard Supabase client queries (not RPC). Documented for contract clarity.

### Fetch Goals

```
SELECT id, athlete_id, created_by, name, discipline, competition_date,
       preparation_weeks, goal_distance_km, goal_time_seconds, notes,
       created_at, updated_at
FROM goals
WHERE athlete_id = :athleteId
ORDER BY competition_date ASC
```

### Create Goal

```
INSERT INTO goals (athlete_id, created_by, name, discipline, competition_date,
                   preparation_weeks, goal_distance_km, goal_time_seconds, notes)
VALUES (:athleteId, :createdBy, :name, :discipline, :competitionDate,
        :preparationWeeks, :goalDistanceKm, :goalTimeSeconds, :notes)
RETURNING *
```

Side effect: After goal creation, a competition session must be created on the goal's competition date. This is handled client-side (two mutations in sequence) rather than via DB trigger, to keep the logic explicit and testable.

### Update Goal

```
UPDATE goals
SET name = :name, discipline = :discipline, competition_date = :competitionDate,
    preparation_weeks = :preparationWeeks, goal_distance_km = :goalDistanceKm,
    goal_time_seconds = :goalTimeSeconds, notes = :notes,
    updated_at = NOW()
WHERE id = :goalId
RETURNING *
```

Side effect: If `competition_date` or `discipline` changed, the linked competition session must be updated (date moved, type changed). Handled client-side.

### Delete Goal

```
DELETE FROM goals WHERE id = :goalId
```

The linked competition session's `goal_id` is set to NULL via `ON DELETE SET NULL` (preserving the session record if the athlete wants to keep it as a regular session, or the session can be explicitly deleted by the user).
