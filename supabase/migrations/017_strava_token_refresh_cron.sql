-- Enable the pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the refresh job to run every hour
SELECT cron.schedule(
  'strava-token-refresh',
  '0 * * * *',
  $$
    SELECT net.http_post(
      url:='https://' || current_setting('request.jwt.claim.iss', true) || '/functions/v1/strava-token-refresh',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('request.jwt.claim.role', true) || '"}'::jsonb
    );
  $$
);