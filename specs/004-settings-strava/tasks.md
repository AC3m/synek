# Tasks: Settings Page with Strava Integration

**Input**: Design documents from `/specs/004-settings-strava/`
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/ ✅ quickstart.md ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Schema, route registration, and shared type extensions that unblock all user stories.

- [ ] T001 Write `supabase/migrations/010_settings_schema.sql` — add `profiles.avatar_url TEXT`, `strava_tokens.user_id UUID REFERENCES profiles(id) ON DELETE CASCADE`, `strava_tokens.strava_athlete_name TEXT`, `strava_tokens.connected_at TIMESTAMPTZ`, `strava_tokens.last_synced_at TIMESTAMPTZ`, UNIQUE constraint on `strava_tokens(user_id)`, and RLS policies for user-owned rows on both tables
- [ ] T002 Register `/settings` route in `app/routes.ts` (accessible to all authenticated users, outside coach/athlete layout)
- [ ] T003 [P] Install shadcn DropdownMenu component: `pnpm dlx shadcn@latest add dropdown-menu`
- [ ] T004 [P] Add `profile` and `stravaConnection` query key factories to `app/lib/queries/keys.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: New training types (walk/hike) and UserMenu dropdown refactor — both needed before any user story is testable.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T005 Add `'walk'` and `'hike'` to `TRAINING_TYPES` const and add `WalkData` and `HikeData` interface variants to `TypeSpecificData` discriminated union in `app/types/training.ts` — fields: `{ type: 'walk' | 'hike', terrain?: 'road' | 'trail' | 'urban', elevation_gain_m?: number }`
- [ ] T006 [P] Add color config entries for `walk` and `hike` in `app/lib/utils/training-types.ts` — walk: amber-700/bg-amber-100, hike: lime-700/bg-lime-100
- [ ] T007 [P] Add `walk` and `hike` translation keys to `app/i18n/resources/en/training.json` and `app/i18n/resources/pl/training.json`
- [ ] T008 Create `app/components/training/type-fields/WalkHikeFields.tsx` — shared field component for both walk and hike types (terrain selector + optional elevation gain input), following the existing type-fields pattern
- [ ] T009 Add `walk` and `hike` cases to the type-field switch in `app/components/training/SessionForm.tsx` rendering `<WalkHikeFields />`
- [ ] T010 Refactor `app/components/layout/UserMenu.tsx` to use shadcn `DropdownMenu` — trigger shows avatar/name, items: "Settings" (navigate to `/settings`), "Sign out" (existing logout logic); keep existing role label display

**Checkpoint**: Walk/hike types renderable in session form; Settings accessible via header dropdown.

---

## Phase 3: User Story 1 — Update Profile Information (Priority: P1) 🎯 MVP

**Goal**: Any logged-in user can open Settings, update their name, upload a profile picture, and change their password.

**Independent Test**: Log in as any user → click name in header dropdown → select "Settings" → change name → save → name updates in header. No Strava account needed.

### Implementation

- [ ] T011 [P] [US1] Add settings and user-tab i18n keys to `app/i18n/resources/en/common.json` and `app/i18n/resources/pl/common.json` — keys: `settings.title`, `settings.tabs.user`, `settings.tabs.integrations`, `settings.user.name`, `settings.user.avatar`, `settings.user.changePassword`, `settings.user.currentPassword`, `settings.user.newPassword`, `settings.user.confirmPassword`, `settings.user.saveChanges`, `settings.user.saved`
- [ ] T012 [P] [US1] Extend `AuthUser` interface in `app/lib/auth.ts` to include `avatarUrl: string | null`; update mock users to include `avatarUrl: null`; update `AuthContextValue` to expose `updateProfile(name: string, avatarUrl: string | null): void`
- [ ] T013 [US1] Create `app/lib/queries/profile.ts` — export `updateProfileName(userId, name)`, `uploadAvatar(userId, file)` (returns public URL), `changePassword(currentPassword, newPassword)` with both real Supabase implementations and mock equivalents (`mockUpdateProfileName`, `mockUploadAvatar`, `mockChangePassword`)
- [ ] T014 [US1] Create `app/lib/hooks/useProfile.ts` — export `useUpdateProfileName()` mutation (optimistic: update AuthContext immediately, rollback on error, invalidate `profile.byId` on settled) and `useChangePassword()` mutation (no optimistic update needed — password change is not reversible client-side)
- [ ] T015 [US1] Create `app/components/settings/UserTab.tsx` — three sections: (1) name field with save button, (2) avatar upload area (file input accepting image/jpeg,image/png,image/webp, max 5 MB, preview on select), (3) password change form (current + new + confirm fields); all strings via `t()` from `common` namespace; use `cn()` for classes; accept `className?: string`
- [ ] T016 [US1] Create `app/routes/settings.tsx` — reads `?tab=` URL param (default `'user'`), renders shadcn `Tabs` with "User" and "Integrations" tab triggers; User tab renders `<UserTab />`; Integrations tab renders placeholder `<div>` for now; wrap in auth guard (redirect to `/login` if no user)

**Checkpoint**: Settings page navigable from header; name/avatar/password changes work end-to-end. US1 fully testable.

---

## Phase 4: User Story 2 — Connect Strava Account (Priority: P2)

**Goal**: Athlete connects Strava via OAuth; matched session actual performance fields (duration, distance, pace, avg HR, max HR) auto-populate from Strava without manual entry.

**Independent Test**: Connect Strava → open a week with a matching session → verify `actualDurationMinutes`, `actualDistanceKm`, `actualPace`, `avgHeartRate`, `maxHeartRate` are populated and the athlete sees no manual-entry prompt for those fields.

### Implementation

- [ ] T017 [P] [US2] Extend `app/types/strava.ts` with `StravaToken` interface: `{ id, userId, stravaAthleteId, stravaAthleteName, accessToken, refreshToken, expiresAt, connectedAt, lastSyncedAt, createdAt, updatedAt }`; add `StravaConnectionStatus` view type: `{ connected, stravaAthleteName, connectedAt, lastSyncedAt }`
- [ ] T018 [P] [US2] Add Strava and integrations-tab i18n keys to `app/i18n/resources/en/common.json` and `app/i18n/resources/pl/common.json` — keys: `strava.connect`, `strava.connected`, `strava.connectedAs`, `strava.disconnect`, `strava.description`, `strava.syncing`, `strava.syncNow`, `strava.lastSynced`, `strava.notConnected`, `strava.disconnectConfirm`
- [ ] T019 [US2] Create `supabase/functions/strava-auth/index.ts` — accepts `{ code, userId }`, exchanges code with Strava token endpoint (using `STRAVA_CLIENT_ID` + `STRAVA_CLIENT_SECRET` env vars), upserts row in `strava_tokens` keyed on `user_id`, returns `{ connected: true, stravaAthleteName, stravaAthleteId }` or `{ error }` per contract in `contracts/strava-edge-functions.md`
- [ ] T020 [US2] Create `supabase/functions/strava-sync/index.ts` — accepts `{ userId, weekStart }`, checks token expiry and refreshes if needed (updating `strava_tokens`), fetches activities from Strava for the week date range, maps Strava types → Synek types using the mapping table from `research.md`, matches by day + type, updates matched `training_sessions` rows with `actual_duration_minutes`, `actual_distance_km`, `actual_pace`, `avg_heart_rate`, `max_heart_rate`, `strava_activity_id`, `strava_synced_at`, upserts into `strava_activities`, updates `last_synced_at`, returns `{ synced, lastSyncedAt }` per contract
- [ ] T021 [US2] Create `supabase/functions/strava-disconnect/index.ts` — accepts `{ userId }`, deletes `strava_tokens` row for user (session performance data retained), returns `{ disconnected: true }` per contract
- [ ] T022 [US2] Create `app/lib/queries/strava-connection.ts` — export `getStravaConnectionStatus(userId)` (queries `strava_tokens`), `callStravaSync(userId, weekStart)` (calls Edge Function), `callStravaDisconnect(userId)` (calls Edge Function) with real and mock implementations (`mockGetStravaConnectionStatus` defaults to disconnected; `mockCallStravaSync` populates one unmatched session with sample data)
- [ ] T023 [US2] Create `app/lib/hooks/useStravaConnection.ts` — export `useStravaConnectionStatus(userId)` query, `useStravaSync()` mutation (optimistic: show "syncing" state; invalidate `sessions.byWeek` and `stravaConnection.byUser` on settled), `useStravaDisconnect()` mutation (optimistic: set status to disconnected immediately; rollback on error)
- [ ] T024 [US2] Create `app/components/settings/IntegrationsTab.tsx` — Strava section: when disconnected shows description + "Connect with Strava" button (constructs Strava OAuth URL with `VITE_STRAVA_CLIENT_ID`, `redirect_uri`, `scope=activity:read_all`, random `state` stored in sessionStorage); when connected shows athlete name, "Sync Now" button (calls `useStravaSync`), "Disconnect" button with confirmation; all strings via `t()` from `common` namespace
- [ ] T025 [US2] Handle Strava OAuth callback in `app/routes/settings.tsx` — on mount of Integrations tab, read `code` and `state` URL params; validate `state` against sessionStorage; if valid call `strava-auth` Edge Function via `useStravaSync`; clear params from URL with `window.history.replaceState`; show success/error toast

**Checkpoint**: Strava connect/disconnect/sync flow works end-to-end in real and mock mode. US2 fully testable.

---

## Phase 5: User Story 3 — View Strava Sync Status (Priority: P3)

**Goal**: Users see at a glance which sessions were populated from Strava (badge indicator) and when the account was last synced (in Integrations tab).

**Independent Test**: After a sync, sessions with Strava data show a Strava icon/badge; Integrations tab shows last-synced timestamp.

### Implementation

- [ ] T026 [P] [US3] Add Strava badge i18n key to `app/i18n/resources/en/common.json` and `app/i18n/resources/pl/common.json` — key: `strava.syncedBadge` (tooltip text e.g. "Data from Strava")
- [ ] T027 [US3] Add Strava source badge to `app/components/calendar/SessionCard.tsx` — when `session.stravaActivityId` is non-null, render a small Strava-orange icon/badge (e.g. Lucide `Zap` icon in orange) with tooltip "Data from Strava" (`t('strava.syncedBadge')`); position alongside existing actual performance chips
- [ ] T028 [US3] Update `app/components/settings/IntegrationsTab.tsx` to display `connectedAt` date and `lastSyncedAt` timestamp when Strava is connected — format both with `date-fns` (e.g. `format(parseISO(lastSyncedAt), 'PPp')`)

**Checkpoint**: All three user stories independently functional. Full feature verifiable end-to-end.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T029 Run `pnpm typecheck` and resolve all TypeScript errors across new and modified files
- [ ] T030 [P] Verify mock mode end-to-end: start app without Supabase credentials, confirm Settings page loads, name update works, mock Strava connect/sync populates a session, badge appears
- [ ] T031 [P] Confirm all new i18n keys exist in both `en/` and `pl/` files — run `/i18n-check` skill if available
- [ ] T032 Confirm no hardcoded English strings remain in any new component JSX (all text via `t()`)
- [ ] T033 [P] Confirm `select()` calls in `profile.ts` and `strava-connection.ts` specify only required columns (no wildcard `select('*')`)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately; T003 and T004 can run in parallel
- **Phase 2 (Foundational)**: Depends on Phase 1 — T006, T007 can run in parallel with T005; T008 depends on T005; T009 depends on T008
- **Phase 3 (US1)**: Depends on Phase 2 — T011 and T012 can run in parallel; T013 depends on T012; T014 depends on T013; T015 depends on T011; T016 depends on T014 and T015
- **Phase 4 (US2)**: Depends on Phase 2 — T017 and T018 can run in parallel; T019/T020/T021 can run in parallel; T022 depends on T017; T023 depends on T022; T024 depends on T022, T023; T025 depends on T024
- **Phase 5 (US3)**: Depends on Phase 4 (needs `stravaActivityId` to be populated by sync)
- **Phase 6 (Polish)**: Depends on all user story phases complete

### User Story Dependencies

- **US1 (P1)**: Starts after Phase 2 — independent, no dependency on US2/US3
- **US2 (P2)**: Starts after Phase 2 — independent of US1, but shares the Settings route shell from T016
- **US3 (P3)**: Depends on US2 (needs `stravaActivityId` populated on sessions; extends `IntegrationsTab`)

### Parallel Opportunities

- T003, T004 (Phase 1) — fully parallel
- T006, T007 (Phase 2) — parallel with each other; depend on T005
- T011, T012 (Phase 3/US1) — fully parallel
- T017, T018, T019, T020, T021 (Phase 4/US2) — fully parallel
- T026, T027 start parallel; T028 depends on IntegrationsTab existing (T024)
- T029, T030, T031, T033 (Phase 6) — fully parallel

---

## Parallel Execution Example: US2

```
# These can all run in parallel once Phase 2 is complete:
T017 — Extend strava.ts types
T018 — Add Strava i18n keys
T019 — strava-auth Edge Function
T020 — strava-sync Edge Function
T021 — strava-disconnect Edge Function

