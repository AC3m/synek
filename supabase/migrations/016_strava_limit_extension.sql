-- Add confirmation and user ownership to strava_activities
ALTER TABLE strava_activities
ADD COLUMN IF NOT EXISTS is_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Backfill owner for existing activities based on training_session -> week_plan -> athlete_id
UPDATE strava_activities sa
SET user_id = wp.athlete_id
FROM training_sessions ts
JOIN week_plans wp ON wp.id = ts.week_plan_id
WHERE sa.training_session_id = ts.id
AND sa.user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_strava_activities_user_id ON strava_activities(user_id);

ALTER TABLE strava_activities ENABLE ROW LEVEL SECURITY;

-- Remove legacy permissive policies
DROP POLICY IF EXISTS "anon_all_strava_activities" ON strava_activities;
DROP POLICY IF EXISTS "anon_all_strava_tokens" ON strava_tokens;
DROP POLICY IF EXISTS "Users can read own activities or confirmed for their athletes" ON strava_activities;
DROP POLICY IF EXISTS "Users can update their own activities" ON strava_activities;
DROP POLICY IF EXISTS "Users can read their own activities or confirmed activities for their athletes" ON strava_activities;

-- Athletes can read their own rows; coaches can read rows for assigned athletes only
CREATE POLICY "strava_activities_select_owner_or_assigned_coach"
ON strava_activities FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM coach_athletes ca
    JOIN profiles p ON p.id = auth.uid()
    WHERE ca.coach_id = auth.uid()
      AND ca.athlete_id = strava_activities.user_id
      AND p.role = 'coach'
  )
);

-- Only athletes can update their own rows (used by confirmation RPC path)
CREATE POLICY "strava_activities_update_owner_only"
ON strava_activities FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Secure Strava activities view with backend masking
DROP VIEW IF EXISTS secure_strava_activities;
CREATE VIEW secure_strava_activities
WITH (security_invoker = true) AS
SELECT
  sa.id,
  sa.strava_id,
  sa.training_session_id,
  sa.user_id,
  sa.is_confirmed,
  sa.name,
  sa.activity_type,
  sa.start_date,
  CASE
    WHEN sa.user_id = auth.uid() OR sa.is_confirmed THEN sa.distance_meters
    ELSE NULL
  END AS distance_meters,
  CASE
    WHEN sa.user_id = auth.uid() OR sa.is_confirmed THEN sa.moving_time_seconds
    ELSE NULL
  END AS moving_time_seconds,
  CASE
    WHEN sa.user_id = auth.uid() OR sa.is_confirmed THEN sa.average_heartrate
    ELSE NULL
  END AS average_heartrate,
  CASE
    WHEN sa.user_id = auth.uid() OR sa.is_confirmed THEN sa.average_pace_per_km
    ELSE NULL
  END AS average_pace_per_km,
  CASE
    WHEN sa.user_id = auth.uid() OR sa.is_confirmed THEN sa.raw_data
    ELSE NULL
  END AS raw_data,
  sa.created_at,
  sa.updated_at
FROM strava_activities sa
WHERE
  sa.user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM coach_athletes ca
    JOIN profiles p ON p.id = auth.uid()
    WHERE ca.coach_id = auth.uid()
      AND ca.athlete_id = sa.user_id
      AND p.role = 'coach'
  );

GRANT SELECT ON secure_strava_activities TO authenticated;

-- Canonical session read surface for the app:
-- for Strava-linked sessions, use strava_activities values and mask for coaches until confirmed.
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
        WHEN sa.id IS NULL THEN NULL
        WHEN wp.athlete_id = auth.uid() OR sa.is_confirmed THEN GREATEST(sa.moving_time_seconds, 0) / 60
        ELSE NULL
      END
    ELSE ts.actual_duration_minutes
  END AS actual_duration_minutes,
  CASE
    WHEN ts.strava_activity_id IS NOT NULL THEN
      CASE
        WHEN sa.id IS NULL THEN NULL
        WHEN wp.athlete_id = auth.uid() OR sa.is_confirmed THEN ROUND((sa.distance_meters / 1000.0)::numeric, 2)
        ELSE NULL
      END
    ELSE ts.actual_distance_km
  END AS actual_distance_km,
  CASE
    WHEN ts.strava_activity_id IS NOT NULL THEN
      CASE
        WHEN sa.id IS NULL THEN NULL
        WHEN wp.athlete_id = auth.uid() OR sa.is_confirmed THEN sa.average_pace_per_km
        ELSE NULL
      END
    ELSE ts.actual_pace
  END AS actual_pace,
  CASE
    WHEN ts.strava_activity_id IS NOT NULL THEN
      CASE
        WHEN sa.id IS NULL THEN NULL
        WHEN wp.athlete_id = auth.uid() OR sa.is_confirmed THEN ROUND(sa.average_heartrate)::integer
        ELSE NULL
      END
    ELSE ts.avg_heart_rate
  END AS avg_heart_rate,
  CASE
    WHEN ts.strava_activity_id IS NOT NULL THEN
      CASE
        WHEN sa.id IS NULL THEN NULL
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
  ts.created_at,
  ts.updated_at
FROM training_sessions ts
JOIN week_plans wp ON wp.id = ts.week_plan_id
LEFT JOIN strava_activities sa ON sa.training_session_id = ts.id;

GRANT SELECT ON secure_training_sessions TO authenticated;

-- Confirmation RPCs use strava_activities.is_confirmed as the single source of truth
DROP FUNCTION IF EXISTS confirm_strava_session(UUID);
CREATE OR REPLACE FUNCTION confirm_strava_session(p_session_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM training_sessions ts
    JOIN week_plans wp ON wp.id = ts.week_plan_id
    WHERE ts.id = p_session_id
      AND wp.athlete_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized to confirm this session';
  END IF;

  UPDATE strava_activities sa
  SET is_confirmed = TRUE
  WHERE sa.training_session_id = p_session_id
    AND sa.user_id = auth.uid()
    AND sa.is_confirmed = FALSE;
END;
$$;

DROP FUNCTION IF EXISTS confirm_all_strava_sessions_for_week(UUID);
CREATE OR REPLACE FUNCTION confirm_all_strava_sessions_for_week(p_week_plan_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM week_plans
    WHERE id = p_week_plan_id
      AND athlete_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized to confirm sessions for this week plan';
  END IF;

  UPDATE strava_activities sa
  SET is_confirmed = TRUE
  FROM training_sessions ts
  WHERE sa.training_session_id = ts.id
    AND ts.week_plan_id = p_week_plan_id
    AND sa.user_id = auth.uid()
    AND sa.is_confirmed = FALSE;
END;
$$;

REVOKE ALL ON FUNCTION confirm_strava_session(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION confirm_strava_session(UUID) TO authenticated;

REVOKE ALL ON FUNCTION confirm_all_strava_sessions_for_week(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION confirm_all_strava_sessions_for_week(UUID) TO authenticated;
