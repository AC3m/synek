-- 018: Add workout_type to strava_activities, create strava_laps table,
-- update secure_training_sessions view to expose strava_workout_type.

-- ─── 1. Add workout_type column to strava_activities ─────────────────────────

ALTER TABLE strava_activities
  ADD COLUMN IF NOT EXISTS workout_type INTEGER;

-- Backfill from raw_data for existing rows
UPDATE strava_activities
SET workout_type = (raw_data->>'workout_type')::INTEGER
WHERE raw_data IS NOT NULL
  AND raw_data->>'workout_type' IS NOT NULL;

-- ─── 2. Create strava_laps table ─────────────────────────────────────────────

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

-- ─── 3. Row-Level Security for strava_laps ───────────────────────────────────

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

-- ─── 4. Update secure_training_sessions view ─────────────────────────────────
-- Adds sa.workout_type AS strava_workout_type.
-- Full view redefinition required to add the column.

DROP VIEW IF EXISTS secure_training_sessions;
CREATE VIEW secure_training_sessions
WITH (security_invoker = true) AS
SELECT
  ts.id,
  ts.week_plan_id,
  ts.day_of_week,
  ts.sort_order,
  ts.training_type,
  ts.description,
  ts.coach_comments,
  ts.planned_duration_minutes,
  ts.planned_distance_km,
  ts.type_specific_data,
  ts.is_completed,
  ts.completed_at,
  CASE
    WHEN ts.strava_activity_id IS NOT NULL THEN
      CASE
        WHEN sa.id IS NULL THEN ts.actual_duration_minutes
        WHEN wp.athlete_id = auth.uid() OR sa.is_confirmed THEN GREATEST(sa.moving_time_seconds, 0) / 60
        ELSE NULL
      END
    ELSE ts.actual_duration_minutes
  END AS actual_duration_minutes,
  CASE
    WHEN ts.strava_activity_id IS NOT NULL THEN
      CASE
        WHEN sa.id IS NULL THEN ts.actual_distance_km
        WHEN wp.athlete_id = auth.uid() OR sa.is_confirmed THEN ROUND((sa.distance_meters / 1000.0)::numeric, 2)
        ELSE NULL
      END
    ELSE ts.actual_distance_km
  END AS actual_distance_km,
  CASE
    WHEN ts.strava_activity_id IS NOT NULL THEN
      CASE
        WHEN sa.id IS NULL THEN ts.actual_pace
        WHEN wp.athlete_id = auth.uid() OR sa.is_confirmed THEN sa.average_pace_per_km
        ELSE NULL
      END
    ELSE ts.actual_pace
  END AS actual_pace,
  CASE
    WHEN ts.strava_activity_id IS NOT NULL THEN
      CASE
        WHEN sa.id IS NULL THEN ts.avg_heart_rate
        WHEN wp.athlete_id = auth.uid() OR sa.is_confirmed THEN ROUND(sa.average_heartrate)::integer
        ELSE NULL
      END
    ELSE ts.avg_heart_rate
  END AS avg_heart_rate,
  CASE
    WHEN ts.strava_activity_id IS NOT NULL THEN
      CASE
        WHEN sa.id IS NULL THEN ts.max_heart_rate
        WHEN wp.athlete_id = auth.uid() OR sa.is_confirmed THEN ROUND(sa.max_heartrate)::integer
        ELSE NULL
      END
    ELSE ts.max_heart_rate
  END AS max_heart_rate,
  ts.rpe,
  ts.coach_post_feedback,
  ts.trainee_notes,
  ts.strava_activity_id,
  ts.strava_synced_at,
  COALESCE(sa.is_confirmed, FALSE) AS is_strava_confirmed,
  sa.workout_type AS strava_workout_type,
  ts.created_at,
  ts.updated_at
FROM training_sessions ts
JOIN week_plans wp ON wp.id = ts.week_plan_id
LEFT JOIN LATERAL (
  SELECT sa1.*
  FROM strava_activities sa1
  WHERE sa1.training_session_id = ts.id
     OR (ts.strava_activity_id IS NOT NULL AND sa1.strava_id = ts.strava_activity_id)
  ORDER BY (sa1.training_session_id = ts.id) DESC
  LIMIT 1
) sa ON TRUE;

GRANT SELECT ON secure_training_sessions TO authenticated;

NOTIFY pgrst, 'reload schema';
