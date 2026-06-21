# Tasks: iOS App Wrapper with HealthKit Integration

**Input**: Design documents from `/specs/018-ios-healthkit-wrapper/`
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/ ✅ quickstart.md ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- **[iOS]**: Task is in the `synek-ios` repo (not this one)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Schema migration, Edge Function scaffold, query file, repo bootstrap, bundle ID claim. Establishes the foundation before any user story work.

- [ ] T001 Write `supabase/migrations/018_healthkit_schema.sql` per data-model.md — creates `healthkit_workouts`, `healthkit_sync_status`, adds `sessions.data_sources TEXT[]` with backfill for existing Strava rows, applies RLS policies
- [ ] T002 [P] Add i18n keys for HealthKit UI to `app/i18n/locales/en/integrations.json` and `app/i18n/locales/pl/integrations.json` simultaneously (per AGENTS.md): section title, sync button label, permission denied state, last-synced label, badge label
- [ ] T003 [P] Add `healthkitSync` and `healthkitStatus` query key factories to `app/lib/queries/keys.ts`
- [ ] T004 [P] [iOS] Bootstrap new `synek-ios` GitHub repo with `.gitignore` (Xcode template), `README.md` (links back to this spec), `LICENSE` (MIT), GitHub Actions workflow file `.github/workflows/test.yml` running `xcodebuild test`
- [ ] T005 [P] [iOS] Create Xcode project `Synek.xcodeproj` — iOS App target, SwiftUI, Swift 6, iOS 16.0 minimum, bundle ID `app.synek.ios`, automatic signing using free Apple ID (personal team). Note: free-tier provisioning expires every 7 days — reinstall via Xcode when cert expires
- [ ] T006 Claim bundle ID `app.synek.ios` in developer.apple.com (deferred — requires paid Apple Developer account; free Apple ID can still install on personal device without claiming a global bundle ID, but the ID becomes binding once a paid account is created later). For V1 PoC, skip this task; revisit when paying for the account.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Bridge contract implementation, Edge Function with auth + Zod validation, WKWebView shell with cookie persistence verified. Both repos must reach a working state where they can call each other.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Web side

- [ ] T010 Create `supabase/functions/healthkit-sync/index.ts` — mirror structure of `strava-auth`: verify JWT via `anonClient.auth.getUser(jwt)`, accept `{ workouts: HealthKitWorkout[] }` body, validate with Zod, upsert into `healthkit_workouts` with `ON CONFLICT (uuid) DO UPDATE`, update `healthkit_sync_status` row, run matching against `sessions` (same calendar day + matching activity type), return `{ uploaded, matched, lastSyncedAt }`
- [ ] T011 [P] Create `scripts/supabase-deploy-healthkit-sync.sh` — mirror `scripts/supabase-deploy-strava.sh` pattern
- [ ] T012 [P] Create `app/lib/queries/healthkit-sync.ts` with **mock implementation first** (per Principle IV) then real implementation: `syncHealthKitWorkouts(workouts) → SyncResult`, `getHealthKitSyncStatus(userId) → HealthKitSyncStatus`. Include Zod schemas for HealthKitWorkout, HealthKitSyncStatus, SyncResult
- [ ] T013 [P] Create `app/lib/hooks/useHealthKitBridge.ts` — typed wrapper around `window.__healthkit.call()` with Zod validation on each result; exposes `isAvailable`, `requestAuth()`, `fetchWorkouts(sinceMs)`, `getStatus()`
- [ ] T014 [P] Create `app/lib/hooks/useHealthKitConnection.ts` mirroring `useStravaConnection.ts` — `useHealthKitSyncStatus`, `useHealthKitSync` mutation (onMutate / onError / onSettled), composed on top of `useHealthKitBridge` for the device call and `app/lib/queries/healthkit-sync.ts` for the server call
- [ ] T015 [P] Create `app/lib/utils/healthkit-activity-map.ts` per data-model.md (HK rawValue → synek training-type ID)
- [ ] T016 Add `data_sources` field to session row mapper in `app/lib/queries/sessions.ts` and to the `Session` TypeScript type

