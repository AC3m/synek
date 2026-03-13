-- Fix confirmation RPCs for legacy/stale rows where strava_activities.user_id
-- may be NULL or inconsistent. Confirmation should be authorized by
-- week ownership (week_plans.athlete_id), not pre-existing sa.user_id.

-- Backfill missing ownership first.
UPDATE strava_activities sa
SET user_id = wp.athlete_id
FROM training_sessions ts
JOIN week_plans wp ON wp.id = ts.week_plan_id
WHERE sa.training_session_id = ts.id
  AND sa.user_id IS NULL;

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
  SET is_confirmed = TRUE,
      user_id = wp.athlete_id
  FROM training_sessions ts
  JOIN week_plans wp ON wp.id = ts.week_plan_id
  WHERE ts.id = p_session_id
    AND sa.training_session_id = ts.id
    AND wp.athlete_id = auth.uid()
    AND sa.is_confirmed = FALSE;
END;
$$;

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
  SET is_confirmed = TRUE,
      user_id = wp.athlete_id
  FROM training_sessions ts
  JOIN week_plans wp ON wp.id = ts.week_plan_id
  WHERE sa.training_session_id = ts.id
    AND ts.week_plan_id = p_week_plan_id
    AND wp.athlete_id = auth.uid()
    AND sa.is_confirmed = FALSE;
END;
$$;

REVOKE ALL ON FUNCTION confirm_strava_session(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION confirm_strava_session(UUID) TO authenticated;

REVOKE ALL ON FUNCTION confirm_all_strava_sessions_for_week(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION confirm_all_strava_sessions_for_week(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
