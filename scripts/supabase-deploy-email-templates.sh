#!/usr/bin/env bash
# Deploy Supabase email templates via the Management API.
#
# Required env vars:
#   SUPABASE_ACCESS_TOKEN  — personal access token from https://supabase.com/dashboard/account/tokens
#   SUPABASE_PROJECT_REF   — project reference (e.g. xemcqwgfjcbryrkyyjcg)
#
# Usage:
#   ./scripts/supabase-deploy-email-templates.sh
#
# Templates are read from supabase/templates/*.html and pushed to the
# hosted project via PATCH /v1/projects/{ref}/config/auth.
#
# The API field names follow the pattern:
#   mailer_templates_confirmation_content  → supabase/templates/confirm-signup.html
#   mailer_templates_recovery_content      → supabase/templates/reset-password.html
#
# To add more templates, add entries to the TEMPLATES array below.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
TEMPLATES_DIR="${REPO_ROOT}/supabase/templates"

for var_name in SUPABASE_ACCESS_TOKEN SUPABASE_PROJECT_REF; do
  if [[ -z "${!var_name:-}" ]]; then
    echo "❌ Missing required environment variable: ${var_name}"
    exit 1
  fi
done

API_URL="https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/config/auth"

# Map: API field name → local template file
declare -A TEMPLATES=(
  ["mailer_templates_confirmation_content"]="${TEMPLATES_DIR}/confirm-signup.html"
  ["mailer_templates_recovery_content"]="${TEMPLATES_DIR}/reset-password.html"
)

# Build JSON payload
payload="{"
first=true
for field in "${!TEMPLATES[@]}"; do
  file="${TEMPLATES[$field]}"
  if [[ ! -f "$file" ]]; then
    echo "⚠️  Template file not found: ${file} — skipping"
    continue
  fi

  # Read file and JSON-escape it
  content=$(python3 -c "import json,sys; print(json.dumps(sys.stdin.read()))" < "$file")

  if [[ "$first" == true ]]; then
    first=false
  else
    payload+=","
  fi
  payload+="\"${field}\":${content}"
done
payload+="}"

echo "📧 Deploying email templates to project ${SUPABASE_PROJECT_REF}..."

http_code=$(curl -s -o /tmp/supabase-template-response.json -w "%{http_code}" \
  -X PATCH "$API_URL" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$payload")

if [[ "$http_code" -ge 200 && "$http_code" -lt 300 ]]; then
  echo "✅ Email templates deployed successfully (HTTP ${http_code})"
else
  echo "❌ Failed to deploy email templates (HTTP ${http_code})"
  cat /tmp/supabase-template-response.json
  exit 1
fi
