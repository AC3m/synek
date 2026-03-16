-- PoC: Junction Garmin integration — remove after evaluation
-- Stores normalised workout data extracted from daily.data.workouts.created webhook events.
-- To tear down: DROP TABLE IF EXISTS junction_poc_workouts;

CREATE TABLE junction_poc_workouts (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  junction_user_id      UUID        NOT NULL,
  app_user_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  junction_workout_id   TEXT        NOT NULL UNIQUE,    -- payload.data.id
  provider_id           TEXT,                           -- payload.data.provider_id
  title                 TEXT,
  sport_slug            TEXT,                           -- payload.data.sport.slug
  sport_name            TEXT,                           -- payload.data.sport.name
  calendar_date         DATE        NOT NULL,           -- payload.data.calendar_date
  time_start            TIMESTAMPTZ,
  time_end              TIMESTAMPTZ,
  moving_time_seconds   INTEGER,
  distance_meters       NUMERIC,
  calories              INTEGER,
  average_hr            NUMERIC,
  max_hr                NUMERIC,
  average_speed         NUMERIC,                        -- m/s
  raw_data              JSONB       NOT NULL,
  received_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX junction_poc_workouts_app_user_date_idx
  ON junction_poc_workouts (app_user_id, calendar_date);

CREATE INDEX junction_poc_workouts_sport_slug_idx
  ON junction_poc_workouts (sport_slug);

-- RLS: users see only their own workouts
ALTER TABLE junction_poc_workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "poc_workouts_select_own"
  ON junction_poc_workouts FOR SELECT
  USING (auth.uid() = app_user_id);

-- Service role bypass: RLS is bypassed automatically for service_role key
-- (no explicit INSERT policy needed — Edge Function uses service role client)

-- Backfill from existing junction_poc_events
INSERT INTO junction_poc_workouts (
  junction_user_id,
  app_user_id,
  junction_workout_id,
  provider_id,
  title,
  sport_slug,
  sport_name,
  calendar_date,
  time_start,
  time_end,
  moving_time_seconds,
  distance_meters,
  calories,
  average_hr,
  max_hr,
  average_speed,
  raw_data,
  received_at
)
SELECT
  e.junction_user_id,
  c.app_user_id,
  (e.payload->'data'->>'id')::TEXT,
  (e.payload->'data'->>'provider_id')::TEXT,
  (e.payload->'data'->>'title')::TEXT,
  (e.payload->'data'->'sport'->>'slug')::TEXT,
  (e.payload->'data'->'sport'->>'name')::TEXT,
  (e.payload->'data'->>'calendar_date')::DATE,
  NULLIF(e.payload->'data'->>'time_start', '')::TIMESTAMPTZ,
  NULLIF(e.payload->'data'->>'time_end', '')::TIMESTAMPTZ,
  NULLIF(e.payload->'data'->>'moving_time', '')::INTEGER,
  NULLIF(e.payload->'data'->>'distance', '')::NUMERIC,
  NULLIF(e.payload->'data'->>'calories', '')::INTEGER,
  NULLIF(e.payload->'data'->>'average_hr', '')::NUMERIC,
  NULLIF(e.payload->'data'->>'max_hr', '')::NUMERIC,
  NULLIF(e.payload->'data'->>'average_speed', '')::NUMERIC,
  e.payload->'data',
  e.received_at
FROM junction_poc_events e
JOIN junction_poc_connections c ON c.junction_user_id = e.junction_user_id
WHERE e.event_type = 'daily.data.workouts.created'
  AND e.payload->'data'->>'id' IS NOT NULL
ON CONFLICT (junction_workout_id) DO NOTHING;
