# Strava Webhook Revocation Test Runbook

Use this runbook to validate the `strava-webhook` revocation handler at any time.

## Safety

- Use a dedicated test athlete account.
- Do **not** run this against your main athlete unless you intentionally want to delete their `strava_tokens` and `strava_activities`.

## Prerequisites

- Deployed function: `strava-webhook`
- Secret configured: `STRAVA_WEBHOOK_VERIFY_TOKEN`
- Test athlete connected to Strava at least once in Synek

## 1. Find test user + athlete ids

Run in Supabase SQL editor:

```sql
select athlete_id, user_id, created_at
from strava_tokens
order by created_at desc;
```

Pick the `user_id` and `athlete_id` for your test athlete.

## 2. Check preconditions (data exists before revocation)

```sql
select count(*) as token_rows
from strava_tokens
where athlete_id = <test_athlete_id>;

select count(*) as activity_rows
from strava_activities
where user_id = '<test_user_uuid>';
```

Expected before test:
- `token_rows >= 1`
- `activity_rows >= 1` (if test user synced activities)

## 3. Send revocation webhook event

Run in terminal:

```bash
PROJECT_REF="xemcqwgfjcbryrkyyjcg"
TOKEN="<STRAVA_WEBHOOK_VERIFY_TOKEN>"
ATHLETE_ID="<test_athlete_id>"

curl -i -X POST \
  -H "Content-Type: application/json" \
  --data "{\"object_type\":\"athlete\",\"aspect_type\":\"update\",\"owner_id\":${ATHLETE_ID},\"updates\":{\"authorized\":\"false\"}}" \
  "https://${PROJECT_REF}.supabase.co/functions/v1/strava-webhook?verify_token=${TOKEN}"
```

Expected response:
- HTTP `200`
- Body: `OK`

## 4. Verify deletion happened

Run in Supabase SQL editor:

```sql
select count(*) as token_rows
from strava_tokens
where athlete_id = <test_athlete_id>;

select count(*) as activity_rows
from strava_activities
where user_id = '<test_user_uuid>';
```

Expected after test:
- `token_rows = 0`
- `activity_rows = 0`

## 5. Optional negative/auth checks

Wrong token should fail:

```bash
curl -i -X POST \
  -H "Content-Type: application/json" \
  --data '{"object_type":"athlete","aspect_type":"create"}' \
  "https://${PROJECT_REF}.supabase.co/functions/v1/strava-webhook?verify_token=wrong"
```

Expected:
- HTTP `403`
- Body: `Forbidden`
