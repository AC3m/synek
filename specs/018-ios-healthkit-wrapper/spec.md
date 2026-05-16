# Feature Specification: iOS App Wrapper with HealthKit Integration

**Feature Branch**: `018-ios-healthkit-wrapper`
**Created**: 2026-05-16
**Status**: Draft
**Input**: User description: "Create an iOS app wrapper for synek using native Swift + WKWebView. Main purpose is to integrate with HealthKit to fetch data from Apple Watch trainings. V1 uses a manual sync button. Background sync is deferred to V2."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Open Synek as a Native iOS App (Priority: P1)

An athlete installs the Synek iOS app from TestFlight on their iPhone, opens it, logs in with their email and password, and uses Synek exactly as they would on the web — viewing sessions, planning, charts. The app is a thin native shell around the existing web application.

**Why this priority**: Foundation for every other native capability. Without a working webview that preserves auth and renders the SPA correctly, HealthKit integration has nowhere to display results.

**Independent Test**: Install the iOS app on a physical device, log in with email/password, navigate to the dashboard, kill the app, relaunch — user remains logged in and lands on the same dashboard.

**Acceptance Scenarios**:

1. **Given** the app is installed and launched for the first time, **When** the user opens it, **Then** the synek.app landing page renders inside the app exactly as in mobile Safari.
2. **Given** the login screen is shown, **When** the user enters valid email/password credentials, **Then** they are signed in and reach their dashboard.
3. **Given** a logged-in user, **When** they fully kill the app (swipe up from app switcher) and relaunch, **Then** they remain logged in and reach the same route they were on (or dashboard fallback).
4. **Given** any synek page is open, **When** the user taps internal links, **Then** navigation occurs inside the webview (no external Safari handoff).
5. **Given** the user taps an external link (e.g. Strava OAuth), **When** the link points to a non-synek domain, **Then** it opens in the system browser (`ASWebAuthenticationSession` for OAuth) and returns control to the app after completion.

---

### User Story 2 - Manually Sync Apple Watch Workouts (Priority: P1)

An athlete who has completed runs and other trainings on their Apple Watch opens the Synek iOS app, navigates to Settings → Integrations, and taps "Sync from Apple Watch". The app prompts for HealthKit permission on first use, fetches the user's recent workouts from HealthKit, and uploads them to Synek's backend. The user immediately sees those workouts populate the actual-performance fields of matching planned sessions, identical to how the Strava integration behaves.

**Why this priority**: This is the entire reason the iOS wrapper exists. Without it, the app provides no value beyond the web version.

**Independent Test**: Record a workout on Apple Watch, open Synek iOS, tap "Sync from Apple Watch", grant permission. Workout appears in synek (matched to a planned session if one exists on the same date, or stored as an unattached actual otherwise) within 10 seconds.

**Acceptance Scenarios**:

1. **Given** the user is on the Integrations settings tab inside the iOS app for the first time, **When** the screen renders, **Then** an "Apple Watch (HealthKit)" section appears with a "Sync from Apple Watch" button. The section MUST NOT appear when viewing synek.app outside the iOS app.
2. **Given** the user taps "Sync from Apple Watch" for the first time, **When** the action runs, **Then** iOS displays the native HealthKit permission sheet listing the requested data types (workouts, heart rate, route, distance, active energy).
3. **Given** the user grants HealthKit permission, **When** the sync completes, **Then** a success state shows the count of workouts uploaded and the timestamp.
4. **Given** sync has completed, **When** a planned session exists on the same calendar day with a matching activity type, **Then** the session's actual performance fields (duration, distance, average heart rate, calories) are populated from the HealthKit workout — matching the same matching strategy as the Strava integration.
5. **Given** the user denies HealthKit permission, **When** they tap "Sync" again, **Then** the app shows guidance to enable permission in iOS Settings → Privacy → Health → Synek.
6. **Given** sync has run successfully before, **When** the user taps "Sync" again, **Then** only workouts newer than the last successful sync are fetched and uploaded (incremental sync).

---

### User Story 3 - View HealthKit Sync Status (Priority: P2)

A user can see at a glance whether their HealthKit sync is configured and when it last ran. Matches the Strava integration's status display for consistency.

**Why this priority**: Trust and transparency. Lower priority because the core value is delivered by sync itself; the status display is polish.

**Independent Test**: After a successful sync, open Integrations tab on the iOS app — last-synced timestamp and total synced workout count are visible.

**Acceptance Scenarios**:

1. **Given** HealthKit permission has been granted, **When** the user opens Integrations tab, **Then** they see the last-synced timestamp and a count of workouts ever synced from HealthKit.
2. **Given** a session was populated from HealthKit, **When** the athlete views that session, **Then** a visual indicator (HealthKit badge) confirms the data source — distinct from the Strava badge.

---

### Edge Cases

