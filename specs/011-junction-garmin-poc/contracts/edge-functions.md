# Edge Function Contracts: Junction Garmin PoC

**Feature**: `011-junction-garmin-poc` | **Date**: 2026-03-15

---

## `junction-create-user`

**Purpose**: Creates a Junction user (if one doesn't exist yet) and generates a short-lived link token. Called by the frontend when the user clicks "Connect Garmin". Keeps the Junction API key server-side.

**File**: `supabase/functions/junction-create-user/index.ts`

### Request

```
POST /functions/v1/junction-create-user
Authorization: Bearer <supabase-user-jwt>
Content-Type: application/json

{}  (empty body — user identity is taken from the JWT)
```

- Caller must be an authenticated app user (JWT verified via Supabase anon client).
- No body parameters required — the app user ID is extracted from the JWT.

### Response — Success `200`

```json
{
  "linkToken": "eyJ...",
  "junctionUserId": "4a29dbc7-6db3-4c83-bfac-70a20a4be1b2"
}
```

| Field | Description |
|---|---|
| `linkToken` | Short-lived token passed directly to `useVitalLink`'s `open(token)` call |
| `junctionUserId` | Junction's UUID for this user (store in `junction_poc_connections` on success callback) |

### Response — Errors

| Status | Condition |
|---|---|
| `401` | Missing or invalid JWT |
| `502` | Junction API unreachable or returned an error |
| `500` | Internal error (missing env var, DB failure) |

### Internal Flow

1. Verify caller JWT → extract `app_user_id`
2. Check `junction_poc_connections` for an existing active connection
   - If already connected → return `409` with `{ "error": "already_connected" }`
3. Check if Junction user already exists for this `client_user_id`:
   - `POST /v2/user` with `{ "client_user_id": "<app_user_id>" }`
   - If 400 (duplicate) → extract existing `user_id` from error body and continue
4. `POST /v2/link/token` with `{ "user_id": "<junction_user_id>", "provider": "garmin" }`
5. Return `{ linkToken, junctionUserId }` to frontend

### Environment Variables

| Variable | Value |
|---|---|
| `JUNCTION_API_KEY` | Sandbox key (`sk_us_*`) |
| `JUNCTION_API_BASE_URL` | `https://api.sandbox.tryvital.io` |

---

## `junction-webhook`

**Purpose**: Receives and stores all Junction webhook events. Public endpoint (no user JWT — called by Junction's Svix infrastructure). Verifies signature before storing anything.

**File**: `supabase/functions/junction-webhook/index.ts`

### Request

```
POST /functions/v1/junction-webhook
svix-id: msg_p5jXN8AQM9LWM0D4loKWxJek
svix-timestamp: 1614265330
svix-signature: v1,g0hM9SsE+OTPJTGt/...
Content-Type: application/json

{
  "event_type": "daily.data.workouts.created",
  "user_id": "4a29dbc7-6db3-4c83-bfac-70a20a4be1b2",
  "client_user_id": "our-app-user-uuid",
  "team_id": "6b74423d-...",
  "data": { ... }
}
```

### Response — Success `200`

```json
{ "received": true }
```

Junction expects a `2xx` response within a few seconds; failure triggers automatic retries.

### Response — Errors

| Status | Condition | Junction behaviour |
|---|---|---|
| `400` | Signature invalid / missing headers | No retry (permanent failure signal) |
| `404` | `user_id` not found in `junction_poc_connections` | No retry — unlinked user |
| `409` | Duplicate `svix-id` already stored | No retry — idempotent ack |
| `500` | DB write failure | Junction will retry |

### Internal Flow

1. Read raw request body as text (must not parse before verification)
2. Verify Svix signature using `junction-webhook-secret` — throw `400` on failure
3. Parse verified body as JSON
4. Check `junction_poc_connections` for `junction_user_id` = `payload.user_id` with `status = 'active'`
   - Not found → return `404`
5. Check `junction_poc_events` for existing `svix_event_id` = `svix-id` header value
   - Found → return `409` (duplicate, already stored)
6. Insert into `junction_poc_events`:
   - `junction_user_id` = `payload.user_id`
   - `svix_event_id` = `svix-id` header
   - `event_type` = `payload.event_type`
   - `payload` = full raw envelope
7. Return `200 { "received": true }`

### Environment Variables

| Variable | Value |
|---|---|
| `JUNCTION_WEBHOOK_SECRET` | Svix signing secret (`whsec_*`) from Junction dashboard |

---

## `junction-disconnect` *(to be confirmed)*

**Purpose**: Calls Junction's deregister endpoint and marks the connection as `disconnected` in the DB. Called when the user confirms disconnection from the Integrations tab.

**File**: `supabase/functions/junction-disconnect/index.ts`

**Status**: Confirmed — `DELETE /v2/user/{junction_user_id}/garmin`. No request body. Returns `{ "success": true }`.

### Request

```
POST /functions/v1/junction-disconnect
Authorization: Bearer <supabase-user-jwt>
Content-Type: application/json

{}
```

### Response — Success `200`

```json
{ "disconnected": true }
```

### Internal Flow

1. Verify caller JWT → extract `app_user_id`
2. Fetch active connection from `junction_poc_connections`
   - Not found → return `404`
3. Call Junction deregister endpoint (if available)
4. Update `junction_poc_connections` set `status = 'disconnected'`, `disconnected_at = now()`
5. Return `200`

### Environment Variables

| Variable | Value |
|---|---|
| `JUNCTION_API_KEY` | Sandbox key (`sk_us_*`) |
| `JUNCTION_API_BASE_URL` | `https://api.sandbox.tryvital.io` |
