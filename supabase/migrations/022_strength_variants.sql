-- Migration 022: Strength Workout Module
-- Adds 3 new tables, RLS policies, updated_at trigger, and pre-fill RPC.
-- ADDITIVE ONLY — no existing tables, columns, or data are modified.

-- ---------------------------------------------------------------------------
-- strength_variants
-- Reusable workout template owned by a user (coach or self-plan athlete)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS strength_variants (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name        text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  description text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_strength_variant_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_strength_variants_updated_at
  BEFORE UPDATE ON strength_variants
  FOR EACH ROW EXECUTE FUNCTION update_strength_variant_updated_at();

-- RLS: each user sees and manages only their own variants
ALTER TABLE strength_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "variants_owner_select" ON strength_variants
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "variants_owner_insert" ON strength_variants
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "variants_owner_update" ON strength_variants
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "variants_owner_delete" ON strength_variants
  FOR DELETE USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- strength_variant_exercises
-- Ordered exercise definitions within a variant
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS strength_variant_exercises (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id  uuid NOT NULL REFERENCES strength_variants(id) ON DELETE CASCADE,
  name        text NOT NULL,
  video_url   text,
  sets        integer NOT NULL DEFAULT 3 CHECK (sets > 0 AND sets <= 20),
  reps_min    integer NOT NULL CHECK (reps_min > 0 AND reps_min <= 100),
  reps_max    integer NOT NULL CHECK (reps_max >= reps_min AND reps_max <= 100),
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- RLS: variant owner can read/write exercises (join to strength_variants)
ALTER TABLE strength_variant_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "variant_exercises_owner_select" ON strength_variant_exercises
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM strength_variants sv
      WHERE sv.id = variant_id AND sv.user_id = auth.uid()
    )
  );

CREATE POLICY "variant_exercises_owner_insert" ON strength_variant_exercises
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM strength_variants sv
      WHERE sv.id = variant_id AND sv.user_id = auth.uid()
    )
  );

CREATE POLICY "variant_exercises_owner_update" ON strength_variant_exercises
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM strength_variants sv
      WHERE sv.id = variant_id AND sv.user_id = auth.uid()
    )
  );

CREATE POLICY "variant_exercises_owner_delete" ON strength_variant_exercises
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM strength_variants sv
      WHERE sv.id = variant_id AND sv.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- strength_session_exercises
-- Per-session exercise performance log
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS strength_session_exercises (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id          uuid NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
  variant_exercise_id uuid REFERENCES strength_variant_exercises(id) ON DELETE SET NULL,
  actual_reps         integer CHECK (actual_reps >= 0),
  load_kg             numeric(6, 2) CHECK (load_kg >= 0),
  progression         text CHECK (progression IN ('up', 'maintain', 'down')),
  notes               text,
  sort_order          integer NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- RLS: athlete can read/write own session exercises; coach can read athlete's exercises
-- Uses coach_athletes join — matches existing training_sessions policy pattern
ALTER TABLE strength_session_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "session_exercises_select" ON strength_session_exercises
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM training_sessions ts
      JOIN week_plans wp ON wp.id = ts.week_plan_id
      WHERE ts.id = session_id
        AND (
          wp.athlete_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM coach_athletes ca
            JOIN profiles p ON p.id = auth.uid()
            WHERE ca.athlete_id = wp.athlete_id
              AND ca.coach_id = auth.uid()
              AND p.role = 'coach'
          )
        )
    )
  );

CREATE POLICY "session_exercises_insert" ON strength_session_exercises
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM training_sessions ts
      JOIN week_plans wp ON wp.id = ts.week_plan_id
      WHERE ts.id = session_id AND wp.athlete_id = auth.uid()
    )
  );

CREATE POLICY "session_exercises_update" ON strength_session_exercises
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM training_sessions ts
      JOIN week_plans wp ON wp.id = ts.week_plan_id
      WHERE ts.id = session_id AND wp.athlete_id = auth.uid()
    )
  );

CREATE POLICY "session_exercises_delete" ON strength_session_exercises
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM training_sessions ts
      JOIN week_plans wp ON wp.id = ts.week_plan_id
      WHERE ts.id = session_id AND wp.athlete_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- get_last_session_exercises RPC
-- Returns the most recent completed session exercise data per exercise ID.
-- Used for pre-fill: one row per exercise_id with latest actual values.
-- Also returns last_session_date (the max completed_at across all results).
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_last_session_exercises(
  p_athlete_id  uuid,
  p_exercise_ids uuid[]
)
RETURNS TABLE (
  variant_exercise_id uuid,
  actual_reps         integer,
  load_kg             numeric,
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
    progression,
    completed_at,
    last_session_date
  FROM ranked;
$$;
