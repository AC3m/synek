-- PoC: Junction Garmin integration — remove after evaluation
-- To tear down: DROP TABLE IF EXISTS junction_poc_events; DROP TABLE IF EXISTS junction_poc_connections;

CREATE TABLE junction_poc_connections (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  app_user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  junction_user_id  UUID        NOT NULL,
  connected_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  status            TEXT        NOT NULL DEFAULT 'active'
                                CHECK (status IN ('active', 'disconnected')),
  disconnected_at   TIMESTAMPTZ,

  UNIQUE (app_user_id)
);

ALTER TABLE junction_poc_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "poc_conn_select_own" ON junction_poc_connections
  FOR SELECT USING (auth.uid() = app_user_id);

CREATE POLICY "poc_conn_insert_own" ON junction_poc_connections
  FOR INSERT WITH CHECK (auth.uid() = app_user_id);

CREATE POLICY "poc_conn_update_own" ON junction_poc_connections
  FOR UPDATE USING (auth.uid() = app_user_id);

-- junction_poc_events has no RLS — written only by service-role Edge Function
CREATE TABLE junction_poc_events (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  junction_user_id UUID        NOT NULL,
  svix_event_id    TEXT        NOT NULL UNIQUE,
  event_type       TEXT        NOT NULL,
  payload          JSONB       NOT NULL,
  received_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX junction_poc_events_junction_user_id_idx ON junction_poc_events (junction_user_id);
CREATE INDEX junction_poc_events_event_type_idx ON junction_poc_events (event_type);