### iOS side

- [ ] T020 [iOS] Create `WebViewContainer.swift` (SwiftUI `UIViewRepresentable`) wrapping `WKWebView`, using `WKWebsiteDataStore.default()` (NOT ephemeral). Load URL from `Info.plist` `SYNEK_WEB_URL` key
- [ ] T021 [iOS] Implement `BridgeMessageHandler.swift` conforming to `WKScriptMessageHandler` — routes by `action`, validates `requestId`, replies via `evaluateJavaScript("window.__healthkit._resolve(...)")`
- [ ] T022 [iOS] Inject web shim from `contracts/healthkit-bridge.md` as `WKUserScript` at `injectionTime: .atDocumentStart`
- [ ] T023 [iOS] Implement `HealthKitBridge.swift` — wraps `HKHealthStore`, exposes `requestAuth()`, `fetchWorkouts(since: Date)`, `getStatus()`. Use `HKSampleQueryDescriptor` async API. Returns `Codable` DTOs matching the wire format
- [ ] T024 [iOS] Implement `HealthKitActivityMap.swift` mirroring the web mapping exactly
- [ ] T025 [iOS] Create `Info.plist` entries: `NSHealthShareUsageDescription` (specific per FR-012), `SYNEK_WEB_URL`, debug-only ATS exception for `localhost` / `*.local`
- [ ] T026 [iOS] Enable HealthKit capability in Signing & Capabilities; verify `Synek.entitlements` contains `com.apple.developer.healthkit`
- [ ] T027 [iOS] Implement `WKNavigationDelegate` to intercept external-link navigation: in-domain navigation stays in webview, external HTTPS opens in `SFSafariViewController`, OAuth flows are caught and rejected with explicit message (V2 will use `ASWebAuthenticationSession`)
- [ ] T028 [iOS] Add XCTest cases for `BridgeMessageHandler` (action routing, error format) and for `HealthKitActivityMap` (mapping table covers all enum cases listed in spec)

### Validation gate

- [ ] T030 **GATE: Bridge handshake verified end-to-end**. Web side: open Safari Web Inspector connected to simulator, execute `await window.__healthkit.call('getAppInfo')`, must return `{version, build, os}`. Web side: execute `await window.__healthkit.call('getStatus')`, must return `{available, permission}`. If either fails, fix before continuing to Phase 3.

---

## Phase 3: User Story 1 — Open Synek as a Native iOS App (Priority P1)

**Goal**: User can install the app, log in with email/password, and use synek as a native experience.

**Independent Test**: Install, log in, kill app, relaunch — still logged in.

### Implementation

- [ ] T040 [iOS] Add navigation handling: `WKNavigationDelegate` blocks navigation to non-synek hosts; web in-app links stay in webview
- [ ] T041 [iOS] Add a thin loading state UI (SwiftUI `ProgressView`) shown while WKWebView is loading the initial URL
- [ ] T042 [iOS] Configure WKWebView with appropriate viewport (no zoom, content-inset for status bar / home indicator)
- [ ] T043 [iOS] Handle pull-to-refresh: enable on root navigation only, reloads `SYNEK_WEB_URL`
- [ ] T044 [iOS] Add error state: if initial load fails (no network), show retry UI with "Retry" button

### Validation gate

- [ ] T050 Execute manual test plan from `quickstart.md` steps 1-3. Document each in a brief note.
- [ ] T051 **GATE: Auth persists across 5 cold-starts** (force-quit + relaunch). If session resets, debug `WKWebsiteDataStore` before continuing.

**Checkpoint**: At this point US1 should be fully functional and independently deliverable. The app is usable as a "synek as a native app" experience without any HealthKit features.

---

## Phase 4: User Story 2 — Manually Sync Apple Watch Workouts (Priority P1)

**Goal**: User can grant HK permission and sync workouts to synek.

