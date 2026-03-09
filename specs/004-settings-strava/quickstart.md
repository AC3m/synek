# Quickstart: Settings Page with Strava Integration

**Feature**: 004-settings-strava
**Date**: 2026-03-08

---

## Prerequisites

- Supabase project running (or mock mode active)
- `pnpm dev` starts the app at `http://localhost:5173`
- (For Strava): A Strava API application registered at https://www.strava.com/settings/api
  - Set `redirect_uri` to `http://localhost:5173/settings?tab=integrations`
  - Note: Client ID and Client Secret go into Supabase Edge Function env vars — never in `.env` on the client

## Environment Variables

### App (client-safe, in `.env`)
```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_STRAVA_CLIENT_ID=...   # Only the client ID — safe to expose
```

### Supabase Edge Functions (server-side only)
```bash
STRAVA_CLIENT_SECRET=...    # Never expose to browser
STRAVA_CLIENT_ID=...        # Redundant but explicit for Edge Function use
```

## Running the Migration

```bash
# Apply the new schema changes
supabase db push
# OR for local dev:
supabase migration up
```

## Deploying Edge Functions

```bash
supabase functions deploy strava-auth
supabase functions deploy strava-sync
supabase functions deploy strava-disconnect
```

## Testing in Mock Mode

When `VITE_SUPABASE_URL` is a placeholder, mock mode activates automatically:
- Settings page loads with pre-filled mock user data (Alice or Bob)
- "Connect with Strava" button shows mock connection flow (no real OAuth redirect)
- Mock sync populates sample Strava data into the first available unmatched session

## Accessing Settings

1. Start app: `pnpm dev`
2. Log in as any user
3. Click the user name/avatar in the top-right header
4. Select "Settings" from the dropdown
5. Use the **User** tab to update name/picture/password
6. Use the **Integrations** tab to connect/disconnect Strava

## Key Files

| File | Purpose |
|------|---------|
| `app/routes/settings.tsx` | Settings page with tab layout |
| `app/components/layout/UserMenu.tsx` | Header dropdown (updated to include Settings link) |
| `app/components/settings/UserTab.tsx` | Name, avatar, password form |
| `app/components/settings/IntegrationsTab.tsx` | Strava connection UI |
| `app/lib/queries/profile.ts` | Profile CRUD (name, avatar) |
| `app/lib/queries/strava.ts` | Strava token status queries |
| `app/lib/hooks/useProfile.ts` | React Query hook for profile |
| `app/lib/hooks/useStravaConnection.ts` | React Query hook for Strava status |
| `supabase/migrations/010_settings_schema.sql` | Schema changes |
| `supabase/functions/strava-auth/index.ts` | OAuth code exchange |
| `supabase/functions/strava-sync/index.ts` | Activity sync |
| `supabase/functions/strava-disconnect/index.ts` | Token deletion |
