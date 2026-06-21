-- HealthKit workouts: one row per HKWorkout pulled from the iOS app.
-- No is_confirmed flag — coach can see athlete's HealthKit data directly
-- (Apple's permission gate already covers user consent).
CREATE TABLE healthkit_workouts (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hk_uuid             UUID NOT NULL UNIQUE,
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  training_session_id UUID REFERENCES training_sessions(id) ON DELETE SET NULL,
  activity_type       TEXT,
  hk_activity_type    INTEGER,
  source_name         TEXT,
  source_bundle_id    TEXT,
  start_date          TIMESTAMPTZ NOT NULL,
  end_date            TIMESTAMPTZ NOT NULL,
  duration_seconds    INTEGER,
  distance_meters     DECIMAL(10,2),
  active_energy_kcal  DECIMAL(8,2),
  average_heartrate   DECIMAL(5,1),
  max_heartrate       DECIMAL(5,1),
  raw_data            JSONB,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Per-user sync state: powers "last synced at" UI and surfaces errors.
-- iOS keeps its own anchor in UserDefaults; this table is the server-side view.
CREATE TABLE healthkit_sync_status (
  user_id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_sync_at      TIMESTAMPTZ,
  last_error        TEXT,
  workouts_synced   INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Link column on training_sessions (mirrors strava_activity_id pattern).
ALTER TABLE training_sessions
ADD COLUMN IF NOT EXISTS healthkit_workout_id UUID REFERENCES healthkit_workouts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS healthkit_synced_at  TIMESTAMPTZ;

CREATE TRIGGER trg_healthkit_workouts_updated
  BEFORE UPDATE ON healthkit_workouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_healthkit_sync_status_updated
  BEFORE UPDATE ON healthkit_sync_status
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_healthkit_workouts_user ON healthkit_workouts(user_id);
CREATE INDEX idx_healthkit_workouts_session ON healthkit_workouts(training_session_id)
  WHERE training_session_id IS NOT NULL;
CREATE INDEX idx_healthkit_workouts_start ON healthkit_workouts(user_id, start_date DESC);
CREATE INDEX idx_training_sessions_healthkit ON training_sessions(healthkit_workout_id)
  WHERE healthkit_workout_id IS NOT NULL;

ALTER TABLE healthkit_workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE healthkit_sync_status ENABLE ROW LEVEL SECURITY;

-- Athletes own their rows; assigned coaches can read.
CREATE POLICY "healthkit_workouts_select_owner_or_coach"
ON healthkit_workouts FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM coach_athletes ca
    JOIN profiles p ON p.id = auth.uid()
    WHERE ca.coach_id = auth.uid()
      AND ca.athlete_id = healthkit_workouts.user_id
      AND p.role = 'coach'
  )
);

CREATE POLICY "healthkit_workouts_insert_owner_only"
ON healthkit_workouts FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "healthkit_workouts_update_owner_only"
ON healthkit_workouts FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "healthkit_workouts_delete_owner_only"
ON healthkit_workouts FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Athletes manage their own status; assigned coaches can read.
CREATE POLICY "healthkit_sync_status_select_owner_or_coach"
ON healthkit_sync_status FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM coach_athletes ca
    JOIN profiles p ON p.id = auth.uid()
    WHERE ca.coach_id = auth.uid()
      AND ca.athlete_id = healthkit_sync_status.user_id
      AND p.role = 'coach'
  )
);

CREATE POLICY "healthkit_sync_status_modify_owner"
ON healthkit_sync_status FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
