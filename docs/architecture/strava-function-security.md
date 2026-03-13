# Strava Function Security Model

This document is the single source of truth for authentication/authorization behavior of Strava-related Edge Functions.

## `strava-sync`

Current production model:
- Supabase function gateway setting: `verify_jwt = false`
- Function-level auth: **mandatory bearer token verification inside function code**
  - Extract `Authorization: Bearer <jwt>`
  - Validate JWT via Supabase Auth (`anonClient.auth.getUser(jwt)`)
  - Derive `userId` from verified JWT claims
  - Never trust `userId` from request body

Why:
- This avoids gateway-level false negatives we observed (`401 Invalid JWT`) while preserving strict per-user authorization in function logic.

Client call requirements:
- `Authorization: Bearer <access_token>`
- `apikey: <VITE_SUPABASE_ANON_KEY>`
- Body: `{ "weekStart": "YYYY-MM-DD" }`

## `strava-webhook`
- `verify_jwt = false`
- Protected by Strava challenge token + callback `verify_token` secret.

## `strava-token-refresh`
- `verify_jwt = false`
- Protected by internal token (`SUPABASE_INTERNAL_FUNCTIONS_TOKEN`) set in the `Authorization` header from `pg_net` job calls.

## Change policy

If any Strava function auth behavior changes (gateway JWT setting, manual JWT verification flow, or required headers), update this file first, then update implementation and deployment docs in the same PR.
