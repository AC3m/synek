-- ============================================================
-- Migration 005: Auth schema for role-based access
-- Creates profiles table, coach-athlete relationships,
-- and adds athlete_id to week_plans.
-- ============================================================

-- Profiles table — one row per Supabase auth user
CREATE TABLE IF NOT EXISTS profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      text NOT NULL,
  name       text NOT NULL,
  role       text NOT NULL CHECK (role IN ('coach', 'athlete')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Auto-populate profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'athlete')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- Coach-athlete relationships
CREATE TABLE IF NOT EXISTS coach_athletes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  athlete_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (coach_id, athlete_id)
);

-- Add athlete_id to week_plans (nullable during migration; backfill before enforcing NOT NULL)
ALTER TABLE week_plans
  ADD COLUMN IF NOT EXISTS athlete_id uuid REFERENCES profiles(id) ON DELETE CASCADE;

-- Index for athlete-scoped lookups
CREATE INDEX IF NOT EXISTS week_plans_athlete_id_idx ON week_plans (athlete_id);
CREATE INDEX IF NOT EXISTS week_plans_athlete_week_idx ON week_plans (athlete_id, week_start);

-- ============================================================
-- Enable RLS on new tables
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_athletes ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Drop old permissive anon policies
-- ============================================================

DROP POLICY IF EXISTS "anon_all_week_plans" ON week_plans;
DROP POLICY IF EXISTS "anon_all_training_sessions" ON training_sessions;

-- ============================================================
-- RLS policies — week_plans
-- ============================================================

-- Athletes can read/write their own week plans
CREATE POLICY "athlete_own_week_plans"
  ON week_plans FOR ALL
  TO authenticated
  USING (
    athlete_id = auth.uid()
  )
  WITH CHECK (
    athlete_id = auth.uid()
  );

-- Coaches can read/write week plans of their assigned athletes
CREATE POLICY "coach_assigned_athlete_week_plans"
  ON week_plans FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM coach_athletes ca
      JOIN profiles p ON p.id = auth.uid()
      WHERE ca.coach_id = auth.uid()
        AND ca.athlete_id = week_plans.athlete_id
        AND p.role = 'coach'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM coach_athletes ca
      JOIN profiles p ON p.id = auth.uid()
      WHERE ca.coach_id = auth.uid()
        AND ca.athlete_id = week_plans.athlete_id
        AND p.role = 'coach'
    )
  );

-- ============================================================
-- RLS policies — training_sessions (inherit scope via week_plans)
-- ============================================================

CREATE POLICY "athlete_own_training_sessions"
  ON training_sessions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM week_plans wp
      WHERE wp.id = training_sessions.week_plan_id
        AND wp.athlete_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM week_plans wp
      WHERE wp.id = training_sessions.week_plan_id
        AND wp.athlete_id = auth.uid()
    )
  );

CREATE POLICY "coach_assigned_athlete_training_sessions"
  ON training_sessions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM week_plans wp
      JOIN coach_athletes ca ON ca.athlete_id = wp.athlete_id
      JOIN profiles p ON p.id = auth.uid()
      WHERE wp.id = training_sessions.week_plan_id
        AND ca.coach_id = auth.uid()
        AND p.role = 'coach'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM week_plans wp
      JOIN coach_athletes ca ON ca.athlete_id = wp.athlete_id
      JOIN profiles p ON p.id = auth.uid()
      WHERE wp.id = training_sessions.week_plan_id
        AND ca.coach_id = auth.uid()
        AND p.role = 'coach'
    )
  );

-- ============================================================
-- RLS policies — profiles
-- ============================================================

-- Users can read their own profile
CREATE POLICY "own_profile_read"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Coaches can read profiles of their athletes
CREATE POLICY "coach_reads_athlete_profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM coach_athletes ca
      WHERE ca.coach_id = auth.uid()
        AND ca.athlete_id = profiles.id
    )
  );

-- ============================================================
-- RLS policies — coach_athletes
-- ============================================================

CREATE POLICY "coach_reads_own_relationships"
  ON coach_athletes FOR SELECT
  TO authenticated
  USING (coach_id = auth.uid());
