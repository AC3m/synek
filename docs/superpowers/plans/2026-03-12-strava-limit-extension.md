# Strava API Limit Extension Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement UI branding compliance, secure backend data masking, manual sharing flow, a webhook handler, and a background token refresh service to extend the Strava API limit.

**Architecture:** 
- **Frontend (UI/UX):** React Router v7 components (`SessionCard`, `IntegrationsTab`) updated with official assets and conditional rendering for data masking.
- **Backend (Supabase):** RLS policies for secure masking, a new `user_id` column in `strava_activities` to map directly to users and enforce cascading deletes, and two Edge Functions (`strava-webhook` and `strava-token-refresh`).

**Tech Stack:** React, Tailwind CSS, Supabase (PostgreSQL, RLS, Edge Functions, pg_cron).

---

## Chunk 1: Database Migrations & Secure Data Masking

### Task 1: Create Database Migration for Schema Updates

**Files:**
- Create: `supabase/migrations/016_strava_limit_extension.sql`

- [ ] **Step 1: Write the SQL migration**

```sql
-- Add confirmation and user_id to strava_activities
ALTER TABLE strava_activities
ADD COLUMN IF NOT EXISTS is_confirmed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Backfill user_id for existing activities based on the linked training_session -> week_plan -> user_id
UPDATE strava_activities sa
SET user_id = wp.user_id
FROM training_sessions ts
JOIN week_plans wp ON wp.id = ts.week_plan_id
WHERE sa.training_session_id = ts.id
AND sa.user_id IS NULL;

-- Enable RLS
ALTER TABLE strava_activities ENABLE ROW LEVEL SECURITY;

-- Drop any existing conflicting policies
DROP POLICY IF EXISTS "anon_all_strava_activities" ON strava_activities;

-- Create policies
CREATE POLICY "Users can read their own activities or confirmed activities for their athletes"
ON strava_activities FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  is_confirmed = TRUE
);

CREATE POLICY "Users can update their own activities"
ON strava_activities FOR UPDATE
TO authenticated
USING (user_id = auth.uid());
```

- [ ] **Step 2: Create a secure Database View for masking**

```sql
-- Create a secure view for reading strava_activities with masked data for coaches
CREATE OR REPLACE VIEW secure_strava_activities AS
SELECT 
    sa.id,
    sa.strava_id,
    sa.training_session_id,
    sa.user_id,
    sa.is_confirmed,
    sa.name,
    sa.activity_type,
    sa.start_date,
    -- Masked fields
    CASE 
        WHEN sa.is_confirmed = TRUE THEN sa.distance_meters
        WHEN auth.uid() = sa.user_id THEN sa.distance_meters
        ELSE NULL 
    END as distance_meters,
    CASE 
        WHEN sa.is_confirmed = TRUE THEN sa.moving_time_seconds
        WHEN auth.uid() = sa.user_id THEN sa.moving_time_seconds
        ELSE NULL 
    END as moving_time_seconds,
    CASE 
        WHEN sa.is_confirmed = TRUE THEN sa.average_heartrate
        WHEN auth.uid() = sa.user_id THEN sa.average_heartrate
        ELSE NULL 
    END as average_heartrate,
    CASE 
        WHEN sa.is_confirmed = TRUE THEN sa.average_pace_per_km
        WHEN auth.uid() = sa.user_id THEN sa.average_pace_per_km
        ELSE NULL 
    END as average_pace_per_km,
    CASE 
        WHEN sa.is_confirmed = TRUE THEN sa.raw_data
        WHEN auth.uid() = sa.user_id THEN sa.raw_data
        ELSE NULL 
    END as raw_data,
    sa.created_at,
    sa.updated_at
FROM strava_activities sa
WHERE 
    sa.user_id = auth.uid() OR
    EXISTS (
        -- Check if current user is a coach of this athlete
        SELECT 1 FROM user_roles ur 
        WHERE ur.user_id = auth.uid() AND ur.role = 'coach'
    );

-- Grant access to the view
GRANT SELECT ON secure_strava_activities TO authenticated;
```

