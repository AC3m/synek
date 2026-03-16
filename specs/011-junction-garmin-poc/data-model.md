# Data Model: Junction Garmin PoC Integration

**Feature**: `011-junction-garmin-poc` | **Date**: 2026-03-15

> All tables are prefixed `junction_poc_` to make their temporary nature explicit.
> They have **no foreign-key relationships** to `training_sessions`, `strava_activities`, `strava_tokens`, or `strava_laps`.

---

## Tables

### `junction_poc_connections`

Stores the mapping between an app user and their Junction user registration. One row per app user (at most one active Garmin connection per user).

```sql
CREATE TABLE junction_poc_connections (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  app_user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  junction_user_id  UUID        NOT NULL,
  connected_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  status            TEXT        NOT NULL DEFAULT 'active'
                                CHECK (status IN ('active', 'disconnected')),
  disconnected_at   TIMESTAMPTZ,

  UNIQUE (app_user_id)  -- one Junction connection per app user
);

-- RLS: users can only see/modify their own connection record
ALTER TABLE junction_poc_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "poc_conn_select_own" ON junction_poc_connections
  FOR SELECT USING (auth.uid() = app_user_id);

CREATE POLICY "poc_conn_insert_own" ON junction_poc_connections
  FOR INSERT WITH CHECK (auth.uid() = app_user_id);

CREATE POLICY "poc_conn_update_own" ON junction_poc_connections
  FOR UPDATE USING (auth.uid() = app_user_id);
```

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK, auto-generated |
| `app_user_id` | UUID | FK → `auth.users(id)`, cascade delete |
| `junction_user_id` | UUID | Junction's internal UUID returned from `POST /v2/user` |
| `connected_at` | TIMESTAMPTZ | When the link flow completed successfully |
| `status` | TEXT | `'active'` or `'disconnected'` |
| `disconnected_at` | TIMESTAMPTZ | Nullable; set when user disconnects |

---

### `junction_poc_events`

Stores the full raw JSON envelope of every verified Junction webhook delivery. Deduplication is enforced on `svix_event_id`.

```sql
CREATE TABLE junction_poc_events (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  junction_user_id UUID        NOT NULL,
  svix_event_id    TEXT        NOT NULL UNIQUE,  -- deduplication key
  event_type       TEXT        NOT NULL,
  payload          JSONB       NOT NULL,
  received_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- No RLS — this table is written to only by the service-role Edge Function.
-- It is not accessible from the frontend.
-- Index for efficient lookup by Junction user.
CREATE INDEX ON junction_poc_events (junction_user_id);
CREATE INDEX ON junction_poc_events (event_type);
```

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK, auto-generated |
| `junction_user_id` | UUID | From `user_id` field in webhook envelope |
| `svix_event_id` | TEXT | From `svix-id` request header — UNIQUE for deduplication |
| `event_type` | TEXT | e.g. `daily.data.workouts.created`, `provider.connection.created` |
| `payload` | JSONB | Full raw webhook envelope (includes `event_type`, `user_id`, `client_user_id`, `data`) |
| `received_at` | TIMESTAMPTZ | Server time when the event was stored |

---

## TypeScript Types

```typescript
// app/types/junction-poc.ts

export interface JunctionPocConnection {
  id: string
  appUserId: string
  junctionUserId: string
  connectedAt: string        // ISO timestamp
  status: 'active' | 'disconnected'
  disconnectedAt: string | null
}

export interface JunctionPocEvent {
  id: string
  junctionUserId: string
  svixEventId: string
  eventType: string
  payload: Record<string, unknown>
  receivedAt: string         // ISO timestamp
}
```

---

## Entity Relationships

```
auth.users
    │
    │ 1:0..1  (one user, at most one PoC connection)
    ▼
junction_poc_connections
    │
    │ junction_user_id (no FK constraint — Junction is external)
    │
    ▼  (used for lookup only, not enforced at DB level)
junction_poc_events
```

`junction_poc_events` has no foreign key to `junction_poc_connections` by design — webhook events may arrive before the connection record is fully committed (race condition during the link flow), and the webhook handler must be able to accept or reject them independently.

---

## Removal

To tear down the PoC data model completely:

```sql
DROP TABLE IF EXISTS junction_poc_events;
DROP TABLE IF EXISTS junction_poc_connections;
```

Both tables are isolated — dropping them has zero impact on any other table.
