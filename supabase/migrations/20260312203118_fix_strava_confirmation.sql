-- Add is_strava_confirmed directly to training_sessions
ALTER TABLE training_sessions
ADD COLUMN IF NOT EXISTS is_strava_confirmed BOOLEAN DEFAULT FALSE;

-- Backfill from strava_activities if any were already confirmed
UPDATE training_sessions ts
SET is_strava_confirmed = sa.is_confirmed
FROM strava_activities sa
WHERE sa.training_session_id = ts.id;