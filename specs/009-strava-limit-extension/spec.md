# Technical Specification: Strava API Limit Extension

## Context & Goal
The application requires an extension of the Strava API limit beyond a single athlete. To achieve this, the app must strictly comply with Strava's UI/UX branding guidelines, privacy controls, and data retention policies. 

## 1. Compliance: UI/UX Branding Overhaul

### Problem
Current Strava branding uses custom UI elements that do not comply with the official Strava API agreement.

### Solution
Replace custom elements with official assets and add required attribution.

### Implementation Details
*   **"Connect" Button:** Download and implement official "Connect with Strava" buttons (SVG/PNG) in `IntegrationsTab.tsx`. Set height to exactly 48px (or 96px for @2x).
*   **Logo Attribution:** Replace the custom orange pill in the activity card header with the official "Powered by Strava" logo or standard Strava text attribution.
*   **"View on Strava" Link:** 
    *   **Location:** Added to the header of the `SessionCard.tsx` next to the "Strava" badge.
    *   **Styling:** Must use color hex `#FC5200` with bold/underline formatting.
    *   **Localization:** The phrase "View on Strava" must remain in English across all locales (e.g., Polish) to adhere to trademark rules.

## 2. Privacy: Role-Based Data Masking

### Problem
Raw Strava data cannot be exposed to third parties (like Coaches) without the athlete's explicit, manual consent.

### Solution
Implement a UI masking layer that blurs metrics for Coaches until the Athlete confirms the session.

### Implementation Details
*   **Data Flag:** Rely on a new `is_confirmed` boolean flag on the data model (see Section 3).
*   **Secure Backend Masking:** Implement a Supabase Row Level Security (RLS) policy or a secure database view that prevents unauthorized coaches from reading the raw metrics. If `is_confirmed === false` and the `auth.uid()` belongs to a coach, the database must return `NULL` for fields like `distance_meters`, `average_heartrate`, `moving_time_seconds`, and `raw_data`. 
*   **UI Fallback:** In the `SessionCard` component, when these metric fields are returned as `NULL` (but the `strava_activity_id` exists), apply a CSS `filter: blur(4px)` over placeholder text (`---`) and display a tooltip or badge indicating: "Waiting for athlete confirmation". This ensures no raw data ever crosses the network to unauthorized users.

## 3. Performance & Persistence: Manual Sharing

### Problem
Athletes need a way to explicitly share synced Strava data with their coach. Data must be strictly managed to comply with Strava's revocation policies (no secondary storage of revoked data).

### Solution
Add an explicit confirmation action that updates a flag on the *existing* Strava data record.

### Implementation Details
*   **Database Migration:** Create a new migration to add two columns to `strava_activities`:
    *   `is_confirmed BOOLEAN DEFAULT FALSE`
    *   `user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE` (to provide a direct link to the user, preventing orphaned data if `training_session_id` is null).
*   *Note on Compliance:* This approach is chosen over moving data to a new table to ensure that if a user revokes access, a single cascade delete completely scrubs their data from the system.
*   **UI:** Add a "Confirm Session" button on the `SessionCard` for athletes (visible when `is_confirmed === false`).
*   **Action:** Clicking the button triggers a Supabase RPC or direct update to set `is_confirmed = true` for that `strava_activities` record.

## 4. Backend: Webhook Event Handler

### Problem
Strava requires applications to listen for webhooks, particularly for when users revoke authorization.

### Solution
Implement a Supabase Edge Function to handle the Strava webhook lifecycle.

### Implementation Details
*   **Endpoint:** Create a new Supabase Edge Function: `/functions/strava-webhook`.
*   **GET Handler (Registration):** 
    *   Parse the `hub.challenge` query parameter.
    *   Respond with `{"hub.challenge": "value"}` within 2 seconds to validate the subscription.
*   **POST Handler (Events):**
    *   Listen for `object_type: "athlete"` and `aspect_type: "update"`.
    *   If `updates.authorized === "false"`:
        *   Extract the `owner_id` (Strava athlete ID).
        *   Look up the internal `user_id` via `strava_tokens`.
        *   **Critical Order:** Immediately delete all corresponding rows in `strava_activities` (using the new `user_id` column) *before* deleting the token, or rely on `ON DELETE CASCADE` if the schema supports it.
        *   Delete the corresponding row in `strava_tokens`.
*   **Idempotency:** Track processed events (using a lightweight cache or DB table if necessary, or rely on the idempotent nature of the delete operations based on `object_id` and `event_time`).

## 5. Logic: Background Token Refresh Service

### Problem
Strava tokens expire every 6 hours. API calls will fail if the tokens are not refreshed.

### Solution
Create a background job using Supabase `pg_cron` to proactively refresh tokens.

### Implementation Details
*   **Edge Function:** Create `/functions/strava-token-refresh`.
    *   Queries `strava_tokens` where `expires_at < NOW() + INTERVAL '60 minutes'`.
    *   Iterates over results, calls `POST https://www.strava.com/oauth/token` with `grant_type: refresh_token`.
    *   Updates the `access_token`, `refresh_token`, and `expires_at` in the database.
*   **Cron Job:** Create a database migration to enable the `pg_cron` extension (if not already enabled) and schedule it:
    *   `SELECT cron.schedule('0 * * * *', $$ select net.http_post('https://<project>.supabase.co/functions/v1/strava-token-refresh', ...) $$);` (Run every hour).

## Production Submission Checklist

- [ ] Official "Connect with Strava" button is used at 48px/96px height.
- [ ] "View on Strava" links are present, styled #FC5200, and stay in English.
- [ ] No raw Strava data is visible to coaches before confirmation (blur effect implemented).
- [ ] Webhook endpoint handles `GET` challenge and `POST` `authorized: false` (deletes data).
- [ ] Background Token Refresh via pg_cron is deployed.
- [ ] No AI model training is performed using Strava data (Policy acknowledgement).
