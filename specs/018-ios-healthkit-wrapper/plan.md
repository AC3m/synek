# Implementation Plan: iOS App Wrapper with HealthKit Integration

**Branch**: `018-ios-healthkit-wrapper` | **Date**: 2026-05-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/018-ios-healthkit-wrapper/spec.md`

## Summary

Build a thin native iOS app in Swift that wraps the existing synek web SPA in a `WKWebView`, exposes a JavaScript bridge for HealthKit access, and ships a manual "Sync from Apple Watch" button in the existing Integrations settings tab. V1 is fully user-initiated (no background sync). The iOS app lives in a separate repository (`synek-ios`); changes inside this repository are limited to: (a) a new Supabase Edge Function `healthkit-sync`, (b) the `healthkit_workouts` / `healthkit_sync_status` tables and RLS policies, (c) a small UI addition in `app/components/settings/IntegrationsSection.tsx` to render the Apple Watch section when the bridge is present, (d) a query file `app/lib/queries/healthkit-sync.ts` (mock + real).

This plan covers the synek-side work AND the iOS-side scaffolding plus bridge contract. The bridge contract is the integration seam — both repos must agree.

## Technical Context

**Language/Version (web side)**: TypeScript 5 (strict) + React 19
**Language/Version (iOS side)**: Swift 6, iOS 16.0 minimum, Xcode 16+
**Primary Dependencies (web)**: React Router 7 (SPA), TanStack Query 5, Supabase JS 2, shadcn/ui, i18next, Zod 4
**Primary Dependencies (iOS)**: WebKit, HealthKit, AuthenticationServices — all Apple-provided. Zero third-party Swift packages.
**Storage**: PostgreSQL via Supabase (new tables `healthkit_workouts`, `healthkit_sync_status`); Supabase Edge Function `healthkit-sync` for upsert
**Testing (web)**: Mock mode; `pnpm typecheck`; Vitest
**Testing (iOS)**: XCTest for bridge serialization; manual testing on physical iPhone + Apple Watch for HK flow
**Target Platform**: iOS 16.0+; iPhone only (no iPad-specific layout in V1); production hosting at synek.app
**Project Type**: Cross-repo — web SPA + native iOS shell + Supabase Edge Function
**Performance Goals**: App cold-start to interactive <2s; sync of 10 workouts <5s; bridge round-trip <100ms
**Constraints**: HealthKit data never leaves user's device except to the `healthkit-sync` Edge Function over HTTPS; HK usage strings must be specific; Google OAuth blocked in WKWebView (email/password only in V1); cookies/localStorage MUST persist via `WKWebsiteDataStore.default()`
**Scale/Scope**: Per-user data; typical sync window <100 workouts; no team/coach data flows in V1

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                               | Status  | Notes                                                                                                                                                                                                                                                                 |
| --------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Lean & Purposeful                    | ✅ PASS | V1 strictly scoped: webview + manual sync. No background sync, no Android, no Apple Pay. Sync button reuses existing Integrations tab — no new settings route.                                                                                                        |
| II. Configuration Over Hardcoding       | ✅ PASS | iOS app reads target URL from `Info.plist` per build configuration (`Debug` → `http://<dev-host>:5173`, `Release` → `https://synek.app`). Activity-type mapping (`HKWorkoutActivityType` → synek training-type) lives in a single config file mirrored on both sides. |
| III. Type Safety & Boundary Validation  | ✅ PASS | Bridge messages validated with Zod on the web side before crossing into core logic. Edge Function validates `HealthKitWorkout[]` payload with Zod. Swift uses `Codable` types for type-safe JSON.                                                                     |
| IV. Modularity & Testability            | ✅ PASS | `healthkit-sync` query file ships mock + real implementations. iOS `HealthKitBridge` is a pure class testable with XCTest using a stubbed `HKHealthStore`. Mutation uses standard `onMutate`/`onError`/`onSettled`.                                                   |
| V. Performance & Operational Discipline | ✅ PASS | Zero new web bundle dependencies (web code is platform-agnostic; bridge detection is one-line `typeof` check). Edge Function uses Zod (already a dep). Native Swift has zero npm/SPM third-party packages.                                                            |

