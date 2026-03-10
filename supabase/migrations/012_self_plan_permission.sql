-- Add self-planning permission flag to profiles
-- Default: true (athletes can self-plan by default)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS can_self_plan boolean NOT NULL DEFAULT true;

-- RLS: athlete can update their own can_self_plan
CREATE POLICY "Athlete can update own self_plan flag"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- RLS: coach can update can_self_plan for their athletes
CREATE POLICY "Coach can update athlete self_plan flag"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM coach_athletes
      WHERE coach_athletes.coach_id = auth.uid()
        AND coach_athletes.athlete_id = profiles.id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM coach_athletes
      WHERE coach_athletes.coach_id = auth.uid()
        AND coach_athletes.athlete_id = profiles.id
    )
  );

-- RLS: coach can read can_self_plan for their athletes
CREATE POLICY "Coach can read athlete self_plan flag"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM coach_athletes
      WHERE coach_athletes.coach_id = auth.uid()
        AND coach_athletes.athlete_id = profiles.id
    )
  );
