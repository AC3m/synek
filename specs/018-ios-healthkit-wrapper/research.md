# Research: iOS App Wrapper with HealthKit Integration

**Feature**: 018-ios-healthkit-wrapper
**Date**: 2026-05-16

---

## 1. Wrapper Technology Selection

### Decision

**Native Swift + `WKWebView`**, in a separate repository (`synek-ios`).

### Alternatives evaluated

| Option                                        | Why rejected                                                                                                                                                                                                                                                                            |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Capacitor + `perfood/capacitor-healthkit`** | Plugin last released Feb 2025 (~15 months stale), no LICENSE file, single maintainer. Capacitor adds an npm dep, plugin layer, and `cap sync` build step for what amounts to a one-call native bridge in our case. Forking the plugin is comparable effort to writing ~50 LOC of Swift. |
| **React Native + `react-native-health`**      | Adds full RN runtime (Hermes + bridge + Metro bundler) — ~25 MB binary baseline — for one native call. Two JS contexts (RN + WebView) complicate the bridge with no payoff when there are no native UI screens planned.                                                                 |
| **Tauri Mobile 2.0**                          | Mobile support is still maturing as of 2026; no mature HealthKit Rust crate. Forces Rust on a team that doesn't use it. Premature for production.                                                                                                                                       |
| **Vital iOS SDK**                             | Originally a strong fit because Vital was a paid dep, but Vital is being removed from the stack (decision 2026-05). No remaining reason to introduce a vendor SDK.                                                                                                                      |
| **PWA + "Health Auto Export"**                | Third-party app the user must install, configure, and pay for separately. Unacceptable UX for a real product.                                                                                                                                                                           |
| **NativeScript / Flutter**                    | Neither uses webview as primary renderer; would require rebuilding synek's UI. Off-table for "wrapper".                                                                                                                                                                                 |

### Rationale

For a webview + single native bridge (HealthKit), native Swift is the simplest possible stack:

- Zero npm dependencies, zero SPM dependencies — only Apple-provided frameworks (`WebKit`, `HealthKit`, `AuthenticationServices`)
- Smallest binary (~5 MB vs ~25 MB for RN)
- No plugin maintenance risk
- Bridge is one `WKScriptMessageHandler` (web→native) + one `evaluateJavaScript` (native→web)
- Apple platform code naturally lives in Xcode; nothing about wrapping it in Capacitor adds value

The tradeoff (requires Swift skill) is acceptable: ~150 LOC of Swift is a one-time write, with no ongoing dependency churn.

---

## 2. JavaScript ↔ Native Bridge Design

### Decision

- **Web → Native**: `window.webkit.messageHandlers.healthkit.postMessage({ action, requestId, ...args })`. Native side implements `WKScriptMessageHandler` and routes by `action`.
- **Native → Web**: After action completes, native calls `webView.evaluateJavaScript("window.__healthkit._resolve('<requestId>', <result>, <err>)")`.
- **Correlation**: Each request includes a `requestId` (web-generated `crypto.randomUUID()`); native echoes it back in the resolve call.
- **Injection point**: A `WKUserScript` with `injectionTime: .atDocumentStart` defines `window.__healthkit` before any page script runs, so the web app can detect the bridge during initial render.

### Why not message-channel via `WKWebView.postMessage`

`WKWebView` does not natively expose a `BroadcastChannel`-style two-way API. The official documented path is exactly what's chosen above; trying to invent a richer abstraction (e.g. wrapping each direction in a fake `MessagePort`) buys nothing and obscures debugging.

### Error handling

Native rejects the promise by passing a non-null `err` argument: `{ code: 'permission_denied' | 'hk_unavailable' | 'internal', message: string }`. Web side maps codes to user-friendly i18n strings.

---

## 3. Authentication in WKWebView

### Decision

- **Email/password Supabase login**: works inside WKWebView when `WKWebsiteDataStore.default()` is used (non-ephemeral). Supabase JS persists session to `localStorage`, which survives app cold-starts.
- **Google OAuth**: deferred to V2. Google explicitly blocks OAuth flows in embedded webviews since 2021. V2 will integrate `ASWebAuthenticationSession` and intercept the redirect deeplink to deliver the auth code back to Supabase.

### Findings during codebase inspection

- `app/lib/supabase.ts` creates a default Supabase client — uses `localStorage` by default for session persistence ✅
- `app/lib/auth.ts:25` uses `sessionStorage` for a quick `synek_user_id` lookup — this clears on app kill, but the Supabase session (`localStorage`) does NOT. The `AuthContext` re-hydrates user from Supabase session on app launch, so the sessionStorage gap is invisible to the user.
- `app/lib/queries/auth-callbacks.ts` handles Google OAuth via `supabase.auth.signInWithOAuth({ provider: 'google' })` — uses redirect flow, blocked in WKWebView.

### Validation gate (Step 1)

Manual test: log in with email/password, force-kill app, relaunch — user must remain logged in. If not, debug `WKWebsiteDataStore` configuration before continuing.

---

## 4. HealthKit Data Model & Query API

### Decision

Use `HKSampleQueryDescriptor` (iOS 16+, async/await) to query `HKWorkout` samples. Iterate workouts and fetch associated samples (heart rate, route) per workout as needed.

### Workout fields fetched (V1)

