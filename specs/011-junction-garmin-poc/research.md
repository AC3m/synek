# Research: Junction Garmin PoC Integration

**Feature**: `011-junction-garmin-poc` | **Date**: 2026-03-15

---

## 1. Webhook Signature Verification

**Decision**: Use the `svix` npm package inside the Edge Function for HMAC-SHA256 verification.

**Rationale**: Junction uses Svix as its webhook delivery infrastructure. Every webhook carries three headers — `svix-id`, `svix-timestamp`, `svix-signature` — and a signing secret in `whsec_<base64>` format. The official Svix SDK handles verification, timestamp replay protection, and constant-time comparison automatically. Manual verification is possible but error-prone.

**Implementation pattern (Deno Edge Function)**:
```typescript
import { Webhook } from 'https://esm.sh/svix@1/webhooks'

const wh = new Webhook(Deno.env.get('JUNCTION_WEBHOOK_SECRET')!)
// rawBody must be the raw string body — never parsed/re-stringified
wh.verify(rawBody, {
  'svix-id': req.headers.get('svix-id')!,
  'svix-timestamp': req.headers.get('svix-timestamp')!,
  'svix-signature': req.headers.get('svix-signature')!,
})
// throws on failure, returns verified payload on success
```

**Critical**: The Edge Function must read the raw request body as text before any parsing. Svix verification will fail if the body has been parsed and re-serialised.

**Alternatives considered**: Manual HMAC-SHA256 — rejected because it requires implementing replay-attack timestamp validation manually and increases failure surface.

---

## 2. Webhook Payload Structure

**Decision**: Store the entire raw envelope as JSONB; use `svix-id` as the deduplication key.

**Payload envelope** (all Junction webhook events share this shape):
```json
{
  "event_type": "daily.data.workouts.created",
  "user_id": "4a29dbc7-...",
  "client_user_id": "our-app-user-uuid",
  "team_id": "6b74423d-...",
  "data": { ... }
}
```

Key fields:
- `user_id` — Junction's internal UUID for the user (used to look up the connection record)
- `client_user_id` — the app user ID we passed at Junction user creation (useful fallback)
- `event_type` — one of: `provider.connection.created`, `daily.data.workouts.created`, `daily.data.workouts.updated`, `historical.data.workouts.created`, `daily.data.workout_stream.created`
- `data.source.slug` — `"garmin"` for Garmin events

**Note on workout streams**: The `daily.data.workout_stream.created` event is a shallow notification only — it contains a message directing to the REST API endpoint for the full stream. The `data` block does not contain the full stream payload. This is expected behaviour for large datasets.

**Rationale**: Storing the full raw envelope as JSONB preserves all data for PoC analysis. The `svix-id` header uniquely identifies each message delivery, making it the correct deduplication key (not derived from payload content, which could vary between retries).

---

## 3. Junction User Lifecycle

**Decision**: Create a Junction user on first "Connect Garmin" click, store the returned `junction_user_id`, reuse it for all subsequent API calls.

**User creation**:
- Endpoint: `POST /v2/user`
- Body: `{ "client_user_id": "<app-user-uuid>" }`
- Returns: `{ "user_id": "<junction-uuid>", "client_user_id": "<app-user-uuid>" }`
- If `client_user_id` already exists, Junction returns 400 with the existing `user_id` in the error body — handle this gracefully and reuse the existing Junction user.

**Link token generation** (after user exists):
- Endpoint: `POST /v2/link/token`
- Body: `{ "user_id": "<junction-uuid>", "provider": "garmin" }`
- Returns: `{ "link_token": "...", "link_web_url": "..." }`
- Token is short-lived (~10 min). Generate it on demand (at click time), never cache it.

**Combining both steps**: The `junction-create-user` Edge Function performs user creation + token generation in a single request from the frontend. This minimises client-server round trips and keeps the API key server-side.

**Provider disconnection** (deregister):
- The docs page for deregistration returned 404 during research. Based on the Vital/Junction API pattern and the API reference structure, the likely endpoint is:
  `DELETE /v2/user/{junction_user_id}/providers/{provider_slug}`
  where `provider_slug` is `"garmin"`.
- **Confirmed endpoint**: `DELETE /v2/user/{junction_user_id}/garmin` — no request body, returns `{ "success": true }`.

---

## 4. Frontend SDK — `@tryvital/vital-link`

**Decision**: Use `@tryvital/vital-link` for the Connect button. Accept the React 19 uncertainty given the tiny surface area.

**Bundle impact**: 1.7 KB gzipped (4.1 KB minified). Well under the 50 KB Constitution threshold. No concern.

**React 19 compatibility**: Peer dep is `react: ">=16"`. The package's main function loads a remote script (`https://link.tryvital.io/initialize.js`) that assigns `window.Vital`, then the `open(token)` call delegates to that runtime. React-version-sensitive code is minimal. Risk is low; if an incompatibility surfaces, fall back to redirecting the user to `link_web_url` (no SDK required).

**Hook usage**:
```typescript
const { open, ready, error } = useVitalLink({
  onSuccess: (metadata) => { /* update connection status */ },
  onExit: (metadata) => { /* user closed widget */ },
  onError: (metadata) => { /* handle error */ },
  env: 'sandbox', // 'production' when going live
})

// On button click:
const token = await fetchLinkToken() // calls junction-create-user Edge Function
open(token)
```

**Alternatives considered**:
- Redirect to `link_web_url` — no SDK dependency, but navigates the user away from the Integrations tab, breaking the popup UX requirement.
- Build a custom link flow via the Link API — rejected as over-engineering for a PoC.

---

## 5. Isolation & Removal Strategy

**Decision**: Prefix all PoC artefacts with `junction_poc_` (DB tables) or co-locate in clearly labelled new files. Centralise all removal steps in a `REMOVAL.md` inside the spec directory.

**New files only** (zero modifications to existing files except `IntegrationsTab.tsx` — one added child component):

| Artefact | Path |
|---|---|
| DB migration | `supabase/migrations/20260315000000_junction_poc_tables.sql` |
| Edge Function | `supabase/functions/junction-create-user/index.ts` |
| Edge Function | `supabase/functions/junction-webhook/index.ts` |
| Query file | `app/lib/queries/junction-poc.ts` |
| Mock data | `app/lib/mock-data/junction-poc.ts` |
| Hook | `app/lib/hooks/useJunctionConnection.ts` |
| UI component | `app/components/settings/JunctionGarminSection.tsx` |
| i18n keys | `junction.*` namespace in `en/common.json` + `pl/common.json` |

**Removal**: Drop the migration tables, delete the 7 new files, remove the `<JunctionGarminSection />` line from `IntegrationsTab.tsx`, remove `@tryvital/vital-link` from `package.json`, delete the i18n keys.

---

## 6. Environment Variables Required

| Variable | Used by | Notes |
|---|---|---|
| `JUNCTION_API_KEY` | Both Edge Functions | Sandbox key (`sk_us_*`). Never exposed to frontend. |
| `JUNCTION_WEBHOOK_SECRET` | `junction-webhook` only | Svix signing secret (`whsec_*`) from Junction dashboard. |
| `JUNCTION_API_BASE_URL` | Both Edge Functions | `https://api.sandbox.tryvital.io` for sandbox. |

These are added to Supabase Edge Function secrets only — not to the frontend `.env`.
