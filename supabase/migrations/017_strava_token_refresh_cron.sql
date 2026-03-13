CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Helper invoked by cron. It reads runtime settings from the DB:
--   app.settings.supabase_project_ref
--   app.settings.internal_functions_token
-- Configure those once per environment (see deployment docs).
CREATE OR REPLACE FUNCTION public.invoke_strava_token_refresh()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  project_ref text;
  internal_token text;
BEGIN
  project_ref := current_setting('app.settings.supabase_project_ref', true);
  internal_token := current_setting('app.settings.internal_functions_token', true);

  IF project_ref IS NULL OR project_ref = '' THEN
    RAISE NOTICE 'Skipping strava token refresh cron call: app.settings.supabase_project_ref is not set.';
    RETURN;
  END IF;

  IF internal_token IS NULL OR internal_token = '' THEN
    RAISE NOTICE 'Skipping strava token refresh cron call: app.settings.internal_functions_token is not set.';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := 'https://' || project_ref || '.supabase.co/functions/v1/strava-token-refresh',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || internal_token
    ),
    body := '{}'::jsonb
  );
END;
$$;

DO $$
DECLARE
  existing_job record;
BEGIN
  FOR existing_job IN
    SELECT jobid FROM cron.job WHERE jobname = 'strava-token-refresh'
  LOOP
    PERFORM cron.unschedule(existing_job.jobid);
  END LOOP;

  PERFORM cron.schedule(
    'strava-token-refresh',
    '0 * * * *',
    $job$SELECT public.invoke_strava_token_refresh();$job$
  );
END;
$$;
