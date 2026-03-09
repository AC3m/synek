# Data Model: Settings Page with Strava Integration

**Feature**: 004-settings-strava
**Date**: 2026-03-08

---

## Existing Tables (extended)

### `profiles` (extended)

Current columns: `id`, `email`, `name`, `role`, `created_at`, `updated_at`

**New column added** via migration `010`:
```sql
avatar_url TEXT  -- nullable; public URL to Supabase Storage avatar
```

**TypeScript shape** (AuthUser in `app/lib/auth.ts` extended):
```typescript
interface AuthUser {
  id: string
  email: string
  role: 'coach' | 'athlete'
  name: string
  avatarUrl: string | null   // NEW
}
```

---

### `strava_tokens` (extended)

Current columns: `id`, `access_token`, `refresh_token`, `expires_at`, `athlete_id` (Strava's athlete ID, not our user), `created_at`, `updated_at`

**New column added** via migration `010`:
```sql
user_id UUID REFERENCES profiles(id) ON DELETE CASCADE  -- links token to Synek user
```

**Full TypeScript shape** (`app/types/strava.ts` extended):
```typescript
interface StravaToken {
  id: string
  userId: string            // Synek profile ID
  stravaAthleteId: number   // Strava's own athlete ID
  stravaAthleteName: string | null
  accessToken: string
  refreshToken: string
  expiresAt: string         // ISO timestamp
  connectedAt: string
  lastSyncedAt: string | null
  createdAt: string
  updatedAt: string
}
```

---

### `strava_activities` (unchanged — already correct)

Existing columns cover all fields needed for sync. The `training_session_id` FK links matched activities to sessions.

---

## New Entity: Strava Connection Status (view model, not DB table)

Used only in the UI layer to represent the integration state shown on the Integrations tab:

```typescript
interface StravaConnectionStatus {
  connected: boolean
  stravaAthleteName: string | null
  connectedAt: string | null
  lastSyncedAt: string | null
}
```

---

## State Transitions

### Strava Connection Lifecycle
```
NOT_CONNECTED
    │ user clicks "Connect with Strava"
    ▼
OAUTH_PENDING  (browser redirected to Strava)
    │ user approves on Strava; redirected back with code
    ▼
EXCHANGING     (Edge Function called)
    │ tokens stored in strava_tokens
    ▼
CONNECTED
    │ user clicks "Disconnect"
    ▼
NOT_CONNECTED  (tokens deleted from strava_tokens)
```

### Token Lifecycle
```
CONNECTED (valid token)
    │ expires_at < now() + 60s
    ▼
REFRESHING     (Edge Function refreshes token)
    │ new tokens stored
    ▼
CONNECTED (valid token)
```

---

## Validation Rules

### Profile Updates
- `name`: required, 1–100 characters, trimmed
- `avatar_url`: valid URL or null; file must be JPEG/PNG/WebP, max 5 MB before upload
- `password` (new): min 8 characters

### Strava Connection
- `code`: present and non-empty (from OAuth redirect)
- `state`: must match the CSRF token stored in sessionStorage before the redirect

---

## Migration Plan

**File**: `supabase/migrations/010_settings_schema.sql`

Changes:
1. Add `avatar_url TEXT` to `profiles`
2. Add `user_id UUID REFERENCES profiles(id) ON DELETE CASCADE` to `strava_tokens`
3. Add `strava_athlete_name TEXT` to `strava_tokens`
4. Add `last_synced_at TIMESTAMPTZ` to `strava_tokens`
5. Add `connected_at TIMESTAMPTZ` to `strava_tokens`
6. Add UNIQUE constraint on `strava_tokens(user_id)`
7. Add RLS: users can read/write their own `strava_tokens` row
8. Add RLS: users can update their own `profiles.avatar_url` and `name`