**Post-design re-check**: All principles remain satisfied. The cross-repo split is justified because Apple platform code cannot live in a TypeScript SPA repo. The bridge contract (`contracts/healthkit-bridge.md`) is the single source of truth keeping both repos aligned.

## Complexity Tracking

| Violation                                                      | Why Needed                                                                                                                    | Simpler Alternative Rejected Because                                                                                                                                                                                                                |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New iOS Xcode project (separate repo `synek-ios`)              | Apple platform code cannot ship inside this TS/React repo; HealthKit requires native Swift with signed entitlements           | Capacitor/React Native wrappers were evaluated and rejected: heavier runtime, additional plugin maintenance burden, more dependency rot, larger bundle. For a webview-plus-HK use case the native shell is the simplest path. See `research.md` §1. |
| New `healthkit-sync` Edge Function                             | Workouts must be authenticated by JWT and validated server-side before write; client SPA must not have service-role access    | Direct Supabase REST upsert from web would require RLS policies on the workouts table; an Edge Function is the same pattern as `strava-auth` and reuses the existing auth verification helper.                                                      |
| Two new tables (`healthkit_workouts`, `healthkit_sync_status`) | Workout source provenance must be preserved (Strava vs HealthKit) to avoid overwriting Strava data; sync status drives the UI | Extending `sessions` directly was rejected: data shape differs (workouts can exist without a planned session) and provenance metadata would bloat the row.                                                                                          |
| Google OAuth deferred (email/password only in V1)              | Google blocks OAuth in embedded WKWebViews since 2021 — requires `ASWebAuthenticationSession` integration                     | Implementing ASWebAuth in V1 adds Swift complexity and a deeplink redirect contract; deferring keeps V1 minimal. Documented as a V2 follow-up.                                                                                                      |

## Phase 0: Research

See [research.md](./research.md) for full details. Key decisions:

1. **Wrapper technology**: Native Swift + `WKWebView`. (Rejected: Capacitor, React Native, Tauri, Vital iOS SDK.)
2. **Bridge mechanism**: `WKScriptMessageHandler` (web→native) + `evaluateJavaScript` (native→web), request/response correlated by UUID.
3. **Activity-type mapping**: Hardcoded mapping table mirrored in `app/lib/utils/training-types.ts` (web) and `HealthKitActivityMap.swift` (iOS); both reference the same canonical synek training-type IDs.
4. **Auth approach**: Email/password only in V1 via Supabase auth in WKWebView with `WKWebsiteDataStore.default()`. Google OAuth deferred to V2 via `ASWebAuthenticationSession`.
5. **Distribution**: V1 PoC = direct install to developer's own iPhone via free Apple ID personal team (7-day cert; reinstall weekly). TestFlight when paid Developer account is obtained. App Store submission deferred until first 5 internal users have validated.
6. **Dedup strategy**: `HKWorkout.uuid` is stable per-device — used as primary key on `healthkit_workouts`.

## Phase 1: Design

See [data-model.md](./data-model.md) for schema and [contracts/healthkit-bridge.md](./contracts/healthkit-bridge.md) for the JS↔Swift bridge contract.

### Cross-repo split

