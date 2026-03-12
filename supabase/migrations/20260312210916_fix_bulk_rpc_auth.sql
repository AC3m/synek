-- ============================================================
-- Fix: Bulk confirmation RPC for Strava activities (Auth check)
-- ============================================================

CREATE OR REPLACE FUNCTION confirm_all_strava_sessions_for_week(p_week_plan_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the user owns the week plan
  -- Using 'auth.uid()' directly here can be problematic in security definer functions
  -- if the user session context isn't fully passed or if the RLS context changes.
  -- But more importantly, the user MUST be an athlete confirming their OWN plan.
  IF NOT EXISTS (
    SELECT 1 FROM week_plans
    WHERE id = p_week_plan_id
    AND athlete_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized to confirm sessions for this week plan (Plan ID: %, User ID: %)', p_week_plan_id, auth.uid();
  END IF;

  -- Update training_sessions flag
  UPDATE training_sessions
  SET is_strava_confirmed = TRUE
  WHERE week_plan_id = p_week_plan_id
  AND strava_activity_id IS NOT NULL
  AND is_strava_confirmed = FALSE;

  -- Update strava_activities (compliance source of truth)
  UPDATE strava_activities sa
  SET is_confirmed = TRUE
  FROM training_sessions ts
  WHERE sa.training_session_id = ts.id
  AND ts.week_plan_id = p_week_plan_id
  AND sa.is_confirmed = FALSE;

END;
$$;