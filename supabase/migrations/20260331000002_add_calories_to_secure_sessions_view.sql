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
  ts.calories,
  ts.coach_post_feedback,
  ts.trainee_notes,
  ts.strava_activity_id,
  ts.strava_synced_at,
  COALESCE(sa.is_confirmed, FALSE) AS is_strava_confirmed,
  ts.goal_id,
  ts.result_distance_km,
  ts.result_time_seconds,
  ts.result_pace,
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