- [ ] **Step 3: Run the migration locally**

Run: `supabase db reset` or `supabase migration up` (depending on local setup)
Expected: Success

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/016_strava_limit_extension.sql
git commit -m "chore: add strava activities schema updates and secure view"
```

### Task 2: Create Edge Function for Webhook

**Files:**
- Create: `supabase/functions/strava-webhook/index.ts`
- Create: `supabase/functions/strava-webhook/deno.json`

- [ ] **Step 1: Scaffold deno.json**

```json
{
  "imports": {
    "supabase": "https://esm.sh/@supabase/supabase-js@2",
    "std/server": "https://deno.land/std@0.177.0/http/server.ts"
  }
}
```

- [ ] **Step 2: Write the webhook handler**

```typescript
import { serve } from "std/server";
import { createClient } from "supabase";

serve(async (req) => {
  const url = new URL(req.url);

  // 1. Handle GET (Webhook Registration Challenge)
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && challenge) {
      return new Response(JSON.stringify({ "hub.challenge": challenge }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }
  }

  // 2. Handle POST (Event Payload)
  if (req.method === 'POST') {
    const payload = await req.json();

    // Check for authorization revocation
    if (payload.object_type === 'athlete' && payload.aspect_type === 'update' && payload.updates?.authorized === "false") {
      const stravaAthleteId = payload.owner_id;

      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Extract user_id to explicitly delete all associated activities
      const { data: tokenData } = await supabaseAdmin
        .from('strava_tokens')
        .select('user_id')
        .eq('athlete_id', stravaAthleteId)
        .single();

      if (tokenData?.user_id) {
         // Explicitly delete activities first
         await supabaseAdmin.from('strava_activities').delete().eq('user_id', tokenData.user_id);
         // Explicitly delete token
         await supabaseAdmin.from('strava_tokens').delete().eq('athlete_id', stravaAthleteId);
      }
    }

    return new Response("OK", { status: 200 });
  }

  return new Response("Method Not Allowed", { status: 405 });
});
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/strava-webhook/
git commit -m "feat: add strava webhook edge function"
```

## Chunk 2: Token Refresh & Frontend Updates

### Task 3: Background Token Refresh Service

**Files:**
- Create: `supabase/functions/strava-token-refresh/index.ts`
- Create: `supabase/functions/strava-token-refresh/deno.json`
- Create: `supabase/migrations/017_strava_token_refresh_cron.sql`

- [ ] **Step 1: Scaffold deno.json**

```json
{
  "imports": {
    "supabase": "https://esm.sh/@supabase/supabase-js@2"
  }
}
```

- [ ] **Step 2: Write the token refresh function**

```typescript
import { createClient } from "supabase";

// Note: In production, trigger this via pg_cron calling the edge function URL
Deno.serve(async (req) => {
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const clientId = Deno.env.get('STRAVA_CLIENT_ID');
  const clientSecret = Deno.env.get('STRAVA_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    return new Response("Missing Strava credentials", { status: 500 });
  }

  // Find tokens expiring in the next 60 minutes
  const { data: expiringTokens } = await supabaseAdmin
    .from('strava_tokens')
    .select('id, refresh_token')
    .lte('expires_at', new Date(Date.now() + 60 * 60 * 1000).toISOString());

  if (!expiringTokens || expiringTokens.length === 0) {
    return new Response("No tokens to refresh", { status: 200 });
  }

  const results = [];

  for (const token of expiringTokens) {
    try {
      const response = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'refresh_token',
          refresh_token: token.refresh_token,
        }),
      });

      if (!response.ok) throw new Error(`Strava API error: ${response.statusText}`);
      
      const newAuth = await response.json();

      await supabaseAdmin
        .from('strava_tokens')
        .update({
          access_token: newAuth.access_token,
          refresh_token: newAuth.refresh_token,
          expires_at: new Date(newAuth.expires_at * 1000).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', token.id);

      results.push({ id: token.id, status: 'success' });
    } catch (error: any) {
      results.push({ id: token.id, status: 'failed', error: error.message });
    }
  }

  return new Response(JSON.stringify(results), { 
    headers: { "Content-Type": "application/json" }
  });
});
```

- [ ] **Step 3: Write the pg_cron migration**

```sql
-- Enable the pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the refresh job to run every hour
SELECT cron.schedule(
  'strava-token-refresh',
  '0 * * * *',
  $$
    SELECT net.http_post(
      url:='https://' || current_setting('request.jwt.claim.iss', true) || '/functions/v1/strava-token-refresh',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('request.jwt.claim.role', true) || '"}'::jsonb
    );
  $$
);
```

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/strava-token-refresh/ supabase/migrations/017_strava_token_refresh_cron.sql
git commit -m "feat: add background token refresh service via pg_cron"
```

