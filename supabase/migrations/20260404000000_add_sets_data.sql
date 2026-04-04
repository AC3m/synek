-- sets_data column was already added manually; this migration documents it and
-- updates the get_last_session_exercises RPC to return it.
COMMENT ON COLUMN strength_session_exercises.sets_data
  IS 'Per-set breakdown: [{reps: int|null, load_kg: numeric|null}, ...] ordered by set index. NULL = only top-set data available.';

-- Drop old function first (return type changed — sets_data added to result set).
DROP FUNCTION IF EXISTS get_last_session_exercises(uuid, uuid[]);

-- Recreate with sets_data in return type so per-set prefill works.
CREATE FUNCTION get_last_session_exercises(
  p_athlete_id  uuid,
  p_exercise_ids uuid[]
)
RETURNS TABLE (
  variant_exercise_id uuid,
  actual_reps         integer,
  load_kg             numeric,
  sets_data           jsonb,
  progression         text,
  completed_at        timestamptz,
  last_session_date   timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ranked AS (
    SELECT DISTINCT ON (sse.variant_exercise_id)
      sse.variant_exercise_id,
      sse.actual_reps,
      sse.load_kg,
      sse.sets_data,
      sse.progression,
      ts.completed_at,
      MAX(ts.completed_at) OVER () AS last_session_date
    FROM strength_session_exercises sse
    JOIN training_sessions ts ON ts.id = sse.session_id
    JOIN week_plans wp ON wp.id = ts.week_plan_id
    WHERE wp.athlete_id = p_athlete_id
      AND sse.variant_exercise_id = ANY(p_exercise_ids)
      AND ts.is_completed = true
    ORDER BY sse.variant_exercise_id, ts.completed_at DESC NULLS LAST
  )
  SELECT
    variant_exercise_id,
    actual_reps,
    load_kg,
    sets_data,
    progression,
    completed_at,
    last_session_date
  FROM ranked;
$$;