**Independent Test**: Record AW workout, tap Sync, see workout appear in synek.

### Web UI

- [ ] T060 Create `app/components/settings/HealthKitSection.tsx` mirroring the pattern of `JunctionGarminSection.tsx` — self-contained section component. Import it into `app/components/settings/IntegrationsTab.tsx` alongside the existing sections. Conditionally render content based on `useHealthKitBridge().isAvailable` (returns null / placeholder when bridge unavailable so the section still slots into the tab gracefully outside the iOS app)
- [ ] T061 `HealthKitSection` content: "Sync from Apple Watch" button. On click: call `requestAuth()`, then `fetchWorkouts(sinceMs)` where `sinceMs = status.lastSyncedAt ?? Date.now() - 90*86400_000`, then POST to `syncHealthKitWorkouts(workouts)` via the query file. Show optimistic loading state per Principle IV (onMutate → onError → onSettled). Use a new `useHealthKitConnection` hook in `app/lib/hooks/useHealthKitConnection.ts` mirroring `useStravaConnection`.
- [ ] T062 [P] Add permission-denied state UI: when `getStatus().permission === 'denied'`, show guidance "Enable in iOS Settings → Privacy → Health → Synek" with a button that calls a new bridge action `openSettings()` (defer this bridge action to T065 if it adds scope) OR uses a plain text instruction in V1
- [ ] T063 [P] Add success state: shows uploaded count, matched count, last-synced timestamp
- [ ] T064 [P] Add error toast on sync failure

### iOS

- [ ] T065 [iOS] Implement `fetchWorkouts(since:)` in `HealthKitBridge.swift` — `HKSampleQueryDescriptor` + per-workout HR average via `HKStatisticsQuery`, returns DTOs
- [ ] T066 [iOS] Implement `requestAuth()` — `HKHealthStore.requestAuthorization(toShare: [], read: types)` where types are exactly those listed in FR-002

### Edge Function

- [ ] T070 Implement workout matching logic in `supabase/functions/healthkit-sync/index.ts`: for each workout, find a session on the same calendar day (in athlete timezone — read from `profiles.timezone`) with a matching `training_type`. If found AND that session doesn't already have Strava actuals, populate actuals from the workout; add `'healthkit'` to `data_sources` array regardless.
- [ ] T071 Edge Function: increment `healthkit_sync_status.total_synced_count` by the count of NEW (non-duplicate) workouts; update `last_synced_at` to NOW().
- [ ] T072 Edge Function: return `{ uploaded: count, matched: count, lastSyncedAt: iso }`.

### Tests

- [ ] T075 Unit test the matching logic with mock data (same-day, different-day, type-mismatch, Strava-already-present cases)
- [ ] T076 [iOS] XCTest: `HealthKitBridge.fetchWorkouts(since:)` returns expected DTO shape from a stubbed `HKHealthStore` (use a protocol abstraction over `HKHealthStore` to enable stubbing)

### Validation gate

- [ ] T080 Execute manual test plan from `quickstart.md` steps 4-9 on a physical device with real Apple Watch data
- [ ] T081 **GATE: Dedup verified**. Run sync twice consecutively; second run uploads 0 new workouts.
- [ ] T082 **GATE: Matching verified**. Create a planned session for tomorrow, complete a matching AW workout tomorrow, sync — session shows the actuals.

**Checkpoint**: US2 fully functional. App now delivers its core value.

---

## Phase 5: User Story 3 — View HealthKit Sync Status (Priority P2)

**Goal**: User sees sync status in Integrations tab; sessions show HealthKit badge when applicable.

### Implementation

- [ ] T090 In `IntegrationsSection.tsx`, render `lastSyncedAt` and `totalSyncedCount` from `useHealthKitStatus()` hook
- [ ] T091 [P] Surface `useHealthKitSyncStatus` (created in T014) in the section UI — reads from `healthkit_sync_status` table via the query file
- [ ] T092 [P] Add HealthKit badge component (`HealthKitBadge.tsx`) — shows alongside existing Strava badge in session detail
- [ ] T093 [P] Render badge in session detail when `session.data_sources` includes `'healthkit'`

