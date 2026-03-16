# Feature Specification: Junction Garmin PoC Integration

**Feature Branch**: `011-junction-garmin-poc`
**Created**: 2026-03-15
**Status**: Draft
**Scope**: Temporary Proof of Concept — isolated from production data models and core UI

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Connect Garmin Account (Priority: P1)

A logged-in athlete navigates to the Integrations tab in their settings and sees a "Connect Garmin via Junction" button. They click it, and a Junction popup widget opens in place — no full-page redirect. Inside the popup, they enter their Garmin credentials. On success the popup closes and the tab immediately shows a "Garmin connected" status.

**Why this priority**: Without a successful connection, no workout data can ever be received. This is the gateway to all other functionality in this PoC.

**Independent Test**: Can be fully tested by clicking the button, completing the Garmin credential entry inside the popup, and verifying that the connected status appears in the UI — confirms Junction's popup SDK works in the context of this app.

**Acceptance Scenarios**:

1. **Given** a logged-in user is on the Integrations tab with no Garmin connection, **When** they click "Connect Garmin", **Then** a Junction popup widget opens without leaving the page.
2. **Given** the popup is open, **When** the user enters valid Garmin credentials and submits, **Then** the popup closes and the Integrations tab shows a "Garmin connected" status.
3. **Given** a user who abandons the popup mid-way, **When** they close it, **Then** they return to the Integrations tab with the connect button still visible and no partial connection state saved.
4. **Given** a user who has completed the Junction linking flow, **When** they revisit the Integrations tab, **Then** they still see the "Garmin connected" status (connection persists across sessions).

---

### User Story 2 - Receive and Store Raw Garmin Workout (Priority: P2)

After connecting, when the athlete completes and syncs a Garmin workout, Junction delivers a webhook event to the backend. The backend verifies the event, matches it to the linked user, and stores the full raw payload in an isolated data store for later inspection.

**Why this priority**: This is the core data-collection goal of the PoC — validating that Junction's webhook pipeline delivers real Garmin workout data end-to-end.

**Independent Test**: Can be fully tested by syncing a real Garmin workout and then checking the isolated data store for the received raw payload, linked to the correct user.

**Acceptance Scenarios**:

1. **Given** a connected Garmin user syncs a workout, **When** Junction delivers the webhook, **Then** the full raw payload is stored with a timestamp and the linked user's identifier.
2. **Given** a webhook arrives with an unrecognized or unlinked Junction user ID, **When** the backend processes it, **Then** the event is rejected and not stored (no orphan records).
3. **Given** a malformed or unauthenticated webhook request, **When** the backend receives it, **Then** it responds with an error status and stores nothing.
4. **Given** the same workout event is delivered more than once, **When** the backend receives the duplicate, **Then** it is ignored and the existing record is not overwritten.
5. **Given** Junction fires the "historical pull complete" event immediately after connection, **When** the backend receives it, **Then** it stores it as a raw payload — the absence of workout data records at this point is expected and not treated as an error.

---

### User Story 3 - Disconnect Garmin Account (Priority: P3)

A logged-in athlete who has previously connected their Garmin account wants to unlink it. They see a "Disconnect" option on the Integrations tab, confirm the action, and the connection record is removed with the UI reverting to the connect button.

**Why this priority**: Basic connection lifecycle management is needed for PoC re-testing and cleanup. Lower priority than connecting and receiving data.

**Independent Test**: Can be fully tested by disconnecting a previously connected account and verifying the UI reverts to the unconnected state and no further webhook payloads are stored for that user.

**Acceptance Scenarios**:

1. **Given** a user with a connected Garmin account, **When** they click "Disconnect Garmin" and confirm, **Then** the connection record is removed and the UI shows the connect button again.
2. **Given** a user who clicks "Disconnect", **When** the disconnection fails, **Then** an error message is shown and the connection record remains intact.

---

### Edge Cases

