-- Goals & Competition Sessions
-- Adds: goals table, goal_id + result columns on training_sessions,
--        get_analytics_summary RPC for the analytics dashboard.

-- ============================================================
-- 1. Goals table
-- ============================================================

CREATE TABLE goals (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  name                TEXT        NOT NULL,
  discipline          TEXT        NOT NULL,  -- matches training_type values
  competition_date    DATE        NOT NULL,
  preparation_weeks   INTEGER     NOT NULL DEFAULT 0,
  goal_distance_km    DECIMAL(8,2),
  goal_time_seconds   INTEGER,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT goals_prep_weeks_non_negative CHECK (preparation_weeks >= 0),
  CONSTRAINT goals_distance_positive       CHECK (goal_distance_km IS NULL OR goal_distance_km > 0),
  CONSTRAINT goals_time_positive           CHECK (goal_time_seconds IS NULL OR goal_time_seconds > 0)
);

CREATE INDEX idx_goals_athlete_date ON goals (athlete_id, competition_date);

CREATE TRIGGER trg_goals_updated
  BEFORE UPDATE ON goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

-- Athletes can read their own goals; coaches can read goals for athletes they coach
CREATE POLICY "goals_select" ON goals
  FOR SELECT USING (
    auth.uid() = athlete_id
    OR EXISTS (
      SELECT 1 FROM coach_athletes car
      WHERE car.coach_id = auth.uid()
        AND car.athlete_id = goals.athlete_id
    )
  );

-- Coaches can insert goals for their athletes; athletes with self-plan can insert their own
CREATE POLICY "goals_insert" ON goals
  FOR INSERT WITH CHECK (
    -- Coach inserting for their athlete
    (
      auth.uid() = created_by
      AND auth.uid() != athlete_id
      AND EXISTS (
        SELECT 1 FROM coach_athletes car
        WHERE car.coach_id = auth.uid()
          AND car.athlete_id = goals.athlete_id
      )
    )
    OR
    -- Self-plan athlete inserting their own goal
    (
      auth.uid() = athlete_id
      AND auth.uid() = created_by
      AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
          AND p.can_self_plan = true
      )
    )
  );

-- Same rules for update/delete
CREATE POLICY "goals_update" ON goals
  FOR UPDATE USING (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM coach_athletes car
      WHERE car.coach_id = auth.uid()
        AND car.athlete_id = goals.athlete_id
    )
  );

CREATE POLICY "goals_delete" ON goals
  FOR DELETE USING (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM coach_athletes car
      WHERE car.coach_id = auth.uid()
        AND car.athlete_id = goals.athlete_id
    )
  );

-- ============================================================
-- 2. Extend training_sessions
-- ============================================================

ALTER TABLE training_sessions
  ADD COLUMN goal_id            UUID        REFERENCES goals(id) ON DELETE SET NULL,
  ADD COLUMN result_distance_km DECIMAL(8,2),
  ADD COLUMN result_time_seconds INTEGER,
  ADD COLUMN result_pace        TEXT;

CREATE INDEX idx_training_sessions_goal
  ON training_sessions (goal_id)
  WHERE goal_id IS NOT NULL;

-- Both coaches and athletes can update result fields on competition sessions
-- (goal_id IS NOT NULL identifies a competition session)
-- The existing update policies cover this; result fields use no additional restriction.

-- ============================================================
-- 3. get_analytics_summary RPC
-- ============================================================