### Task 4: UI/UX Compliance and Branding

**Files:**
- Modify: `app/components/calendar/SessionCard.tsx`
- Modify: `app/components/settings/IntegrationsTab.tsx`

- [ ] **Step 1: Update IntegrationsTab.tsx**

Replace the custom button with the official asset.

```tsx
// Find in IntegrationsTab.tsx
// Old: 
// <button onClick={onConnectStrava} style={{ backgroundColor: STRAVA_ORANGE }}>
//   {t('strava.connect')}
// </button>

// New:
<button onClick={onConnectStrava} className="p-0 border-0 bg-transparent hover:opacity-90 transition-opacity">
  <img src="/images/strava/btn_strava_connectwith_orange.svg" alt="Connect with Strava" height="48" />
</button>
```

- [ ] **Step 2: Update SessionCard.tsx (View on Strava & Confirm Flow)**

Add the required "View on Strava" link, official branding, and the "Confirm Session" button for athletes.

```tsx
// Inside SessionCard.tsx header section, next to the Strava badge:
{session.stravaActivityId != null && (
  <div className="flex items-center gap-2">
    <Badge variant="outline" title={t('strava.syncedBadge')}>
      Powered by Strava
    </Badge>
    <a 
      href={`https://www.strava.com/activities/${session.stravaActivityId}`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[10px] font-bold underline"
      style={{ color: '#FC5200' }}
    >
      View on Strava
    </a>
  </div>
)}

// Inside SessionCard.tsx footer/action section:
{session.stravaActivityId && !session.isConfirmed && userRole === 'athlete' && (
  <Button size="sm" onClick={() => handleConfirmSession(session.stravaActivityId)}>
    Confirm Session
  </Button>
)}

// Inside SessionCard.tsx metrics section:
// Apply blur class if data is masked (which will be null from DB but checking here for UI safety)
const isMasked = !session.isConfirmed && userRole === 'coach';

<div className={`grid grid-cols-2 gap-2 mt-4 ${isMasked ? 'blur-sm select-none' : ''}`} title={isMasked ? "Waiting for athlete confirmation" : ""}>
  <div className="flex flex-col">
    <span className="text-xs text-muted-foreground">Distance</span>
    <span className="font-semibold">{session.distance_meters ? `${(session.distance_meters / 1000).toFixed(2)} km` : '---'}</span>
  </div>
  <div className="flex flex-col">
    <span className="text-xs text-muted-foreground">Duration</span>
    <span className="font-semibold">{session.moving_time_seconds ? `${Math.floor(session.moving_time_seconds / 60)} min` : '---'}</span>
  </div>
  <div className="flex flex-col">
    <span className="text-xs text-muted-foreground">Avg HR</span>
    <span className="font-semibold">{session.average_heartrate ? `${Math.round(session.average_heartrate)} bpm` : '---'}</span>
  </div>
</div>
```

- [ ] **Step 3: Commit**

```bash
git add app/components/
git commit -m "feat: implement strava ui compliance and confirmation flow"
```
