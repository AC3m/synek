# Tasks: Junction Garmin PoC Integration

**Input**: Design documents from `/specs/011-junction-garmin-poc/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/edge-functions.md ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story. No test tasks generated (not requested in spec).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1 / US2 / US3)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install the one new frontend dependency and create the shared TypeScript types that all subsequent phases reference.

- [x] T001 Install `@tryvital/vital-link` via `pnpm add @tryvital/vital-link` (1.7 KB gzipped — within Constitution 50 KB threshold)
- [x] T002 [P] Create `app/types/junction-poc.ts` with `JunctionPocConnection` and `JunctionPocEvent` types as defined in `data-model.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database tables and secrets must exist before any Edge Function or frontend code can run.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T003 Create `supabase/migrations/20260316000000_junction_poc_tables.sql` — `junction_poc_connections` table (with `UNIQUE(app_user_id)` and RLS policies) and `junction_poc_events` table (with `UNIQUE(svix_event_id)` and indexes on `junction_user_id`, `event_type`) exactly as specified in `data-model.md`; deploy to Supabase
- [ ] T004 [P] Add `JUNCTION_API_KEY` (sandbox key `sk_us_*`) and `JUNCTION_API_BASE_URL` (`https://api.sandbox.tryvital.io`) to Supabase project Edge Function secrets via Supabase dashboard or CLI
- [ ] T005 [P] Add `JUNCTION_WEBHOOK_SECRET` (Svix signing secret `whsec_*` from Junction sandbox dashboard) to Supabase project Edge Function secrets
- [ ] T006 Register the webhook URL `https://<project-ref>.supabase.co/functions/v1/junction-webhook` in the Junction sandbox dashboard (manual step — required before US2 can receive events)

**Checkpoint**: Tables deployed, secrets set, webhook URL registered — user story implementation can now begin.

---

## Phase 3: User Story 1 — Connect Garmin Account (Priority: P1) 🎯 MVP

**Goal**: User clicks "Connect Garmin" in the Integrations tab, a Junction popup opens, they enter Garmin credentials, popup closes, and "Garmin connected" status appears.

**Independent Test**: Click the button → Junction popup opens → enter real Garmin credentials → popup closes → `junction_poc_connections` has one active row for the test user → Integrations tab shows connected status.

- [x] T007 [US1] Create `supabase/functions/junction-create-user/index.ts` — `POST` handler that: (1) verifies caller JWT via Supabase anon client to extract `app_user_id`, (2) `POST /v2/user` to Junction with `{ client_user_id: app_user_id }` (handle 400-duplicate by extracting existing `user_id` from error body), (3) `POST /v2/link/token` with `{ user_id, provider: "garmin" }`, (4) returns `{ linkToken, junctionUserId }` — follow CORS/JSON helper pattern from `supabase/functions/strava-auth/index.ts`
- [x] T008 [P] [US1] Create `app/lib/mock-data/junction-poc.ts` — in-memory mock connection state with a `null` default and `resetMockJunctionPoc()` export; mock `fetchJunctionConnection` returns `null` (disconnected), mock `createJunctionConnection` inserts a fixture record
- [x] T009 [P] [US1] Add `junctionPocKeys` factory to `app/lib/queries/keys.ts`: `{ all: ['junction-poc'], connection: (userId) => [...all, 'connection', userId] }`
- [x] T010 [US1] Create `app/lib/queries/junction-poc.ts` with: `toJunctionConnection()` row mapper (snake_case → camelCase per `data-model.md`), `fetchJunctionConnection(userId)` (selects `id, app_user_id, junction_user_id, connected_at, status, disconnected_at` from `junction_poc_connections` where `app_user_id = userId`), `createJunctionConnection(appUserId, junctionUserId)` — both real Supabase and mock implementations using `isMockMode` guard (depends on T008, T009)
- [x] T011 [US1] Create `app/lib/hooks/useJunctionConnection.ts` with: `useJunctionConnectionStatus(userId)` query hook using `junctionPocKeys.connection(userId)` and `fetchJunctionConnection`; `useJunctionConnect()` mutation that calls the `junction-create-user` Edge Function then calls `createJunctionConnection`, with full optimistic update cycle (`onMutate` snapshot → `onError` rollback → `onSettled` invalidate) (depends on T010)
- [x] T012 [US1] Create `app/components/settings/JunctionGarminSection.tsx` — named export, `className?: string` prop, uses `useAuth`, `useJunctionConnectionStatus`, `useJunctionConnect`, and `useVitalLink({ onSuccess, onExit, onError, env: 'sandbox' })`; **disconnected state**: shadcn `Button` labelled `t('junction.connectButton')` — on click, calls `junction-create-user` Edge Function to get `linkToken` then calls `open(linkToken)`; **connected state**: shadcn `Badge` with `t('junction.connectedBadge')` (placeholder for US3 disconnect button); `onSuccess` callback triggers `useJunctionConnect` mutation to persist the connection (depends on T011)
- [x] T013 [P] [US1] Add `junction.*` i18n keys to `app/i18n/resources/en/common.json` and `app/i18n/resources/pl/common.json` simultaneously: `connectButton`, `connectedBadge`, `disconnectButton`, `disconnectConfirm`, `connecting`, `errorLoad`, `errorConnect`, `errorDisconnect` (see `plan.md` for values)
- [x] T014 [US1] Add `<JunctionGarminSection className="mt-6" />` to `app/components/settings/IntegrationsTab.tsx` — single line addition at the bottom of the rendered output; import `JunctionGarminSection` at the top of the file (depends on T012, T013)

