# Quickstart: iOS App Wrapper with HealthKit Integration

**Feature**: 018-ios-healthkit-wrapper
**Date**: 2026-05-16

---

## Prerequisites

### Web side (this repo)

- Supabase project running OR mock mode active
- `pnpm dev` starts the web app at `http://localhost:5173`
- Supabase CLI installed (`pnpm supabase:install`)

### iOS side (separate `synek-ios` repo)

- macOS with Xcode 16+ installed (from App Store)
- iOS 16+ device for real HealthKit testing (Apple Watch with workout data strongly recommended)
- Apple Developer account ($99/yr) — required for TestFlight. NOT required for V1 PoC: simulator dev + free Apple ID personal-team installs to your own device work without it. Sign up when ready to invite real testers.
- Bundle ID: `app.synek.ios` (paid-account-only global claim deferred for V1 PoC; the same ID is still used locally so the Xcode project does not need re-configuration later)
- **Free-tier reminder**: cert installed via free Apple ID expires after 7 days. Reinstall from Xcode when the app stops launching on device. Max 3 apps signed with a personal team at one time.

---

## Environment Variables

### Web app (`.env.local`)

No new variables needed for V1 — the bridge is auto-detected by the web app at runtime.

### Supabase Edge Functions (`supabase/functions/healthkit-sync/.env`)

No new secrets — uses the standard Supabase service-role client like other Edge Functions.

### iOS app (`Info.plist`, set via Xcode build configurations)

| Key                                                | Debug value                     | Release value                                                                                |
| -------------------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------- |
| `SYNEK_WEB_URL`                                    | `http://<your-mac-lan-ip>:5173` | `https://synek.app`                                                                          |
| `NSHealthShareUsageDescription`                    | (same as release)               | "Synek reads your workouts, heart rate, distance, and energy to populate your training log." |
| `NSAppTransportSecurity → NSAllowsLocalNetworking` | `true`                          | `false` (default)                                                                            |

---

## First-time setup (web side)

1. Apply the schema migration:

   ```bash
   pnpm supabase db reset       # local dev
   # or for hosted: review and apply 018_healthkit_schema.sql via Supabase dashboard
   ```

2. Deploy the new Edge Function:

   ```bash
   bash scripts/supabase-deploy-healthkit-sync.sh   # new script created in this feature
   ```

3. Verify it runs locally:

   ```bash
   supabase functions serve healthkit-sync --no-verify-jwt
   curl -X POST http://localhost:54321/functions/v1/healthkit-sync \
     -H "Content-Type: application/json" \
     -d '{"workouts":[]}'
   # expect: 401 (no JWT) — confirms the auth check fires
   ```

4. Run the web app:

   ```bash
   pnpm dev
   ```

5. In a browser console at `http://localhost:5173`, the Apple Watch section should NOT appear (no bridge present). Open Integrations tab to confirm.

---

## First-time setup (iOS side)

1. Clone the new repo:

   ```bash
   git clone git@github.com:<org>/synek-ios.git
   cd synek-ios
   open Synek.xcodeproj
   ```

2. In Xcode → Project navigator → `Synek` target → Signing & Capabilities:
   - Team: select your Apple Developer team (free tier OK to start)
   - Bundle ID: `app.synek.ios`
   - Capability: HealthKit ✅

3. In Xcode scheme editor, ensure `Debug` config has `SYNEK_WEB_URL = http://<your-mac-lan-ip>:5173` and `Release` has `https://synek.app`.

4. `Cmd+R` to run in simulator. Synek landing page should appear.

5. Run on a physical device (Cmd+R with device selected):
   - First time: iOS will prompt to trust the developer profile under Settings → General → VPN & Device Management
   - First HealthKit call: iOS prompts for HK permission

---

## Development loop (typical)

### Web changes

```bash
pnpm dev   # autoreloads inside iOS app's WKWebView
```

No iOS rebuild needed. The webview re-fetches `SYNEK_WEB_URL` on app launch and respects hot module reload while running.

### iOS Swift changes

```
Cmd+R in Xcode   # rebuild & deploy to simulator/device
```