# Then in parallel:
T022 — strava-connection.ts queries (depends on T017)
T023 — useStravaConnection.ts hooks (depends on T022)

# Then sequentially:
T024 — IntegrationsTab component (depends on T023)
T025 — OAuth callback handling in settings.tsx (depends on T024)
```

---

## Implementation Strategy

### MVP (User Story 1 only)

1. Complete Phase 1 (Setup)
2. Complete Phase 2 (Foundational)
3. Complete Phase 3 (US1 — Profile updates)
4. **STOP and VALIDATE**: Settings accessible from header; name/avatar/password changes work
5. Skip Strava entirely until US1 is verified

### Incremental Delivery

1. Phase 1 + 2 → Walk/hike types in session form; Settings link in header dropdown
2. Phase 3 → Profile management live (MVP!)
3. Phase 4 → Strava connect/sync/disconnect + auto-fill of performance fields
4. Phase 5 → Strava badges on sessions + status timestamps

---

## Notes

- [P] tasks = different files, no dependencies between them at that point
- [Story] label maps each task to its user story for traceability
- All new shadcn components must be installed via CLI — never edit `app/components/ui/` manually
- Mock implementations are **required** alongside every real Supabase query function
- All mutations require full optimistic-update cycle: `onMutate` → `onError` → `onSettled`
- Every new string in JSX must use `t('key')` — add to both `en/` and `pl/` simultaneously
