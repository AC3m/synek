#!/usr/bin/env bash
set -euo pipefail

if command -v supabase >/dev/null 2>&1; then
  echo "Supabase CLI already installed: $(supabase --version)"
  exit 0
fi

if [[ "${OSTYPE:-}" == darwin* ]]; then
  if ! command -v brew >/dev/null 2>&1; then
    echo "Homebrew is required on macOS to install Supabase CLI automatically."
    echo "Install Homebrew first: https://brew.sh"
    exit 1
  fi

  brew install supabase/tap/supabase
else
  if ! command -v npm >/dev/null 2>&1; then
    echo "npm is required to install Supabase CLI on this platform."
    exit 1
  fi

  npm install --global supabase
fi

supabase --version
