# Data Model: Strava Run Interval Data

**Feature**: 010-strava-run-intervals
**Date**: 2026-03-14

---

## Database Changes

### 1. `strava_activities` — new column

```sql
ALTER TABLE strava_activities
  ADD COLUMN IF NOT EXISTS workout_type INTEGER;

-- Backfill from raw_data for existing rows
UPDATE strava_activities
SET workout_type = (raw_data->>'workout_type')::INTEGER
WHERE raw_data IS NOT NULL
  AND raw_data->>'workout_type' IS NOT NULL;
```

**Rationale**: `workout_type` is already stored inside `raw_data` JSONB but needs a dedicated column for clean querying and view exposure.

---

### 2. `strava_laps` — new table

```sql
CREATE TABLE strava_laps (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  strava_activity_id    BIGINT NOT NULL REFERENCES strava_activities(strava_id) ON DELETE CASCADE,
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lap_index             INTEGER NOT NULL,
  name                  TEXT,
  intensity             TEXT,                    -- 'active' | 'rest' (Strava raw value)
  segment_type          TEXT NOT NULL,           -- 'warmup' | 'interval' | 'recovery' | 'cooldown'
  distance_meters       DECIMAL(10,2),
  elapsed_time_seconds  INTEGER,
  moving_time_seconds   INTEGER,
  average_speed         DECIMAL(6,3),            -- m/s
  average_heartrate     DECIMAL(5,1),            -- nullable
  max_heartrate         DECIMAL(5,1),            -- nullable
  average_cadence       DECIMAL(5,1),            -- nullable
  pace_zone             INTEGER,                 -- 1–5, nullable; fallback when HR absent
  created_at            TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (strava_activity_id, lap_index)
);

CREATE INDEX idx_strava_laps_activity ON strava_laps(strava_activity_id);
CREATE INDEX idx_strava_laps_user    ON strava_laps(user_id);
```

**Deletion behaviour**: `ON DELETE CASCADE` from `strava_activities.strava_id` — if the parent activity row is deleted, laps are removed too. Note: `strava_activities.training_session_id` uses `ON DELETE SET NULL`, so session deletion does not cascade to activities or laps.

---

### 3. Row-Level Security — `strava_laps`

```sql
ALTER TABLE strava_laps ENABLE ROW LEVEL SECURITY;

-- Athletes read their own laps
CREATE POLICY "strava_laps_select_owner"
ON strava_laps FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Coaches read laps for confirmed activities of their assigned athletes
CREATE POLICY "strava_laps_select_coach"
ON strava_laps FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM strava_activities sa
    JOIN coach_athletes ca ON ca.athlete_id = sa.user_id
    JOIN profiles p ON p.id = auth.uid()
    WHERE sa.strava_id = strava_laps.strava_activity_id
      AND ca.coach_id = auth.uid()
      AND sa.is_confirmed = TRUE
      AND p.role = 'coach'
  )
);

-- Only the edge function (service role) inserts/updates laps
-- No INSERT/UPDATE/DELETE policy for authenticated users
```

---

### 4. `secure_training_sessions` view — updated

Add `strava_workout_type` to the existing view:

```sql
-- Add to SELECT:
sa.workout_type AS strava_workout_type,
```

The full view already joins `strava_activities sa` — this is a one-line addition.

---

## TypeScript Types

### `StravaLap` (new — `app/types/strava.ts`)

```typescript
export type StravaLapSegmentType = 'warmup' | 'interval' | 'recovery' | 'cooldown';

export interface StravaLap {
  id: string;
  stravaActivityId: number;
  lapIndex: number;
  name: string | null;
  intensity: 'active' | 'rest' | null;
  segmentType: StravaLapSegmentType;
  distanceMeters: number | null;
  elapsedTimeSeconds: number | null;
  movingTimeSeconds: number | null;
  averageSpeed: number | null;          // m/s — convert to min/km for display
  averageHeartrate: number | null;
  maxHeartrate: number | null;
  averageCadence: number | null;
  paceZone: number | null;             // 1–5; fallback when averageHeartrate is null
}
```

### `TrainingSession` — updated field

```typescript
// Add to existing TrainingSession interface (app/types/training.ts):
stravaWorkoutType: number | null;      // Strava workout_type; 3 = structured workout
```

### `toSession()` mapper update

```typescript
// Add to existing toSession() in app/lib/queries/sessions.ts:
stravaWorkoutType: row.strava_workout_type as number | null,
```

---

## Query Keys

```typescript
// Add to queryKeys in app/lib/queries/keys.ts:
sessionLaps: {
  all: ['sessionLaps'] as const,
  bySession: (sessionId: string) => ['sessionLaps', sessionId] as const,
},
```

---

## Derived Display Values

All conversions happen in the component, not the query layer:

| Raw value | Display | Formula |
|-----------|---------|---------|
| `averageSpeed` (m/s) | pace (min/km) | `1000 / averageSpeed / 60` → format as `mm:ss /km` |
| `elapsedTimeSeconds` | duration | format as `mm:ss` |
| `distanceMeters` | distance | `/ 1000` → `X.XX km` |
| `averageHeartrate` | HR or zone | HR if present; otherwise `Z{paceZone}` |

---

## Entity Relationships

```
auth.users
  └── strava_tokens (1:1)
  └── strava_activities (1:many)
        └── strava_laps (1:many)       ← NEW
        └── training_sessions (1:1, SET NULL on session delete)
              └── week_plans (many:1)
```

---

## State Machine: Interval Data Lifecycle

```
Session card rendered
  │
  ├─ stravaActivityId = null  →  no interval affordance (regular session)
  │
  └─ stravaActivityId != null AND stravaWorkoutType = 3
        │
        ├─ laps cached in React Query  →  show "Intervals" button immediately
        │
        └─ laps not cached
              │
              ├─ fetch in progress  →  show Skeleton placeholder
              │
              ├─ fetch succeeded, has rest laps  →  store + show "Intervals" button
              ├─ fetch succeeded, no rest laps   →  no interval affordance (auto-laps only)
              │
              └─ fetch failed (transient)  →  show Retry prompt
```