### Tests

- [ ] T095 Mock store for `healthkit_sync_status` exposing seeded data for tests
- [ ] T096 Unit test: badge renders when source included, hidden when not

### Validation gate

- [ ] T100 Execute manual test plan from `quickstart.md` steps 10-12

**Checkpoint**: US3 complete. Feature is feature-complete for V1.

---

## Phase 6: Polish & Distribution (V1 PoC scope)

V1 PoC ships only to the developer's own device — no TestFlight upload, no App Store submission. Tasks below cover documentation, verification, and local device install.

- [ ] T110 [iOS] Build & install to personal iPhone via Xcode (`Cmd+R` with device selected). Trust developer profile under Settings → General → VPN & Device Management on first install. Reinstall weekly when free-tier cert expires (7-day window).
- [ ] T111 [P] Update `docs/architecture/overview.md` with a brief HealthKit integration section linking back to this spec
- [ ] T112 [P] Update `docs/00-start-here.md` documentation map to include the iOS spec
- [ ] T113 Run `pnpm verify` (full gate including Edge Function check) on the web side
- [ ] T114 [iOS] Confirm no `print()` left in shipping code paths
- [ ] T115 Tag a release on the synek main repo: `v0.X.0-ios-v1`
- [ ] T116 Tag the corresponding `synek-ios` commit: `v1.0.0`

### Deferred to "ready for testers" milestone (post-PoC)

- [ ] D001 Sign up for Apple Developer account ($99/yr)
- [ ] D002 [iOS] Claim bundle ID `app.synek.ios` globally in developer.apple.com (was T006)
- [ ] D003 [iOS] Increment `CFBundleVersion` for first TestFlight build
- [ ] D004 [iOS] Archive and upload to TestFlight via Xcode Organizer
- [ ] D005 [iOS] Add internal testers in App Store Connect
- [ ] D006 [iOS] Write TestFlight release notes: V1 scope, email/password only (no Google), manual sync only

---

## Dependency Graph (high level)

```
Phase 1 (Setup)
   ↓
Phase 2 (Foundational) — bridge + edge function must both work end-to-end
   ↓
   ├── Phase 3 (US1: Webview wrapper) ──┐
   └── Phase 4 (US2: Manual sync) ──────┤
                                         ↓
                                   Phase 5 (US3: Status display)
                                         ↓
                                   Phase 6 (Polish & TestFlight)
```

US1 and US2 share the bridge but otherwise are independent — could be developed in parallel by two people if available. US3 depends on US2's data being available.

---

## Effort estimate (rough, single developer)

| Phase                  | Effort      |
| ---------------------- | ----------- |
| 1. Setup               | 0.5 day     |
| 2. Foundational        | 1.5 days    |
| 3. US1                 | 0.5 day     |
| 4. US2                 | 1.5 days    |
| 5. US3                 | 0.5 day     |
| 6. Polish & TestFlight | 0.5 day     |
| **Total (V1)**         | **~5 days** |

Add ~30-50% buffer for first-time Swift / Xcode quirks (signing, provisioning, simulator weirdness) if the developer is new to iOS.

---

## Notes for implementers

- Cross-repo coordination: when a contract change is needed, update `contracts/healthkit-bridge.md` in this repo FIRST, then PR both repos with the synchronized changes.
- The web side can run end-to-end against a Zod-validated mock of the bridge (no iOS needed) — use this for fast iteration on the UI.
- The iOS side can be tested in isolation by pointing `SYNEK_WEB_URL` at a `data:` URL containing a minimal test page that exercises the bridge.
- HealthKit testing on simulator is NOT representative — workouts are essentially empty. Plan for physical device time.
- Apple's HealthKit review is strict about usage strings — do NOT change them ad-hoc after first submission.
