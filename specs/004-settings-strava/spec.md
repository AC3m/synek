# Feature Specification: Settings Page with Strava Integration

**Feature Branch**: `004-settings-strava`
**Created**: 2026-03-08
**Status**: Draft
**Input**: User description: "add Settings route where users will have two tabs: 1. user -> there they can change their name, password, add picture. 2. integrations -> there will be a place to integrate with strava account. Propose the most straightforward way to integrate with strava. What we need to get from strava are the existing performance field. When they are fetched from strava there's no need to fulfill them locally by an athlete. The access point to setting will be on the drop down when they click on user in the top header user button."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Update Profile Information (Priority: P1)

Any logged-in user (coach or athlete) can navigate to Settings via the user dropdown in the header, go to the **User** tab, and update their display name and/or profile picture. Password change is also available on this tab.

**Why this priority**: Core identity management — every user needs access to update their basic profile. This tab is entirely self-contained and has no external dependencies.

**Independent Test**: Can be fully tested by opening Settings, editing the name field, saving, and verifying the new name appears in the header dropdown — no Strava account required.

**Acceptance Scenarios**:

1. **Given** a logged-in user, **When** they click the user avatar/name button in the top header, **Then** a dropdown menu appears containing a "Settings" option.
2. **Given** the Settings page is open, **When** the user clicks the "User" tab, **Then** they see a form pre-filled with their current name, a profile picture upload area, and a password change section.
3. **Given** the User tab form, **When** the user changes their name and saves, **Then** the new name is persisted and reflected immediately in the header.
4. **Given** the User tab form, **When** the user uploads a valid image file as a profile picture, **Then** the picture is saved and shown in the header user button.
5. **Given** the password change section, **When** the user provides their current password and a new password (confirmed), **Then** the password is updated and a success message is shown.
6. **Given** the password change section, **When** the user enters an incorrect current password, **Then** an error message is shown and the password is not changed.

---

### User Story 2 - Connect Strava Account (Priority: P2)

An athlete navigates to the **Integrations** tab in Settings and connects their Strava account via OAuth. Once connected, future training sessions planned in Synek are automatically matched to completed Strava activities, and the actual performance fields (duration, distance, pace, heart rate) are populated without any manual entry.

**Why this priority**: Removes the manual data entry burden for athletes — the primary value of the Strava integration. Depends on the Settings page (P1) being available.

**Independent Test**: Can be tested by connecting a Strava account, completing a session on the same day, and verifying that actual performance fields are auto-populated in that session without any manual input.

**Acceptance Scenarios**:

1. **Given** the Integrations tab is open and no Strava account is connected, **When** the user sees the Strava section, **Then** they see a "Connect with Strava" button and a brief description of what the integration does.
2. **Given** the user clicks "Connect with Strava", **When** the OAuth consent flow completes successfully, **Then** they are returned to the Integrations tab showing "Connected as [Strava athlete name]" with a disconnect option.
3. **Given** a Strava account is connected, **When** a training session's date and activity type match a completed Strava activity, **Then** the session's actual performance fields (duration, distance, pace, average heart rate) are populated from Strava data — and the athlete does not need to enter them manually.
4. **Given** a Strava account is connected, **When** no matching Strava activity is found for a session, **Then** the athlete can still manually enter actual performance data as before.
5. **Given** a connected Strava account, **When** the user clicks "Disconnect", **Then** the Strava connection is removed and the account shows as disconnected; previously synced data is retained.

---

### User Story 3 - View Strava Sync Status (Priority: P3)

A user can see at a glance whether their Strava account is connected, when it was last synced, and which sessions have had performance data pulled from Strava.

**Why this priority**: Transparency and trust — users need visibility into what data came from Strava vs. was manually entered. Lower priority as the core connection and sync work already delivers value without this detail view.

**Independent Test**: Can be tested by connecting Strava, triggering a sync, and verifying the Integrations tab displays the last-synced timestamp and that sessions populated from Strava show a visual Strava indicator.

**Acceptance Scenarios**:

1. **Given** a connected Strava account, **When** the user opens the Integrations tab, **Then** they see the connected Strava profile name, connection date, and last sync timestamp.
2. **Given** a session has been populated from Strava, **When** the athlete views that session, **Then** a visual indicator (e.g., Strava badge/icon) confirms the data came from Strava.

---

### Edge Cases

- What happens when the user uploads an image file that is too large (>5 MB) or an unsupported format?
- What happens if the Strava OAuth flow is cancelled or fails midway?
- What happens when Strava returns an activity that matches multiple planned sessions on the same day and type?
- What happens when the Strava access token expires — does the system refresh it transparently?
- What happens if the user disconnects Strava — do previously auto-filled performance fields remain or get cleared?

