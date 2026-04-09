-- Add notes to the get_last_session_exercises RPC so that the previous session's
-- exercise notes are available for display in the PrevSummary collapsible.

DROP FUNCTION IF EXISTS get_last_session_exercises(uuid, uuid[], date);

CREATE FUNCTION get_last_session_exercises(
  p_athlete_id  uuid,
  p_exercise_ids uuid[],
  p_before_date  date DEFAULT NULL
)
RETURNS TABLE (
  variant_exercise_id uuid,
  actual_reps         integer,
  load_kg             numeric,
  sets_data           jsonb,
  progression         text,
  notes               text,
  completed_at        timestamptz,
  last_session_date   date
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH sessions_with_date AS (
    SELECT
      sse.variant_exercise_id,
      sse.actual_reps,
      sse.load_kg,
      sse.sets_data,
      sse.progression,
      sse.notes,
      ts.completed_at,
      (wp.week_start + (
        CASE ts.day_of_week
          WHEN 'monday'    THEN 0
          WHEN 'tuesday'   THEN 1
          WHEN 'wednesday' THEN 2
          WHEN 'thursday'  THEN 3
          WHEN 'friday'    THEN 4
          WHEN 'saturday'  THEN 5
          WHEN 'sunday'    THEN 6
          ELSE 0
        END
      ) * INTERVAL '1 day')::date AS session_date
    FROM strength_session_exercises sse
    JOIN training_sessions ts ON ts.id = sse.session_id
    JOIN week_plans wp ON wp.id = ts.week_plan_id
    WHERE wp.athlete_id = p_athlete_id
      AND sse.variant_exercise_id = ANY(p_exercise_ids)
      AND ts.is_completed = true
  ),
  filtered AS (
    SELECT * FROM sessions_with_date
    WHERE p_before_date IS NULL OR session_date < p_before_date
  ),
  ranked AS (
    SELECT DISTINCT ON (variant_exercise_id)
      variant_exercise_id,
      actual_reps,
      load_kg,
      sets_data,
      progression,
      notes,
      completed_at,
      session_date,
      MAX(session_date) OVER () AS last_session_date
    FROM filtered
    ORDER BY variant_exercise_id, session_date DESC NULLS LAST
  )
  SELECT
    variant_exercise_id,
    actual_reps,
    load_kg,
    sets_data,
    progression,
    notes,
    completed_at,
    last_session_date
  FROM ranked;
$$;
