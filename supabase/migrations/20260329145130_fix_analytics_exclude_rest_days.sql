-- Exclude rest_day sessions from get_analytics_summary
-- Rest days have no meaningful distance/duration and should not count as
-- training sessions in session totals, completion rates, or chart buckets.

CREATE OR REPLACE FUNCTION public.get_analytics_summary(
  p_athlete_id    UUID,
  p_period        TEXT,
  p_goal_id       UUID    DEFAULT NULL,
  p_training_type TEXT    DEFAULT NULL,
  p_reference_date DATE   DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_start_date   DATE;
  v_end_date     DATE;
  v_buckets      JSONB;
  v_competitions JSONB;
  v_totals       JSONB;
  v_goal_row     RECORD;
BEGIN
  IF NOT (
    auth.uid() = p_athlete_id
    OR EXISTS (
      SELECT 1 FROM coach_athletes car
      WHERE car.coach_id = auth.uid()
        AND car.athlete_id = p_athlete_id
    )
  ) THEN
    RETURN jsonb_build_object('error', 'unauthorized');
  END IF;

  -- Determine date range
  IF p_period = 'year' THEN
    v_start_date := date_trunc('year', p_reference_date)::DATE;
    v_end_date   := (date_trunc('year', p_reference_date) + interval '1 year' - interval '1 day')::DATE;
  ELSIF p_period = 'quarter' THEN
    v_start_date := date_trunc('quarter', p_reference_date)::DATE;
    v_end_date   := (date_trunc('quarter', p_reference_date) + interval '3 months' - interval '1 day')::DATE;
  ELSIF p_period = 'month' THEN
    v_start_date := date_trunc('month', p_reference_date)::DATE;
    v_end_date   := (date_trunc('month', p_reference_date) + interval '1 month' - interval '1 day')::DATE;
  ELSIF p_period = 'goal' AND p_goal_id IS NOT NULL THEN
    SELECT competition_date, preparation_weeks
    INTO v_goal_row
    FROM goals
    WHERE id = p_goal_id AND athlete_id = p_athlete_id;

    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'buckets',      '[]'::JSONB,
        'competitions', '[]'::JSONB,
        'totals',       jsonb_build_object(
          'totalSessions', 0, 'completedSessions', 0,
          'totalDistanceKm', 0, 'totalDurationMinutes', 0, 'overallCompletionRate', 0
        )
      );
    END IF;

    v_end_date   := v_goal_row.competition_date;
    v_start_date := (v_goal_row.competition_date - (v_goal_row.preparation_weeks * 7))::DATE;
    v_start_date := (v_start_date - extract(dow from v_start_date)::INTEGER + 1)::DATE;
  ELSE
    v_start_date := date_trunc('month', p_reference_date)::DATE;
    v_end_date   := (date_trunc('month', p_reference_date) + interval '1 month' - interval '1 day')::DATE;
  END IF;

  -- Build buckets: pre-aggregate per bucket in a subquery, then jsonb_agg
  SELECT jsonb_agg(q.obj ORDER BY q.start_date)
  INTO v_buckets
  FROM (
    SELECT
      b.start_date,
      jsonb_build_object(
        'label',                  b.label,
        'start_date',             b.start_date,
        'end_date',               b.end_date,
        'total_sessions',         COALESCE(COUNT(sd.id), 0),
        'completed_sessions',     COALESCE(SUM(CASE WHEN sd.is_completed THEN 1 ELSE 0 END), 0),
        'total_distance_km',      COALESCE(SUM(COALESCE(sd.actual_distance_km, sd.planned_distance_km)), 0),
        'total_duration_minutes', COALESCE(SUM(COALESCE(sd.actual_duration_minutes, sd.planned_duration_minutes)), 0),
        'completion_rate',        CASE
                                    WHEN COUNT(sd.id) = 0 THEN 0
                                    ELSE ROUND(100.0 * SUM(CASE WHEN sd.is_completed THEN 1 ELSE 0 END) / COUNT(sd.id), 1)
                                  END
      ) AS obj
    FROM (
      SELECT
        CASE
          WHEN p_period = 'year'    THEN to_char(gs, 'Mon')
          WHEN p_period = 'quarter' THEN 'W' || to_char(gs, 'IW')
          WHEN p_period = 'month'   THEN to_char(gs, 'DD Mon')
          WHEN p_period = 'goal'    THEN 'W' || to_char(gs, 'IW')
          ELSE to_char(gs, 'DD Mon')
        END AS label,
        gs::DATE AS start_date,
        CASE
          WHEN p_period = 'year'    THEN (gs + interval '1 month' - interval '1 day')::DATE
          WHEN p_period = 'quarter' THEN (gs + interval '6 days')::DATE
          WHEN p_period = 'month'   THEN gs::DATE
          WHEN p_period = 'goal'    THEN (gs + interval '6 days')::DATE
          ELSE gs::DATE
        END AS end_date
      FROM generate_series(
        v_start_date,
        v_end_date,
        CASE
          WHEN p_period = 'year'              THEN '1 month'::INTERVAL
          WHEN p_period IN ('quarter','goal') THEN '1 week'::INTERVAL
          ELSE '1 day'::INTERVAL
        END
      ) gs
    ) b
    LEFT JOIN (
      SELECT
        ts.id,
        ts.is_completed,
        ts.planned_distance_km,
        ts.actual_distance_km,
        ts.planned_duration_minutes,
        ts.actual_duration_minutes,
        wp.week_start
      FROM training_sessions ts
      JOIN week_plans wp ON wp.id = ts.week_plan_id
      WHERE wp.athlete_id = p_athlete_id
        AND wp.week_start BETWEEN v_start_date AND v_end_date
        AND ts.goal_id IS NULL
        AND ts.training_type != 'rest_day'::training_type
        AND (p_training_type IS NULL OR ts.training_type = p_training_type::training_type)
    ) sd ON sd.week_start BETWEEN b.start_date AND b.end_date
    GROUP BY b.label, b.start_date, b.end_date
  ) q;

  -- Build competitions within the period
  SELECT jsonb_agg(
    jsonb_build_object(
      'goal_id',             g.id,
      'goal_name',           g.name,
      'discipline',          g.discipline,
      'competition_date',    g.competition_date,
      'goal_distance_km',    g.goal_distance_km,
      'goal_time_seconds',   g.goal_time_seconds,
      'result_distance_km',  ts.result_distance_km,
      'result_time_seconds', ts.result_time_seconds,
      'achievement_status',
        CASE
          WHEN ts.result_distance_km IS NULL AND ts.result_time_seconds IS NULL THEN 'pending'
          WHEN g.goal_distance_km IS NOT NULL AND ts.result_distance_km >= g.goal_distance_km THEN 'achieved'
          WHEN g.goal_time_seconds IS NOT NULL AND ts.result_time_seconds <= g.goal_time_seconds THEN 'achieved'
          ELSE 'missed'
        END
    ) ORDER BY g.competition_date
  )
  INTO v_competitions
  FROM goals g
  LEFT JOIN training_sessions ts ON ts.goal_id = g.id
  WHERE g.athlete_id = p_athlete_id
    AND g.competition_date BETWEEN v_start_date AND v_end_date
    AND (p_training_type IS NULL OR g.discipline = p_training_type);

  -- Build totals
  SELECT jsonb_build_object(
    'totalSessions',         COALESCE(COUNT(ts.id), 0),
    'completedSessions',     COALESCE(SUM(CASE WHEN ts.is_completed THEN 1 ELSE 0 END), 0),
    'totalDistanceKm',       COALESCE(SUM(COALESCE(ts.actual_distance_km, ts.planned_distance_km)), 0),
    'totalDurationMinutes',  COALESCE(SUM(COALESCE(ts.actual_duration_minutes, ts.planned_duration_minutes)), 0),
    'overallCompletionRate', CASE
                               WHEN COUNT(ts.id) = 0 THEN 0
                               ELSE ROUND(100.0 * SUM(CASE WHEN ts.is_completed THEN 1 ELSE 0 END) / COUNT(ts.id), 1)
                             END
  )
  INTO v_totals
  FROM training_sessions ts
  JOIN week_plans wp ON wp.id = ts.week_plan_id
  WHERE wp.athlete_id = p_athlete_id
    AND wp.week_start BETWEEN v_start_date AND v_end_date
    AND ts.goal_id IS NULL
    AND ts.training_type != 'rest_day'::training_type
    AND (p_training_type IS NULL OR ts.training_type = p_training_type::training_type);

  RETURN jsonb_build_object(
    'buckets',      COALESCE(v_buckets, '[]'::JSONB),
    'competitions', COALESCE(v_competitions, '[]'::JSONB),
    'totals',       v_totals
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_analytics_summary(UUID, TEXT, UUID, TEXT, DATE) TO authenticated;
