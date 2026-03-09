# Contracts: Strava Supabase Edge Functions

**Feature**: 004-settings-strava
**Date**: 2026-03-08

These Edge Functions are the only server-side components introduced by this feature. They hold the Strava client secret and handle all token operations.

---

## Function 1: `strava-auth`

**Purpose**: Exchange an OAuth authorization code for Strava tokens and store them.

**Trigger**: Called by the SPA immediately after receiving the `code` param in the redirect URI.

### Request
```
POST /functions/v1/strava-auth
Authorization: Bearer <supabase_anon_key>
Content-Type: application/json

{
  "code": "string",          // OAuth authorization code from Strava redirect
  "userId": "string"         // Synek profile ID of the authenticating user
}
```

### Response (success)
```json
{
  "connected": true,
  "stravaAthleteName": "Jane Doe",
  "stravaAthleteId": 12345678
}
```

### Response (error)
```json
{
  "error": "invalid_code" | "exchange_failed" | "missing_params"
}
```

### Behavior
1. Validates `code` and `userId` are present
2. POSTs to `https://www.strava.com/oauth/token` with `client_id`, `client_secret`, `code`, `grant_type: "authorization_code"`
3. Upserts a row in `strava_tokens` keyed on `user_id`:
   - `access_token`, `refresh_token`, `expires_at` (from Strava response)
   - `strava_athlete_id`, `strava_athlete_name` (from Strava athlete object)
   - `connected_at = now()`
4. Returns athlete name to display in UI

---

## Function 2: `strava-sync`

**Purpose**: Fetch recent Strava activities for a user and match them to unmatched training sessions, populating actual performance fields.

**Trigger**: Called by the SPA when the user opens the Integrations tab (if connected), or when a session is viewed and has no Strava data yet.

### Request
```
POST /functions/v1/strava-sync
Authorization: Bearer <supabase_anon_key>
Content-Type: application/json

{
  "userId": "string",         // Synek profile ID
  "weekStart": "string"       // ISO date "YYYY-MM-DD" — sync activities for this week only
}
```

### Response (success)
```json
{
  "synced": 3,                // number of sessions updated
  "lastSyncedAt": "2026-03-08T14:00:00Z"
}
```

### Response (error)
```json
{
  "error": "not_connected" | "token_refresh_failed" | "strava_api_error"
}
```

### Behavior
1. Loads `strava_tokens` for `userId`, checks `expires_at`
2. If token expired: refreshes via `POST https://www.strava.com/oauth/token` with `grant_type: "refresh_token"`, updates `strava_tokens` row
3. Fetches activities from Strava API: `GET https://www.strava.com/api/v3/athlete/activities?after=<weekStartUnix>&before=<weekEndUnix>`
4. For each activity: maps Strava type → Synek type, finds matching `training_sessions` row (same `day`, same mapped type, same `week_plan_id` for this athlete)
5. If match found:
   - Upserts row in `strava_activities`
   - Updates `training_sessions`: sets `actual_duration_minutes`, `actual_distance_km`, `actual_pace`, `avg_heart_rate` (from `average_heartrate`), `max_heart_rate` (from `max_heartrate`), and links `strava_activity_id` + `strava_synced_at`
   - Note: heart rate fields are set to `null` if Strava returns no heart rate data (athlete's device may not support it)
6. Updates `strava_tokens.last_synced_at = now()`
7. Returns count of synced sessions

---

## Function 3: `strava-disconnect`

**Purpose**: Delete stored Strava tokens for a user (disconnect).

### Request
```
POST /functions/v1/strava-disconnect
Authorization: Bearer <supabase_anon_key>
Content-Type: application/json

{
  "userId": "string"
}
```

### Response (success)
```json
{ "disconnected": true }
```

### Notes
- Does NOT clear `strava_activity_id` / `strava_synced_at` from sessions — data is retained after disconnect (non-destructive)
- Deletes the `strava_tokens` row for the user
