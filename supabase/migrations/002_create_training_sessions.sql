CREATE TABLE training_sessions (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  week_plan_id    UUID NOT NULL REFERENCES week_plans(id) ON DELETE CASCADE,
  day_of_week     day_of_week NOT NULL,
  sort_order      INTEGER DEFAULT 0,
  training_type   training_type NOT NULL,

  -- Coach fields
  description     TEXT,
  coach_comments  TEXT,
  planned_duration_minutes INTEGER,
  planned_distance_km     DECIMAL(6,2),

  -- Type-specific data as JSONB
  type_specific_data JSONB DEFAULT '{}',

  -- Athlete execution
  is_completed    BOOLEAN DEFAULT FALSE,
  completed_at    TIMESTAMPTZ,
  trainee_notes   TEXT,

  -- Strava integration (future)
  strava_activity_id  BIGINT,
  strava_synced_at    TIMESTAMPTZ,

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_training_sessions_updated
  BEFORE UPDATE ON training_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_training_sessions_week ON training_sessions(week_plan_id);
CREATE INDEX idx_training_sessions_day ON training_sessions(week_plan_id, day_of_week);
CREATE INDEX idx_training_sessions_strava ON training_sessions(strava_activity_id)
  WHERE strava_activity_id IS NOT NULL;