CREATE OR REPLACE FUNCTION get_analytics_summary(
  p_athlete_id     UUID,
  p_period         TEXT,           -- 'year' | 'quarter' | 'month' | 'goal'
  p_goal_id        UUID    DEFAULT NULL,
  p_training_type  TEXT    DEFAULT NULL,
  p_reference_date DATE    DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_start_date  DATE;
  v_end_date    DATE;
  v_buckets     JSONB;
  v_competitions JSONB;
  v_totals      JSONB;
  v_goal_row    RECORD;
BEGIN
  -- Authorization: caller must be the athlete or their coach
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

  -- Determine date range based on period
  IF p_period = 'year' THEN
    v_start_date := date_trunc('year', p_reference_date)::DATE;
    v_end_date   := (date_trunc('year', p_reference_date) + interval '1 year - 1 day')::DATE;
  ELSIF p_period = 'quarter' THEN
    v_start_date := date_trunc('quarter', p_reference_date)::DATE;
    v_end_date   := (date_trunc('quarter', p_reference_date) + interval '3 months - 1 day')::DATE;
  ELSIF p_period = 'month' THEN
    v_start_date := date_trunc('month', p_reference_date)::DATE;
    v_end_date   := (date_trunc('month', p_reference_date) + interval '1 month - 1 day')::DATE;
  ELSIF p_period = 'goal' AND p_goal_id IS NOT NULL THEN
    SELECT competition_date, preparation_weeks
    INTO v_goal_row
    FROM goals
    WHERE id = p_goal_id AND athlete_id = p_athlete_id;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('buckets', '[]'::JSONB, 'competitions', '[]'::JSONB,
                                'totals', jsonb_build_object('totalSessions', 0, 'completedSessions', 0,
                                  'totalDistanceKm', 0, 'totalDurationMinutes', 0, 'overallCompletionRate', 0));
    END IF;

    v_end_date   := v_goal_row.competition_date;
    v_start_date := (v_goal_row.competition_date - (v_goal_row.preparation_weeks * 7))::DATE;
    -- align to Monday
    v_start_date := (v_start_date - extract(dow from v_start_date)::INTEGER + 1)::DATE;
  ELSE
    -- default to current month
    v_start_date := date_trunc('month', p_reference_date)::DATE;
    v_end_date   := (date_trunc('month', p_reference_date) + interval '1 month - 1 day')::DATE;
  END IF;

  -- Build buckets (aggregate training sessions, excluding competition sessions)
  WITH bucket_series AS (
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
        WHEN p_period = 'year'    THEN (gs + interval '1 month - 1 day')::DATE
        WHEN p_period = 'quarter' THEN (gs + interval '7 days - 1 day')::DATE
        WHEN p_period = 'month'   THEN gs::DATE
        WHEN p_period = 'goal'    THEN (gs + interval '7 days - 1 day')::DATE
        ELSE gs::DATE
      END AS end_date
    FROM generate_series(
      v_start_date,
      v_end_date,
      CASE
        WHEN p_period IN ('year')              THEN '1 month'::INTERVAL
        WHEN p_period IN ('quarter', 'goal')   THEN '1 week'::INTERVAL
        ELSE '1 day'::INTERVAL
      END
    ) gs
  ),
  session_data AS (
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
      AND ts.goal_id IS NULL  -- exclude competition sessions
      AND (p_training_type IS NULL OR ts.training_type = p_training_type)
  )
  SELECT jsonb_agg(
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
    ) ORDER BY b.start_date
  )
  INTO v_buckets
  FROM bucket_series b
  LEFT JOIN session_data sd
    ON sd.week_start BETWEEN b.start_date AND b.end_date;

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
    'totalSessions',          COALESCE(COUNT(ts.id), 0),
    'completedSessions',      COALESCE(SUM(CASE WHEN ts.is_completed THEN 1 ELSE 0 END), 0),
    'totalDistanceKm',        COALESCE(SUM(COALESCE(ts.actual_distance_km, ts.planned_distance_km)), 0),
    'totalDurationMinutes',   COALESCE(SUM(COALESCE(ts.actual_duration_minutes, ts.planned_duration_minutes)), 0),
    'overallCompletionRate',  CASE
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
    AND (p_training_type IS NULL OR ts.training_type = p_training_type);

  RETURN jsonb_build_object(
    'buckets',      COALESCE(v_buckets, '[]'::JSONB),
    'competitions', COALESCE(v_competitions, '[]'::JSONB),
    'totals',       v_totals
  );
END;
$$;