- `workout.uuid` (UUID, primary key)
- `workout.workoutActivityType` (HKWorkoutActivityType enum → synek training-type via mapping)
- `workout.startDate`, `workout.endDate`, `workout.duration`
- `workout.statistics(for: HKQuantityType.distanceWalkingRunning / .distanceCycling)` (meters)
- `workout.statistics(for: HKQuantityType.activeEnergyBurned)` (kcal)
- Average HR via separate `HKStatisticsQuery` over the workout's date range (bpm)
- `workout.sourceRevision.source.name` (device name — "Artur's Apple Watch")

### Deferred to V2

- Workout route (`HKWorkoutRoute` + GPS polyline)
- Heart rate samples timeline (vs single average)
- Splits / laps (`HKWorkoutEvent`)

### Rationale

V1 covers the fields synek already supports for Strava (duration, distance, average HR, calories). Anything richer is a UI build-out separate from this spec.

---

## 5. Activity Type Mapping

### Decision

Maintain a hardcoded mapping table from `HKWorkoutActivityType` (Apple enum) to synek's internal training-type IDs (the ones defined in `app/lib/utils/training-types.ts`).

### Why hardcoded vs server-driven

- Mapping is small (~15 entries)
- New Apple workout types appear once per iOS release (~1/year); a code change per release is acceptable
- Server-driven would require an additional Edge Function call before every sync — premature

### Coverage (V1)

At minimum, mappings for: running, walking, hiking, cycling (outdoor + indoor), swimming, rowing, elliptical, functionalStrengthTraining, traditionalStrengthTraining, yoga, mixedCardio, highIntensityIntervalTraining. Unknown types fall through to `other`.

### Cross-repo sync

The mapping lives in two places:

- `synek-ios/Synek/HealthKitActivityMap.swift` (HKWorkoutActivityType.rawValue → string ID)
- `app/lib/utils/healthkit-activity-map.ts` (string ID → synek training-type ID)

The string IDs are the contract. Adding a new type requires updating both files. Documented in the contract.

---

## 6. Storage Schema (Supabase)

### Decision

Two new tables: `healthkit_workouts` (per-workout data, primary key `uuid`) and `healthkit_sync_status` (one row per user, sync metadata). See [data-model.md](./data-model.md).

### Why not extend `sessions`

- Workouts can exist with no matching planned session (e.g. impromptu run)
- Provenance must be preserved (HealthKit vs Strava vs manual entry)
- Bloating `sessions` with HK-specific columns violates lean-purposeful principle

### Matching strategy

Mirror Strava: same calendar day (athlete timezone) + matching activity type → populate session's actual fields. If a session already has Strava actuals, HealthKit data is stored but does NOT overwrite (a `data_sources` JSON array on the session records which sources reported it).

---

## 7. Distribution & Signing

### Decision

**V1 PoC**: direct install to developer's own iPhone via free Apple ID personal team (`Cmd+R` from Xcode). 7-day cert; reinstall weekly. Max 3 apps signed at once with a personal team.

**Post-PoC**: TestFlight when paid Apple Developer account is acquired. App Store submission deferred until at least 5 internal users have used the app for 2 weeks without blocking issues.

### Apple Developer account

Required for TestFlight. $99/yr. Not required for simulator-only development or short-lived (7-day) free-tier device installs. **V1 PoC explicitly defers paid account signup** — installs go to developer's own iPhone via free Apple ID. Sign-up triggered when ready to invite real testers (post-PoC).

### Bundle ID

`app.synek.ios` (chosen by user 2026-05-16). Reverse of the `synek.app` domain. Same ID used locally during PoC; globally claimed via developer.apple.com only after paid account is acquired. Switching the ID later is a multi-step pain — picking it correctly now avoids that.

### Provisioning

Automatic signing in Xcode using the developer account team. HealthKit capability is auto-added to provisioning profile when the entitlement is enabled in the project.

---

## 8. Build & CI

### Decision

- **Local builds**: Xcode 16+, manual `Cmd+R` and `Product → Archive`
- **CI**: GitHub Actions on `synek-ios` repo — runs `xcodebuild test` on every PR. Build for TestFlight is manual via Xcode Organizer in V1 (CI-driven Fastlane setup deferred to V2)
- **Web build**: synek web stays on Vercel — iOS app loads production URL or dev URL based on build config

### Why manual TestFlight upload

Fastlane / EAS-style automated upload is a real time investment (~half a day) and overkill for a sub-weekly release cadence in the early phase.

---

## 9. Security & Privacy

### Decisions

- HealthKit data is sent only to the `healthkit-sync` Edge Function, authenticated by the user's Supabase JWT
- No third-party analytics SDKs in the iOS app (V1) — telemetry can be added in V2 if needed, with explicit user consent
- HK usage strings in `Info.plist` are specific (FR-012) — "Synek reads your workouts, heart rate, distance, and energy to populate your training log"
- App Transport Security defaults to HTTPS-only; dev mode exception narrowly allows `localhost` and `*.local`
- No HealthKit write permissions requested in V1 (read-only)

### Apple review compliance

Apple's HealthKit review checks for:

1. Specific usage strings ✅ (FR-012)
2. Privacy policy URL in App Store listing ✅ (synek.app/privacy)
3. No selling/sharing HK data ✅ (only ingested into user's own synek account)
4. No HK data used for advertising ✅ (no ads)
5. Read-only is preferred over write ✅ (V1 is read-only)
