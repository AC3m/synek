# Contract: `strava-fetch-laps` Edge Function

**Feature**: 010-strava-run-intervals
**Pattern**: Follows `supabase/functions/strava-auth/index.ts`

---

## Endpoint

```
POST /functions/v1/strava-fetch-laps
Authorization: Bearer <user JWT>
Content-Type: application/json
```

---

## Request

```typescript
{
  sessionId: string   // UUID of the training_session
}
```

---

## Response — Success `200`

```typescript
{
  laps: Array<{
    lapIndex: number,
    name: string | null,
    intensity: 'active' | 'rest' | null,
    segmentType: 'warmup' | 'interval' | 'recovery' | 'cooldown',
    distanceMeters: number | null,
    elapsedTimeSeconds: number,
    movingTimeSeconds: number,
    averageSpeed: number | null,        // m/s
    averageHeartrate: number | null,
    maxHeartrate: number | null,
    averageCadence: number | null,
    paceZone: number | null,
  }>
}
```

`laps` is ordered by `lapIndex` ascending. Empty array `[]` means the activity exists but has no structured lap data (caller should suppress the interval affordance).

---

## Response — Errors

| Status | Body | Meaning |
|--------|------|---------|
| `400` | `{ error: 'missing_session_id' }` | `sessionId` not provided |
| `401` | `{ error: 'unauthorized' }` | JWT missing or invalid |
| `403` | `{ error: 'forbidden' }` | Session does not belong to the authenticated user |
| `404` | `{ error: 'no_strava_activity' }` | Session has no linked Strava activity |
| `429` | `{ error: 'strava_rate_limited' }` | Strava API rate limit hit — caller should back off |
| `502` | `{ error: 'strava_api_error', detail: string }` | Strava returned unexpected response |
| `500` | `{ error: 'internal_error' }` | Unexpected server error |

---

## Behaviour

1. Verify caller JWT via `anonClient.auth.getUser(jwt)`.
2. Look up `training_sessions` row for `sessionId` — confirm `week_plan.athlete_id = auth.uid()`.
3. Look up `strava_activity_id` from `training_sessions`. Return `404` if null.
4. **Check `strava_laps` first** — if rows exist for this `strava_activity_id`, return them immediately without calling Strava. *(Idempotent — safe to call multiple times.)*
5. Retrieve Strava access token from `strava_tokens` for the user; refresh if expired.
6. Call `GET https://www.strava.com/api/v3/activities/{stravaId}` with `fields=laps`.
7. Classify laps into segment types (WU / interval / recovery / CD) using name-first, position-heuristic fallback.
8. Upsert into `strava_laps` via service-role client.
9. Return classified laps.

---

## Idempotency

Calling the endpoint multiple times for the same `sessionId` is safe. After the first successful fetch, subsequent calls return from `strava_laps` without hitting the Strava API.

---

## Client Usage

```typescript
// app/lib/queries/strava-laps.ts
export async function fetchSessionLaps(sessionId: string): Promise<StravaLap[]> {
  if (isMockMode) return mockFetchSessionLaps(sessionId);

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/strava-fetch-laps`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ sessionId }),
    }
  );

  if (res.status === 429) throw new StravaRateLimitError();
  if (!res.ok) throw new Error(`strava-fetch-laps failed: ${res.status}`);

  const { laps } = await res.json();
  return laps.map(toLap);
}
```