### Bridge contract changes

Both sides must be updated in lockstep. Update `contracts/healthkit-bridge.md` first, then web Zod schemas, then Swift `Codable` types.

---

## Manual test plan (run before each TestFlight release)

| #   | Step                                                                     | Expected                                              |
| --- | ------------------------------------------------------------------------ | ----------------------------------------------------- |
| 1   | Install fresh build, launch                                              | Synek landing page renders                            |
| 2   | Log in with email/password                                               | Reaches dashboard                                     |
| 3   | Force-kill app, relaunch                                                 | Still logged in, lands on dashboard                   |
| 4   | Navigate to Settings → Integrations                                      | "Apple Watch (HealthKit)" section visible             |
| 5   | Tap "Sync from Apple Watch" (first time)                                 | iOS HK permission sheet appears                       |
| 6   | Grant all data types                                                     | Sync proceeds, success state shows count              |
| 7   | Tap "Sync" again                                                         | Only new workouts since step 6 are uploaded           |
| 8   | On Apple Watch, record a new workout, end it                             | (Wait 30s for HK to ingest)                           |
| 9   | Tap "Sync" in app                                                        | New workout appears, count increments by 1            |
| 10  | View a planned session matching the new workout's date + type            | Actual fields populated, HealthKit badge visible      |
| 11  | Deny HK permission (Settings → Privacy → Health → Synek → Off), tap Sync | Permission-required state shows with link to settings |
| 12  | Open browser at synek.app (NOT in app)                                   | Apple Watch section is NOT visible                    |

---

## Troubleshooting

| Symptom                                                    | Likely cause                                      | Fix                                                                                                           |
| ---------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Apple Watch section missing in app                         | Bridge script not injected at `documentStart`     | Check `WKUserScript` injectionTime in `WebViewContainer.swift`                                                |
| Permission sheet doesn't appear                            | HealthKit entitlement not enabled                 | Xcode → Signing & Capabilities → confirm HealthKit row exists                                                 |
| Permission sheet appears but `fetchWorkouts` returns empty | Read access silently denied OR no data on device  | Verify on a device with known Apple Watch workouts; HK never confirms read denial                             |
| Cookies / login lost on app cold-start                     | Using ephemeral data store                        | Confirm `WKWebViewConfiguration.websiteDataStore = .default()` (the default — check it's not been overridden) |
| Google login button does nothing in app                    | Google blocks OAuth in webviews                   | Expected in V1 — use email/password. Document in TestFlight notes.                                            |
| Edge Function returns 401                                  | JWT missing or expired                            | Web client must send `Authorization: Bearer <session.access_token>` header                                    |
| Sync uploads duplicates                                    | `uuid` primary key collision should prevent this  | Check Edge Function UPSERT is using `ON CONFLICT (uuid) DO UPDATE`                                            |
| Workouts on Apple Watch not appearing in HK                | Native AW Workout app sometimes delays sync to HK | Open Apple Health app on iPhone, pull-to-refresh, then retry                                                  |

---

## Verification before merge (web side)

Standard synek gates (per AGENTS.md):

```bash
pnpm typecheck
pnpm test:run
pnpm format:check
pnpm verify:app
pnpm supabase:functions:check   # required because we added an Edge Function
pnpm verify                     # full gate including the above
```

## Verification before TestFlight upload (iOS side)

```bash
# In synek-ios/
xcodebuild test -scheme Synek -destination 'platform=iOS Simulator,name=iPhone 15'
xcodebuild archive -scheme Synek -archivePath build/Synek.xcarchive
```

Manual checks:

- Bundle version (`CFBundleVersion`) incremented since last upload
- HK usage strings unchanged (or reviewed by another person if changed)
- No debug `print()` left in production code paths

---

## V2 follow-ups (not in this spec)

- Background sync via `HKObserverQuery` + `enableBackgroundDelivery`
- Google OAuth via `ASWebAuthenticationSession`
- Workout route (GPS polyline) ingestion
- Per-second HR samples (timeline view, not just average)
- App Store submission
- Fastlane / automated TestFlight pipeline
- iPad layout
- Push notifications
