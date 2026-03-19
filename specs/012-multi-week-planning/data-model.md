# Data Model: Multi-Week Planning View & Copy/Drag

## Existing Schema (unchanged)

### `training_sessions` (no changes)

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `week_plan_id` | UUID FK → week_plans | Updated by DnD cross-week moves (not in scope) |
| `day_of_week` | text | Updated by DnD between-day moves |
| `sort_order` | integer | Updated by DnD within-day reordering |
| `training_type` | text | Copied in copy operations |
| `description` | text | Copied |
| `coach_comments` | text | Copied |
| `planned_duration_minutes` | integer | Copied |
| `planned_distance_km` | numeric | Copied |
| `type_specific_data` | JSONB | Copied |
| `is_completed` | boolean | NOT copied (actual data) |
| `actual_*` fields | various | NOT copied (actual data) |
| `strava_*` fields | various | NOT copied (actual data) |
| `trainee_notes` | text | NOT copied (actual data) |
| `coach_post_feedback` | text | NOT copied |

### `week_plans` (no changes)

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `athlete_id` | UUID FK | Used to scope history queries |
| `week_start` | date UNIQUE | Used to fetch previous weeks by date |
| `year` | integer | |
| `week_number` | integer | |

---

## New Database Objects

### Function: `copy_week_sessions`

```sql
CREATE OR REPLACE FUNCTION copy_week_sessions(
  p_source_week_plan_id UUID,
  p_target_week_plan_id UUID
)
RETURNS integer  -- number of sessions copied
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  INSERT INTO training_sessions (
    week_plan_id,
    day_of_week,
    sort_order,
    training_type,
    description,
    coach_comments,
    planned_duration_minutes,
    planned_distance_km,
    type_specific_data
  )
  SELECT
    p_target_week_plan_id,
    day_of_week,
    sort_order,
    training_type,
    description,
    coach_comments,
    planned_duration_minutes,
    planned_distance_km,
    type_specific_data
  FROM training_sessions
  WHERE week_plan_id = p_source_week_plan_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
```

**Fields NOT copied**: `id` (new UUID generated), `is_completed`, `actual_duration_minutes`,
`actual_distance_km`, `avg_heart_rate`, `max_heart_rate`, `rpe`, `athlete_notes`, `trainee_notes`,
`coach_post_feedback`, `strava_activity_id`, `is_strava_confirmed`, `strava_synced_at`,
`created_at`, `updated_at`.

---

### Function: `copy_day_sessions`

```sql
CREATE OR REPLACE FUNCTION copy_day_sessions(
  p_source_week_plan_id UUID,
  p_source_day         text,
  p_target_week_plan_id UUID,
  p_target_day         text
)
RETURNS integer  -- number of sessions copied
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_max_sort  integer;
  v_count     integer;
BEGIN
  -- Find the current max sort_order in the target day to append after existing sessions
  SELECT COALESCE(MAX(sort_order), 0)
    INTO v_max_sort
    FROM training_sessions
   WHERE week_plan_id = p_target_week_plan_id
     AND day_of_week  = p_target_day;

  INSERT INTO training_sessions (
    week_plan_id,
    day_of_week,
    sort_order,
    training_type,
    description,
    coach_comments,
    planned_duration_minutes,
    planned_distance_km,
    type_specific_data
  )
  SELECT
    p_target_week_plan_id,
    p_target_day,
    sort_order + v_max_sort + 10,   -- append after existing, preserve relative order
    training_type,
    description,
    coach_comments,
    planned_duration_minutes,
    planned_distance_km,
    type_specific_data
  FROM training_sessions
  WHERE week_plan_id = p_source_week_plan_id
    AND day_of_week  = p_source_day
  ORDER BY sort_order;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
```

---

## New TypeScript Types

### `CopyWeekInput`
```typescript
interface CopyWeekInput {
  sourceWeekPlanId: string
  targetWeekPlanId: string
}
```

### `CopyDayInput`
```typescript
interface CopyDayInput {
  sourceWeekPlanId: string
  sourceDay: DayOfWeek
  targetWeekPlanId: string
  targetDay: DayOfWeek
}
```

### `ReorderSessionInput`
```typescript
interface ReorderSessionInput {
  sessionId: string
  dayOfWeek: DayOfWeek      // new day (same as current if within-day reorder)
  sortOrder: number          // new sort order
}
```

### `HistoryWeek`
```typescript
interface HistoryWeek {
  weekId: string             // e.g. "2026-W09"
  weekPlan: WeekPlan | null  // null if week was never planned
  sessions: TrainingSession[]
  isExpanded: boolean        // local UI state
}
```

---

## State Transitions

### Copy Operation
```
Source sessions (previous week)
  → copy_week_sessions() or copy_day_sessions() RPC
  → New independent session records in target week
  → React Query invalidates sessions.byWeek(targetWeekPlanId)
  → UI shows copied sessions immediately (optimistic: append to current data before RPC returns)
```

### Drag-and-Drop Move
```
Session dragged from Day A to Day B (or reordered within Day A)
  → onDragEnd fires
  → Optimistic update: move session in React Query cache
  → updateSession({ id, dayOfWeek: B, sortOrder: newOrder }) mutation
  → onError: rollback to previous cache state
  → onSettled: invalidate sessions.byWeek(weekPlanId)
```

---

## Query Key Extensions

```typescript
// Additions to app/lib/queries/keys.ts
export const queryKeys = {
  // ... existing keys unchanged ...
  sessions: {
    all: ['sessions'] as const,
    byWeek: (weekPlanId: string) => ['sessions', 'week', weekPlanId] as const,
    byId: (sessionId: string) => ['sessions', sessionId] as const,
    // No new keys needed — copy mutations invalidate byWeek
  },
}
```

No new query keys are required. Copy mutations invalidate `sessions.byWeek(targetWeekPlanId)`. Reorder mutations use the existing optimistic-update pattern in `useUpdateSession`.