| Concern                                       | Lives in                                                                   | Notes                                                        |
| --------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Xcode project, Swift code                     | New repo `synek-ios` (MIT license)                                         | Branch `main` only; CI via GitHub Actions for build + XCTest |
| HealthKit bridge contract                     | This repo: `specs/018-ios-healthkit-wrapper/contracts/healthkit-bridge.md` | Canonical — iOS repo references back here                    |
| Supabase migration `018_healthkit_schema.sql` | This repo: `supabase/migrations/`                                          | Standard migration flow                                      |
| Edge Function `healthkit-sync`                | This repo: `supabase/functions/healthkit-sync/`                            | Mirrors `strava-auth` structure                              |
| Web UI (Apple Watch section in Integrations)  | This repo: `app/components/settings/`                                      | Conditionally rendered based on bridge detection             |
| Query file `healthkit-sync.ts` (mock + real)  | This repo: `app/lib/queries/`                                              | Mock-first per Principle IV                                  |
| i18n keys                                     | This repo: `app/i18n/locales/{en,pl}/`                                     | EN + PL added together per AGENTS.md                         |

### Bridge contract (summary)

Web calls: `window.__healthkit.call(action, args) → Promise<result>`

- `requestAuth() → { granted: boolean }`
- `fetchWorkouts({ sinceMs: number }) → { workouts: HealthKitWorkout[] }`
- `getStatus() → { permission: 'granted'|'denied'|'not_determined', available: boolean }`
- `getAppInfo() → { version: string, build: string }`

Errors return `{ code: string, message: string }` and reject the promise. See contract doc for full schema.

## Phase 2: Tasks

See [tasks.md](./tasks.md) for the full dependency-ordered task list.

High level:

- **Phase 1 Setup**: migration, edge function scaffold, i18n keys, query file (mock+real), `synek-ios` repo bootstrap, bundle ID claim
- **Phase 2 Foundational**: Edge Function with auth + Zod validation; iOS WKWebView shell with cookie persistence verified; bridge handshake working both directions
- **Phase 3 US1 (Webview wrapper)**: full auth flow inside app, link interception, external-link routing
- **Phase 4 US2 (Manual sync)**: HK permission flow, fetchWorkouts implementation, web button, end-to-end sync, dedup & matching
- **Phase 5 US3 (Status display)**: status query, badges on session details
- **Phase 6 Polish**: TestFlight upload, App Store metadata draft, telemetry hooks

## Risks & Mitigations

| Risk                                                       | Likelihood | Impact                              | Mitigation                                                                                                                                 |
| ---------------------------------------------------------- | ---------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Apple rejects HealthKit usage strings as vague             | Medium     | High (blocks distribution)          | Write specific strings up-front (FR-012); review against Apple guidelines before submission                                                |
| WKWebView loses Supabase session across cold-starts        | Medium     | High (forces re-login every launch) | Use `WKWebsiteDataStore.default()` (not ephemeral); verify in Step 1 validation gate; fallback = persist refresh token via Keychain bridge |
| Google OAuth users cannot log in to V1                     | Certain    | Medium (some users affected)        | Document clearly in TestFlight notes; V2 ships ASWebAuthenticationSession                                                                  |
| `HKObserverQuery` skipped in V1 means stale data           | Certain    | Low (sync button is one tap)        | Acceptable per scope decision; track real usage to decide V2 priority                                                                      |
| iOS 17/18-only HK sample types missing from V1 mapping     | Low        | Low                                 | Mapping table is extensible; new types fall through to "other" bucket                                                                      |
| Supabase Edge Function rate limits during initial backfill | Low        | Medium                              | Edge Function processes batches of 50 workouts; client paginates                                                                           |
| Bridge UUID collisions or message ordering bugs            | Low        | Medium                              | XCTest covers serialization; web side uses `crypto.randomUUID()`; reject if no pending request found                                       |

## Out of Scope (V1)

- Background sync via `HKObserverQuery` and `enableBackgroundDelivery` (deferred to V2)
- Android app (separate future spec)
- Apple Watch companion app (no native watchOS UI — workouts are recorded by user's preferred AW app)
- Push notifications
- Google OAuth login in app (V2)
- iPad-optimised layout (uses iPhone scaled layout in V1)
- App Store submission (TestFlight only for V1)
- Write access to HealthKit (read-only in V1; writing planned workouts back to HK is a V3+ consideration)
