-- Strava activities (future use)
CREATE TABLE strava_activities (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  strava_id           BIGINT NOT NULL UNIQUE,
  training_session_id UUID REFERENCES training_sessions(id) ON DELETE SET NULL,
  name                TEXT,
  activity_type       TEXT,
  start_date          TIMESTAMPTZ,
  moving_time_seconds INTEGER,
  elapsed_time_seconds INTEGER,
  distance_meters     DECIMAL(10,2),
  total_elevation_gain DECIMAL(8,2),
  average_speed       DECIMAL(6,3),
  max_speed           DECIMAL(6,3),
  average_heartrate   DECIMAL(5,1),
  max_heartrate       DECIMAL(5,1),
  average_cadence     DECIMAL(5,1),
  calories            INTEGER,
  suffer_score        INTEGER,
  average_pace_per_km TEXT,
  raw_data            JSONB,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Strava tokens (future use)
CREATE TABLE strava_tokens (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  access_token    TEXT NOT NULL,
  refresh_token   TEXT NOT NULL,
  expires_at      TIMESTAMPTZ NOT NULL,
  athlete_id      BIGINT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_strava_activities_updated
  BEFORE UPDATE ON strava_activities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_strava_activities_session ON strava_activities(training_session_id)
  WHERE training_session_id IS NOT NULL;