**Checkpoint**: US1 fully functional — connect flow works end-to-end, connection persists, status visible in UI.

---

## Phase 4: User Story 2 — Receive and Store Raw Garmin Workout (Priority: P2)

**Goal**: Junction delivers a Garmin workout webhook → backend verifies Svix signature → raw payload stored in `junction_poc_events` → inspectable in Supabase dashboard.

**Independent Test**: Use Junction sandbox dashboard to send a test `daily.data.workouts.created` event → confirm a new row appears in `junction_poc_events` with correct `junction_user_id`, `event_type`, and full `payload` JSONB → send the same event again and confirm no duplicate row is created.

- [x] T015 [US2] Create `supabase/functions/junction-webhook/index.ts` — public `POST` handler (no JWT auth): (1) read raw request body as text (never parse first), (2) verify Svix signature using `import { Webhook } from 'https://esm.sh/svix@1/webhooks'` and `JUNCTION_WEBHOOK_SECRET` — return `400` on failure, (3) parse verified body as JSON, (4) query `junction_poc_connections` for `junction_user_id = payload.user_id` with `status = 'active'` — return `404` if not found, (5) check `junction_poc_events` for existing `svix_event_id = svix-id header` — return `409` if duplicate, (6) insert into `junction_poc_events` with `junction_user_id`, `svix_event_id`, `event_type`, `payload` (full envelope) — return `500` on DB error so Junction retries, (7) return `200 { "received": true }` — follow CORS pattern from `supabase/functions/strava-webhook/index.ts`

**Checkpoint**: US2 fully functional — all authentic Junction events stored; unauthenticated and duplicate events rejected; inspectable via Supabase dashboard.

---

## Phase 5: User Story 3 — Disconnect Garmin Account (Priority: P3)

**Goal**: User clicks "Disconnect Garmin" and confirms → Junction provider deregistered → `junction_poc_connections` row updated to `disconnected` → UI reverts to connect button.

**Independent Test**: From a connected state, click Disconnect and confirm → `junction_poc_connections` row has `status = 'disconnected'` and `disconnected_at` set → UI shows connect button → further webhook events for that user are rejected with `404`.

- [x] T016 [US3] Create `supabase/functions/junction-disconnect/index.ts` — `POST` handler with JWT auth: (1) verify caller JWT, extract `app_user_id`, (2) fetch active connection from `junction_poc_connections` — return `404` if none, (3) call `DELETE /v2/user/{junction_user_id}/garmin` on Junction API using `JUNCTION_API_KEY` — log but do not fail on non-2xx (connection still considered disconnected for PoC purposes), (4) update `junction_poc_connections` set `status = 'disconnected'`, `disconnected_at = now()` — follow CORS/JSON helper pattern from existing Edge Functions
- [x] T017 [US3] Add `disconnectJunctionConnection(appUserId)` to `app/lib/queries/junction-poc.ts` — updates `status = 'disconnected'` and `disconnected_at` in `junction_poc_connections`; add corresponding mock implementation that mutates mock state; export for independent testing
- [x] T018 [US3] Add `useJunctionDisconnect()` mutation to `app/lib/hooks/useJunctionConnection.ts` — calls `junction-disconnect` Edge Function then calls `disconnectJunctionConnection`; optimistic update: immediately set `status = 'disconnected'` in React Query cache via `onMutate`; rollback in `onError`; invalidate in `onSettled` (depends on T017)
- [x] T019 [US3] Update `app/components/settings/JunctionGarminSection.tsx` — replace the connected-state placeholder with: shadcn `Badge` + shadcn `Button` labelled `t('junction.disconnectButton')`; on click, show `window.confirm(t('junction.disconnectConfirm'))` before calling `useJunctionDisconnect` mutation; show `t('junction.errorDisconnect')` toast on error (depends on T018)

