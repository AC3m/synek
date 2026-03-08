-- Enable RLS on all tables
ALTER TABLE week_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE strava_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE strava_tokens ENABLE ROW LEVEL SECURITY;

-- Permissive policies for anon role (no auth yet)
-- These grant full access to the anon key; tighten when auth is added.
CREATE POLICY "anon_all_week_plans"
  ON week_plans FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_all_training_sessions"
  ON training_sessions FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_all_strava_activities"
  ON strava_activities FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_all_strava_tokens"
  ON strava_tokens FOR ALL TO anon USING (true) WITH CHECK (true);