## Requirements *(mandatory)*

### Functional Requirements

**Settings Access**
- **FR-001**: System MUST expose a "Settings" option in the user dropdown menu in the top header, visible to all logged-in users.
- **FR-002**: Clicking "Settings" MUST navigate the user to a dedicated Settings page with two tabs: "User" and "Integrations".

**User Tab**
- **FR-003**: Users MUST be able to update their display name from the User tab.
- **FR-004**: Users MUST be able to upload a profile picture (JPEG, PNG, WebP; max 5 MB) from the User tab.
- **FR-005**: Users MUST be able to change their password by providing their current password and a new password (min 8 characters, confirmed).
- **FR-006**: System MUST validate the current password before allowing a password change and display a clear error if it is incorrect.
- **FR-007**: Profile changes (name, picture) MUST be reflected in the header user button immediately after saving, without a page reload.

**Integrations Tab — Strava Connection**
- **FR-008**: The Integrations tab MUST show a Strava section with the current connection status (connected / not connected).
- **FR-009**: Users MUST be able to initiate a Strava OAuth connection via a "Connect with Strava" button that redirects to the Strava authorization page.
- **FR-010**: Upon successful Strava authorization, the system MUST store the Strava OAuth tokens (access + refresh) securely and display the connected Strava athlete name.
- **FR-011**: Users MUST be able to disconnect their Strava account from the Integrations tab; disconnecting MUST revoke and delete stored tokens.

**Strava Data Sync**
- **FR-012**: When a Strava account is connected, the system MUST attempt to match completed Strava activities to planned training sessions by date and activity type.
- **FR-013**: When a match is found, the system MUST populate the session's actual performance fields — duration, distance, pace, average heart rate, and max heart rate — from the Strava activity data. Heart rate fields are left null if Strava reports no heart rate (device did not record it).
- **FR-014**: When Strava data is present for a session, the athlete MUST NOT be required to manually enter those performance fields (they should be shown as auto-filled).
- **FR-015**: If no Strava match is found for a session, manual entry of actual performance fields MUST remain available as before.
- **FR-016**: The system MUST handle Strava token refresh transparently, without requiring the user to re-authorize.
- **FR-017**: Sessions populated from Strava MUST be visually marked to indicate the data source.

### Key Entities

- **User Profile**: Represents a user's identity — display name, profile picture URL, and authentication credentials.
- **Strava Connection**: Represents the link between a Synek user and their Strava account — includes Strava athlete ID, stored tokens, connection date, and last-sync timestamp.
- **Strava Activity**: A completed workout record from Strava — includes activity type, start date, duration, distance, pace, and heart rate data.
- **Training Session** *(existing, extended)*: Already contains `stravaActivityId` and `stravaSyncedAt` fields — these are used to track which sessions have been populated from Strava.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can open Settings and update their display name within 30 seconds of landing on the page.
- **SC-002**: The Strava OAuth connection flow completes (from clicking "Connect" to seeing "Connected as [name]") in under 60 seconds under normal network conditions.
- **SC-003**: Once Strava is connected, actual performance fields for matching sessions are populated automatically — 0 manual field entries required for matched activities.
- **SC-004**: 100% of sessions with a matched Strava activity display a visual Strava source indicator.
- **SC-005**: Disconnecting Strava takes a single confirmation action and completes in under 5 seconds.
- **SC-006**: Profile picture and name changes are reflected in the header without a full page reload.

## Assumptions

- **Strava matching strategy**: Activity date (calendar day) + activity type (run → run, ride → cycling, swim → swimming, walk → walk, hike → hike) is sufficient to identify the correct session. If multiple activities of the same type exist on the same day, the longest-duration activity is used.
- **New training types**: `walk` and `hike` are added as first-class Synek training types to support accurate Strava activity mapping. They are not folded into existing types.
- **Profile pictures**: Stored in the existing object storage (Supabase Storage) — not as inline data URLs.
- **Password change**: Uses the existing auth provider's credential update capability; no email verification required for this initial version.
- **Strava token refresh**: Handled transparently in the background so users are never interrupted by re-auth prompts.
- **Integrations tab visibility**: Shown to all users (coaches and athletes), but only athletes have training sessions to auto-fill — coaches may connect but will see no auto-fill effect.
- **Non-destructive disconnect**: Previously synced performance data remains on sessions after Strava disconnection.
- **Strava OAuth approach**: Standard Authorization Code flow — user is redirected to Strava, authorizes, and is redirected back to the Integrations tab with an authorization code that is exchanged for tokens.