**Checkpoint**: All three user stories fully functional and independently testable.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T020 Run `pnpm typecheck` and fix all TypeScript errors — no `any` types, strict mode must pass
- [x] T021 [P] Verify isolation: run `git diff main -- supabase/migrations app/lib/queries/strava*.ts app/lib/hooks/useStrava*.ts app/components/settings/IntegrationsTab.tsx` and confirm zero changes to existing Strava files and no new foreign keys to `training_sessions` or `strava_*` tables
- [ ] T022 End-to-end verification per `plan.md` Phase 4: connect real Garmin account → sync a real workout → confirm `daily.data.workouts.created` row in `junction_poc_events` table in Supabase dashboard → inspect raw `payload` JSONB

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (T001, T002) — **blocks all user stories**
- **US1 (Phase 3)**: Depends on Foundational complete
- **US2 (Phase 4)**: Depends on Foundational complete (T003, T006 specifically)
- **US3 (Phase 5)**: Depends on US1 complete (reuses query file, hook, and component)
- **Polish (Phase 6)**: Depends on all desired stories complete

### User Story Dependencies

- **US1 (P1)**: After Foundational — no story dependencies
- **US2 (P2)**: After Foundational — no story dependencies (Edge Function only, no frontend)
- **US3 (P3)**: After US1 — extends existing query file, hook, and component

### Within Each User Story

- T008, T009 can run in parallel (different files, both needed by T010)
- T010 must complete before T011
- T011 must complete before T012
- T013 can run in parallel with T007–T012 (translation files only)
- T014 is the final wiring step for US1

---

## Parallel Opportunities

```bash
# Phase 1 — run together:
T001  pnpm add @tryvital/vital-link
T002  Create app/types/junction-poc.ts

# Phase 2 — after Phase 1:
T003  Deploy migration (sequential — others depend on it)
T004  Add API key + base URL secrets        ← parallel with T005
T005  Add webhook secret                    ← parallel with T004
T006  Register webhook URL in Junction dashboard (after T003)

# Phase 3 US1 — after T003:
T007  junction-create-user Edge Function
T008  app/lib/mock-data/junction-poc.ts     ← parallel with T009, T007
T009  junctionPocKeys in keys.ts            ← parallel with T008, T007
T013  i18n keys (en + pl)                  ← parallel with everything in Phase 3
# Then sequentially: T010 → T011 → T012 → T014

# Phase 4 US2 — parallel with US1 if desired:
T015  junction-webhook Edge Function        ← independent of all US1 tasks
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: US1 (T007 → T008/T009 → T010 → T011 → T012/T013 → T014)
4. **STOP and VALIDATE**: Connect real Garmin, confirm `junction_poc_connections` row, confirm UI
5. Demo / share finding

### Incremental Delivery

1. Phases 1 + 2 → foundation ready
2. Phase 3 (US1) → connect flow working → validate
3. Phase 4 (US2) → webhook pipeline → validate via Supabase dashboard
4. Phase 5 (US3) → disconnect flow → validate
5. Phase 6 → typecheck + isolation audit + E2E

---

## Notes

- All new files are prefixed `junction-poc` or live in new directories — zero conflicts with existing files
- `IntegrationsTab.tsx` (T014) is the **only** modification to an existing file
- The Removal Checklist in `plan.md` lists every artefact to delete when the PoC ends
- Confirm `JUNCTION_WEBHOOK_SECRET` value in Junction sandbox dashboard under **Webhooks → Signing Secret** before T006