- **HealthKit unavailable (running outside iOS app)**: The "Apple Watch" section is hidden when `window.__healthkit` bridge is not present. No errors shown.
- **No HealthKit data on device**: Sync completes successfully with "0 new workouts" message — not treated as an error.
- **Network failure mid-sync**: Upload fails, partial state is rolled back, user sees error toast with retry option.
- **Duplicate workout**: Workouts are deduplicated by `HKWorkout.uuid` (HealthKit's stable UUID); re-running sync does not create duplicates.
- **Workout matched to a session that already has Strava data**: HealthKit data does NOT overwrite existing actuals from Strava (Strava wins). User sees both badges if both sources reported data.
- **App killed mid-sync**: Sync is not resumable in V1; user re-taps Sync after relaunch. Idempotent by UUID.
- **HealthKit permission revoked in iOS Settings**: Next sync attempt shows "Permission required" state with re-prompt link.
- **Email/password login works; Google OAuth in WKWebView blocked**: Google explicitly blocks OAuth flows in embedded webviews. V1 requires email/password — Google OAuth via `ASWebAuthenticationSession` is deferred to V2.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The iOS app MUST wrap the synek.app web application in a `WKWebView` that uses `WKWebsiteDataStore.default()` (non-ephemeral) so that `localStorage` (and therefore the Supabase auth session) persists across app launches.
- **FR-002**: The iOS app MUST request HealthKit read permission for: `HKObjectType.workoutType()`, `HKQuantityType.heartRate`, `HKQuantityType.distanceWalkingRunning`, `HKQuantityType.distanceCycling`, `HKQuantityType.activeEnergyBurned`, `HKSeriesType.workoutRoute()`. No write permissions are requested.
- **FR-003**: The iOS app MUST expose a JavaScript bridge on `window.__healthkit` with at least: `requestAuth()`, `fetchWorkouts(since)`, `getStatus()`. Each returns a Promise.
- **FR-004**: The web application MUST detect `window.__healthkit` and render the "Apple Watch (HealthKit)" section in the Integrations tab only when present.
- **FR-005**: On "Sync from Apple Watch" tap, the web application MUST: (a) request permission via bridge, (b) fetch workouts since the last-synced timestamp (or last 90 days on first run), (c) POST workouts to a new Supabase Edge Function `healthkit-sync` for storage, (d) display the result count.
- **FR-006**: Workouts MUST be deduplicated by `HKWorkout.uuid` (stable per device). Re-syncing the same workout MUST be a no-op upsert.
- **FR-007**: Workouts MUST be matched to planned sessions using the same logic as the Strava integration: same calendar day (athlete timezone) AND matching activity type (HKWorkoutActivityType → synek training-type via a mapping table).
- **FR-008**: When a session already has actuals populated from Strava, HealthKit MUST NOT overwrite them. The session MUST record that both sources reported data.
- **FR-009**: The iOS app MUST NOT request, store, or transmit HealthKit data to any destination other than the synek `healthkit-sync` Edge Function.
- **FR-010**: External links (non-synek hosts) MUST open via `ASWebAuthenticationSession` (for OAuth flows on accounts.google.com) or `SFSafariViewController` (for general external pages) — not in the WKWebView and not via app handoff.
- **FR-011**: The app MUST display its version in the Settings → User tab footer for support purposes (read from `Bundle.main.infoDictionary["CFBundleShortVersionString"]` via a separate bridge call `getAppInfo()`).
- **FR-012**: HealthKit usage strings in `Info.plist` MUST clearly describe the purpose: "Synek reads your workouts, heart rate, distance, and energy to populate your training log." Vague strings cause App Store rejection.
- **FR-013**: The app MUST handle the case where HealthKit access is denied: subsequent calls to `fetchWorkouts` MUST return an error with a code that the web UI can convert into "permission required" guidance.
- **FR-014**: The minimum supported iOS version MUST be iOS 16.0.
- **FR-015**: V1 MUST NOT include background sync (`HKObserverQuery`, `enableBackgroundDelivery`, `UIBackgroundModes`). All sync is user-initiated via the button.

### Key Entities _(include if feature involves data)_

- **HealthKitWorkout**: A workout sample retrieved from HealthKit. Identified by `uuid` (UUID, device-stable). Fields: activity type, start/end time, duration, total distance (meters), total energy burned (kcal), average heart rate (bpm), source device name. Stored in a new `healthkit_workouts` table similar to existing Strava workout storage.
- **HealthKitSyncStatus**: One row per user. Fields: `user_id`, `last_synced_at`, `total_synced_count`, `permission_state` (granted | denied | not_determined), `created_at`. Used to drive the Integrations UI and incremental sync.
- **HealthKitWorkoutMatch**: Optional row linking a `healthkit_workouts.uuid` to a `sessions.id` when matching succeeded. Mirrors how Strava activities are matched to sessions.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A new user can install the app from TestFlight, log in, grant HealthKit permission, and complete a successful sync in under 3 minutes.
- **SC-002**: Manual sync of the last 7 days of workouts (typical: 3-10 items) completes in under 5 seconds on a recent iPhone over WiFi.
- **SC-003**: Re-syncing produces zero duplicates (verified by row count before/after).
- **SC-004**: When a workout completed on Apple Watch is synced, the matching planned session's actual fields are populated within one full sync cycle (no manual refresh needed beyond the sync itself).
- **SC-005**: Cold-start of the iOS app to interactive synek dashboard completes in under 2 seconds on iPhone 13 or newer.
- **SC-006**: The app passes Apple App Store HealthKit review on first submission (verified by absence of usage-string rejection).
- **SC-007**: Email/password authentication state persists across at least 30 consecutive app cold-starts without forced re-login.
