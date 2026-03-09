# Research: Settings Page with Strava Integration

**Feature**: 004-settings-strava
**Date**: 2026-03-08

---

## 1. Strava OAuth Authorization Code Flow in a SPA

### Decision
Use a **Supabase Edge Function** as a secure server-side intermediary to exchange the OAuth authorization code for tokens. The Strava client secret is stored only in the Edge Function's environment variables — never shipped to the browser.

### Flow
```
1. User clicks "Connect with Strava"
2. SPA redirects to: https://www.strava.com/oauth/authorize
   ?client_id=<STRAVA_CLIENT_ID>
   &redirect_uri=<APP_URL>/settings?tab=integrations
   &response_type=code
   &scope=activity:read_all
   &state=<random-csrf-token>
3. User authorizes on Strava
4. Strava redirects to: /settings?tab=integrations&code=<AUTH_CODE>&state=<csrf>&scope=<granted>
5. SPA detects `code` param, calls Edge Function: POST /functions/v1/strava-auth
   { code, userId }
6. Edge Function calls Strava token endpoint (server-side, secret safe):
   POST https://www.strava.com/oauth/token
   { client_id, client_secret, code, grant_type: "authorization_code" }
7. Edge Function stores tokens in strava_tokens table and returns { athleteName, connected: true }
8. SPA shows "Connected as [athleteName]"
```

### Rationale
- Client secret never exposed in browser bundle
- Supabase Edge Functions are already part of the stack (no new infrastructure)
- Simpler than implementing a full backend — one function handles the code exchange
- The `state` parameter prevents CSRF

### Alternatives Considered
- **PKCE flow**: Strava supports PKCE for public clients, which would eliminate the need for a server-side exchange. However, Strava's implementation is less well-documented for PKCE, and Supabase Edge Functions are already available. Decision: Edge Function is safer and more explicit.
- **Separate backend server**: Overkill — Supabase Edge Function is sufficient and stays within existing infrastructure.

---

## 2. Required Strava OAuth Scopes

### Decision
Request `activity:read_all` scope (preferred) with `activity:read` as fallback.

### Rationale
- `activity:read` covers public activities and includes heart rate when the athlete permits it
- `activity:read_all` additionally covers private activities — recommended since athletes often log workouts as private
- Starting with `activity:read_all` avoids a re-authorization prompt if private activities need to be captured later

---

## 3. Strava Token Refresh

### Decision
Perform refresh in the Supabase Edge Function (`strava-refresh` function, or inline in the data-fetching path).

### How it works
- Access tokens expire after **6 hours** (expires_at is a Unix timestamp)
- Before making any Strava API call, check if `expires_at < now() + 60s` (1-minute buffer)
- If expired: `POST https://www.strava.com/oauth/token` with `grant_type=refresh_token` and the stored refresh_token
- Strava returns new `access_token`, `refresh_token`, and `expires_at` — all three must be updated in DB
- The refresh_token rotates on each use

### Rationale
- Refresh happens server-side (Edge Function) to keep client secret safe
- Storing `expires_at` in `strava_tokens` table enables efficient "should I refresh?" checks
- Token rotation means old refresh tokens are invalidated immediately after use

---

## 4. Redirect URI Pattern for SPA

### Decision
Use the Settings route with a tab parameter: `<APP_URL>/settings?tab=integrations`

The SPA detects `code` and `state` URL params on mount of the Integrations tab component, triggers the code exchange, then clears the params from the URL to prevent re-use.

### Pattern
```
redirect_uri = window.location.origin + '/settings?tab=integrations'
```
Note: The `redirect_uri` registered in the Strava app dashboard must exactly match this value. Both `http://localhost:5173/settings?tab=integrations` and the production URL are registered.

---

## 5. Strava Activity Type Mapping

### Decision
Map Strava's `type` field to Synek training types as follows:

| Strava Type | Synek Type |
|-------------|------------|
| `Run` | `run` |
| `TrailRun` | `run` |
| `VirtualRun` | `run` |
| `Ride` | `cycling` |
| `EBikeRide` | `cycling` |
| `VirtualRide` | `cycling` |
| `MountainBikeRide` | `cycling` |
| `GravelRide` | `cycling` |
| `Swim` | `swimming` |
| `WeightTraining` | `strength` |
| `Yoga` | `yoga` |
| `Walk` | `walk` |
| `Hike` | `hike` |
| *(all others)* | `other` |

### New Synek Training Types Required
`walk` and `hike` are introduced as first-class training types alongside the existing set. This follows the standard "new training type" pattern from CLAUDE.md (§5):
- Add `'walk'` and `'hike'` variants to `TRAINING_TYPES` and `TypeSpecificData` in `app/types/training.ts`
- Add color configs in `app/lib/utils/training-types.ts`
- Create `WalkHikeFields.tsx` type-field component (shared, since both are similar)
- Add translation keys to both `en/training.json` and `pl/training.json`
- Render in `SessionForm.tsx`

### Matching Strategy
Match activities to sessions by:
1. **Date**: Strava `start_date` (local) calendar day == session's `day` in the week plan
2. **Type**: Strava type maps to Synek type per table above
3. **Tie-breaking**: If multiple activities match the same session slot, use the longest `moving_time_seconds`

---

## 6. Profile Picture Storage

### Decision
Use **Supabase Storage** with a public bucket `avatars`. File path: `{userId}/avatar.{ext}`. URL stored in `profiles.avatar_url`.

### Rationale
- Already part of the stack — no new service needed
- Public bucket avoids signed URL expiry complexity for avatars
- Overwriting the same path ensures only one avatar per user exists at a time

---

## 7. Password Change

### Decision
Use Supabase Auth `updateUser({ password: newPassword })`. Current password verification is done by calling `signInWithPassword` first — if it succeeds, proceed with `updateUser`; if it fails, show error.

### Rationale
- Supabase Auth doesn't natively re-verify the current password on `updateUser`
- Re-auth via `signInWithPassword` is a clean and secure workaround
- In mock mode, current password check is simulated against the mock users list

---

## 8. Existing Schema Analysis

The `strava_tokens` table (migration 003) exists but lacks a `user_id` FK to `profiles`. Need to add:
- `profiles.avatar_url TEXT` column
- `strava_tokens.user_id UUID REFERENCES profiles(id)` column
- RLS policies for both new columns

The `strava_activities` table already links to `training_sessions` via `training_session_id`, which is correct.

**Next migration number**: `010` (highest existing is `009_sheets_schema_extension.sql`)
