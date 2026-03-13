#!/usr/bin/env bash
set -euo pipefail

if ! command -v supabase >/dev/null 2>&1; then
  echo "Supabase CLI is not installed. Run: ./scripts/install-supabase-cli.sh"
  exit 1
fi

required_vars=(
  SUPABASE_PROJECT_REF
  SUPABASE_DB_PASSWORD
  STRAVA_CLIENT_ID
  STRAVA_CLIENT_SECRET
  STRAVA_WEBHOOK_VERIFY_TOKEN
  SUPABASE_INTERNAL_FUNCTIONS_TOKEN
)

for var_name in "${required_vars[@]}"; do
  if [[ -z "${!var_name:-}" ]]; then
    echo "Missing required environment variable: ${var_name}"
    exit 1
  fi
done

echo "Linking Supabase project ${SUPABASE_PROJECT_REF}..."
supabase link --project-ref "${SUPABASE_PROJECT_REF}" --password "${SUPABASE_DB_PASSWORD}"

echo "Applying migrations..."
supabase db push

echo "Setting Edge Function secrets..."
supabase secrets set \
  STRAVA_CLIENT_ID="${STRAVA_CLIENT_ID}" \
  STRAVA_CLIENT_SECRET="${STRAVA_CLIENT_SECRET}" \
  STRAVA_WEBHOOK_VERIFY_TOKEN="${STRAVA_WEBHOOK_VERIFY_TOKEN}" \
  SUPABASE_INTERNAL_FUNCTIONS_TOKEN="${SUPABASE_INTERNAL_FUNCTIONS_TOKEN}"

echo "Deploying Edge Functions..."
supabase functions deploy strava-webhook
supabase functions deploy strava-token-refresh

cat <<'EOF'

Deployment completed.

Manual one-time SQL setup per environment (run in Supabase SQL Editor):

ALTER DATABASE postgres SET app.settings.supabase_project_ref = '<your-project-ref>';
ALTER DATABASE postgres SET app.settings.internal_functions_token = '<your-internal-functions-token>';

SELECT pg_reload_conf();

EOF
