#!/usr/bin/env bash
set -euo pipefail

if ! command -v deno >/dev/null 2>&1; then
  echo "Deno is required to check Supabase Edge Functions. Install Deno or run this in CI." >&2
  exit 1
fi

files=()
while IFS= read -r file; do
  files+=("${file}")
done < <(find supabase/functions -type f -name '*.ts' ! -name '*.test.ts' | sort)

if [ "${#files[@]}" -eq 0 ]; then
  echo "No Supabase Edge Function TypeScript files found."
  exit 0
fi

for file in "${files[@]}"; do
  echo "deno check ${file}"
  (
    cd "$(dirname "${file}")"
    deno check --quiet --no-lock "$(basename "${file}")"
  )
done