- What happens when a user tries to connect Garmin but already has an active Junction link? The system shows the existing connected status rather than re-opening the widget.
- How does the system handle a webhook that arrives for a user who has since disconnected? The event is rejected and not stored.
- What happens if the Junction popup widget fails to load (e.g., network error or the SDK is unavailable)? The user sees an error message and the button returns to its default state.
- What happens when the backend token-generation endpoint is called by an unauthenticated user? The request is rejected with an authorization error.
- What happens when Junction delivers a non-workout event type (e.g., sleep, activity summary)? All event types are stored as raw payloads for PoC analysis.
- What happens if the user tries to reconnect Garmin after disconnecting? A fresh connection flow can be started, but the previous Junction user registration must be deregistered first to allow a clean re-link and data backfill.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a dedicated "Connect Garmin" button within the existing Integrations tab, visible only to users who have not yet linked a Garmin account.
- **FR-002**: The system MUST display a "Garmin connected" status indicator on the Integrations tab for users who have an active Junction link.
- **FR-003**: Clicking "Connect Garmin" MUST open the Junction link widget as an in-page popup — the user MUST NOT be navigated away from the Integrations tab.
- **FR-004**: The system MUST generate a short-lived, user-scoped token on the backend to authorize the Junction popup widget — the token MUST never be generated or exposed client-side.
- **FR-005**: The system MUST store the resulting Junction user identifier linked to the app user upon successful account connection.
- **FR-006**: The system MUST expose a webhook endpoint that Junction can call when a Garmin event is received.
- **FR-007**: The system MUST verify that incoming webhook requests are authentic before processing them (using Junction's provided signature/verification mechanism).
- **FR-008**: The system MUST store the full raw event payload from each verified webhook delivery, associated with the linked app user and including a receipt timestamp.
- **FR-009**: The system MUST reject and not store webhook events that cannot be matched to a known, linked user.
- **FR-010**: The system MUST handle duplicate webhook deliveries idempotently — the same event MUST NOT produce duplicate records.
- **FR-011**: The system MUST allow a linked user to disconnect their Garmin account, removing the connection record.
- **FR-012**: All Junction-related data (connection records and raw webhook payloads) MUST be stored in dedicated, isolated tables with no foreign-key dependencies on `training_sessions` or any Strava tables.
- **FR-013**: The Junction integration MUST NOT modify or reference any existing Strava-related code, components, or data models.

### Key Entities

- **Junction Connection**: Represents a linked relationship between an app user and their Garmin account via Junction. Key attributes: app user identifier, Junction user ID, connected-at timestamp, connection status (active/disconnected).
- **Raw Webhook Payload**: A stored verbatim copy of a Junction webhook event. Key attributes: linked Junction user ID, event type, raw payload body, received-at timestamp, Junction event ID (used as deduplication key).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can complete the Garmin account connection flow from the Integrations tab in under 3 minutes, without leaving the page.
- **SC-002**: 100% of authentic Junction webhook events for a connected user result in a stored raw payload record.
- **SC-003**: 100% of unauthenticated or unmatched webhook requests are rejected without storing any data.
- **SC-004**: Zero modifications are made to any existing tables (`training_sessions`, `strava_activities`, `strava_tokens`, `strava_laps`) — verifiable by schema diff against the main branch.
- **SC-005**: At least one real Garmin workout payload is successfully received, stored, and inspectable in the isolated data store after an end-to-end test with a real Garmin account.

## Assumptions

- **Scope**: All Junction activity uses Junction's sandbox API keys. No production credentials are used.
- **Real Garmin account required**: Junction's sandbox does not yet offer synthetic Garmin demo users ("coming soon"). A real Garmin account must be used for end-to-end testing. The sandbox API key is used, but the Garmin credentials are real.
- **Connection popup, not redirect**: The Junction link widget is launched as an in-page popup via the `useVitalLink` hook — no full-page navigation required.
- **Garmin uses credential-based auth**: Garmin's connection flow inside the Junction widget asks for Garmin username and password (not a standard OAuth redirect). From the user's perspective this is still a clean popup modal.
- **Data arrives incrementally after connection**: Junction fires a "historical pull complete" event immediately after Garmin is linked, but actual workout payloads arrive via subsequent webhook deliveries as data is synced. There is no instant bulk delivery.
- **User roles**: The Garmin connection feature is available to all logged-in users (athletes and coaches alike), since the PoC does not need role-based gating.
- **Webhook event types**: The backend stores all Junction webhook event types as raw payloads (not just workouts), to maximize data for PoC analysis.
- **Deduplication**: If Junction delivers the same event ID more than once, the second delivery is ignored.
- **No UI for viewing payloads**: Raw payloads are inspected directly via the Supabase dashboard. No frontend visualization is in scope for this PoC.
- **No data migration**: Existing users have no pre-populated connection records; connection must be initiated actively.
- **Isolation enforcement**: PoC tables are prefixed with `junction_poc_` to make their temporary nature explicit and easy to identify for future cleanup.
- **Reconnection requires deregistration**: If a user disconnects and reconnects, the old Junction user registration must be explicitly deregistered first to allow a clean re-link and data backfill (Junction-specific constraint).
