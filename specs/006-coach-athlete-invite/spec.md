# Feature Specification: Coach Registration & Athlete Invite

**Feature Branch**: `006-coach-athlete-invite`
**Created**: 2026-03-09
**Status**: Draft
**Input**: User description: "create a user journey to create a coach account with register entry point on the unlogged page state. The coach account has an ability to share a url invite for a potential athlete. When athlete registration url is opened, an athlete can finish off the account creation. Prepare the whole process with information security in mind so that it's production ready."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Coach Self-Registration (Priority: P1)

A new user visits the Synek app without an account. They find a "Register as Coach" entry point on the login/landing page and complete account creation. After successful registration, they are logged in and land on the coach dashboard.

**Why this priority**: The entire feature chain depends on a coach existing. Without coach self-registration, no invite flow can begin. This also unblocks manual QA of the remaining stories.

**Independent Test**: A tester can open the app in an unauthenticated state, navigate to the registration form, fill in name, email, and password, submit, and verify they are redirected to the coach dashboard as a confirmed coach user.

**Acceptance Scenarios**:

1. **Given** an unauthenticated user is on the login/landing page, **When** they click "Register as Coach", **Then** a registration form is displayed requesting full name, email, and password.
2. **Given** a completed registration form with a valid, previously unused email, **When** the user submits, **Then** a coach account is created, the user is signed in automatically, and they are redirected to the coach dashboard.
3. **Given** a registration attempt with an email already in use, **When** the user submits, **Then** an error message is shown without revealing whether the existing account is a coach or athlete.
4. **Given** a registration form with a weak password (fewer than 8 characters), **When** the user submits, **Then** a clear validation error is shown and submission is blocked.
5. **Given** a registration form with an invalid email format, **When** the user submits, **Then** inline validation prevents submission and highlights the invalid field.

---

### User Story 2 - Coach Generates an Athlete Invite Link (Priority: P2)

An authenticated coach wants to add a new athlete. From their dashboard or settings, they can generate a one-time, expiring invite URL that they copy and share (e.g., via messaging or email). Each invite is tied to the coach who generated it.

**Why this priority**: The invite link is the mechanism that connects coach and athlete. Without it, athlete onboarding requires manual admin intervention. This can be developed and tested independently using a seeded coach account.

**Independent Test**: A tester with a coach account can navigate to the "Invite Athlete" section, click "Generate Invite Link", and verify a unique URL is produced. They can confirm the link cannot be reused after expiry or after athlete registration.

**Acceptance Scenarios**:

1. **Given** a logged-in coach on the invite management page, **When** they click "Generate Invite Link", **Then** a unique, time-limited invite URL is displayed and can be copied to clipboard.
2. **Given** an invite link that has already been used (athlete registered), **When** any user tries to open it, **Then** an "invite already used" error is shown and no registration is possible.
3. **Given** an invite link that has expired (past the 24-hour validity window), **When** any user tries to open it, **Then** an "invite expired" message is shown with a suggestion to ask the coach for a new one.
4. **Given** a coach who has generated invite links, **When** they view their invite list, **Then** they can see the status of each invite (pending, used, expired) and can revoke any pending invite.
5. **Given** a coach who revokes a pending invite, **When** a recipient tries to open that link, **Then** they receive an "invite revoked" message.

---

### User Story 3 - Athlete Registers via Invite Link (Priority: P3)

A potential athlete receives a shared invite URL from a coach. Opening the URL reveals a registration form pre-contextualised with the coach's name. The athlete fills in their details and, upon completion, their account is created with the athlete role and they are automatically linked to the inviting coach.

**Why this priority**: This story delivers the end-to-end connection. It depends on P1 and P2 but can be tested once a valid invite URL exists. The athlete perspective is the primary value delivery of the entire feature.

**Independent Test**: Using a valid invite URL generated in Story 2, a tester opens the URL in an unauthenticated browser, completes the athlete registration form, and verifies: (a) the account is created with the athlete role, (b) the coach–athlete relationship exists, and (c) the invite link is now marked as used.

**Acceptance Scenarios**:

1. **Given** a valid invite URL opened by an unauthenticated user, **When** the page loads, **Then** the registration form is displayed showing the inviting coach's name and a clear label that the account being created is for an athlete.
2. **Given** a completed athlete registration form with valid details, **When** the athlete submits, **Then** their account is created with the athlete role, they are signed in, and they are linked to the inviting coach.
3. **Given** a valid invite URL opened by an already-authenticated user, **When** the page loads, **Then** they are informed the invite is for a new user and are given the option to log out and continue, or to cancel.
4. **Given** an athlete who completes registration via invite, **When** the coach next views their athlete list, **Then** the newly registered athlete appears in the coach's roster.
5. **Given** a valid invite URL, **When** two different users attempt to use it simultaneously (race condition), **Then** only the first successful submission registers; the second receives an "invite already used" error.

---

### User Story 4 - Account Deletion (Priority: P4)

An authenticated user (coach or athlete) wants to permanently delete their account. The option is available in User Settings. The flow requires two explicit confirmation steps to prevent accidental deletion: first a CTA confirmation, then typing their username to confirm intent. Upon completion, the account and all associated personal data are deleted, the session is terminated, and the user is redirected to the login page.

**Why this priority**: Account deletion is required for GDPR compliance (right to erasure) and builds trust with users. It depends on accounts existing (P1/P3) but can be developed and tested independently once a user is logged in.

**Independent Test**: A tester logs in as any user, navigates to User Settings, triggers account deletion, completes both confirmation steps, and verifies: (a) the session ends, (b) they are redirected to login, and (c) attempting to log in with the deleted credentials fails.

**Acceptance Scenarios**:

1. **Given** an authenticated user in User Settings, **When** they click the "Delete Account" CTA, **Then** a first confirmation dialog is shown that clearly describes the consequences of deletion (data loss, access termination) with a prominent "Confirm Delete" button and a "Cancel" option.
2. **Given** the user confirms the first step, **When** the second confirmation step is shown, **Then** they are prompted to type their exact username into a text field and the final "Delete My Account" button is disabled until the input matches exactly.
3. **Given** the user types their username correctly and clicks "Delete My Account", **When** the deletion is processed, **Then** their account and personal data are deleted, their session is immediately terminated, and they are redirected to the login page with a neutral confirmation message.
4. **Given** the user types an incorrect username in the second confirmation step, **When** they attempt to submit, **Then** the "Delete My Account" button remains disabled and an inline hint reminds them to match their exact username.
5. **Given** a coach with pending invite links who deletes their account, **When** deletion completes, **Then** all pending invite links issued by that coach are immediately invalidated and cannot be used to register new athletes.
6. **Given** a coach with linked athletes who deletes their account, **When** deletion completes, **Then** the athletes' accounts remain intact but the coach–athlete relationship is severed; affected athletes are flagged as unlinked (no coach).
7. **Given** a user who clicks "Cancel" at either confirmation step, **When** they dismiss the dialog, **Then** no changes are made and they remain on the User Settings page.

---

### Edge Cases

- What happens when a coach tries to use an athlete invite link they themselves generated?
- How does the system handle invite URLs pre-fetched by social media or messaging link-preview crawlers (which open URLs without user intent)?
- What if an athlete starts registration via invite but abandons mid-form — is the invite still valid and available for later use?
- What if an already-registered athlete (linked to a different coach) attempts to register again using a new invite link?
- What happens to pending invite links when the generating coach account is deactivated or deleted? → Pending invite links are immediately invalidated on coach account deletion (see US4, scenario 5).
- What happens to linked athletes when a coach deletes their account? → Athletes remain intact but are marked as unlinked; no cascade deletion (see US4, scenario 6).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The unauthenticated login/landing page MUST provide a clearly visible "Register as Coach" entry point separate from the existing login flow.
- **FR-002**: The coach registration form MUST collect full name, email address, and password, and MUST enforce password strength (minimum 8 characters, at least one uppercase letter, one number).
- **FR-003**: The system MUST reject duplicate email registrations with a generic error that does not reveal whether a matching account already exists (prevents user enumeration).
- **FR-004**: Upon successful coach registration, the system MUST automatically sign in the coach and redirect them to the coach dashboard without a separate login step.
- **FR-005**: An authenticated coach MUST be able to generate athlete invite links from a dedicated invite management area within the app.
- **FR-006**: Each invite link MUST contain a cryptographically unique, unpredictable token (minimum 128 bits of entropy) and MUST be bound to the generating coach's identity server-side.
- **FR-007**: Invite links MUST expire automatically after 24 hours from the moment of generation. This duration is the default tier value and is designed to be configurable via a future Admin Panel.
- **FR-008**: An authenticated coach MUST be able to revoke any pending (unused, non-expired) invite link at any time, immediately invalidating it.
- **FR-009**: Each invite link MUST be single-use — once an athlete successfully registers with it, it MUST be permanently invalidated server-side.
- **FR-010**: The athlete registration page (accessed via invite link) MUST display the inviting coach's display name to give the athlete context about who invited them.
- **FR-011**: Upon successful athlete registration via invite, the system MUST automatically create the coach–athlete relationship and sign in the athlete without a separate login step.
- **FR-012**: The system MUST prevent an already-authenticated user from completing registration via an invite link; they MUST explicitly log out before proceeding.
- **FR-013**: The system MUST record all invite lifecycle events (created, first-opened, used, expired, revoked) with timestamps for audit and support purposes.
- **FR-014**: Invite link URLs MUST contain only the opaque token — no internal database identifiers, coach IDs, or email addresses MUST appear in the URL.
- **FR-015**: Coach and athlete registration forms MUST be protected against automated bot submission using server-side rate limiting and honeypot fields.
- **FR-016**: All role assignment and coach–athlete relationship creation MUST be enforced server-side; client-provided role claims MUST be ignored.
- **FR-017**: Upon successful athlete registration via invite, the system MUST issue a fresh session with a new session ID; any session state accumulated during invite page browsing MUST be discarded (prevents session fixation).
- **FR-018**: Both coach and athlete registration forms MUST display a link to the app's Privacy Notice before the user submits; submission implies acceptance of the stated data processing terms.
- **FR-020**: A coach MUST be limited to generating 5 invite links per calendar day (resets at midnight UTC). The invite management UI MUST clearly display the daily limit, the number of invites already generated today, and the reset time.
- **FR-021**: The daily invite limit MUST be enforced server-side and designed to be configurable per subscription tier in future; the current value of 5 is the default tier ceiling.
- **FR-019**: The system MUST support erasure of a user's personal data (name, email) on request, without breaking referential integrity of training records or the coach–athlete relationship structure.
- **FR-022**: On a personal data erasure request, invite records linked to the erased user MUST have their personal identifiers (coach and athlete references, names) anonymised; the event structure, status, and timestamps MUST be retained to preserve audit trail continuity.
- **FR-023**: User Settings MUST include an account deletion option accessible to all authenticated users (coach and athlete roles).
- **FR-024**: Account deletion MUST require two sequential confirmation steps: (1) an explicit CTA confirmation dialog describing consequences, followed by (2) the user typing their exact username into a text field; the final submit button MUST remain disabled until the typed value matches exactly.
- **FR-025**: Upon confirmed account deletion, the system MUST immediately terminate the user's active session, delete or anonymise all personal data, and redirect the user to the login page.
- **FR-026**: When a coach account is deleted, all pending invite links issued by that coach MUST be immediately and permanently invalidated.
- **FR-027**: When a coach account is deleted, linked athlete accounts MUST NOT be deleted; the coach–athlete relationship MUST be severed and affected athletes flagged as unlinked.

### Key Entities

- **Coach Account**: A user account with the "coach" role; can generate invite links and manage a roster of linked athletes.
- **Athlete Account**: A user account with the "athlete" role; always linked to exactly one coach (the one who invited them) at registration time.
- **Invite**: A record representing a single invite link; attributes include unique token, issuing coach, creation timestamp, expiry timestamp, status (pending / used / revoked / expired), and linked athlete once consumed.
- **Coach–Athlete Relationship**: An association between one coach account and one athlete account; created automatically when an athlete completes invite-based registration and used to scope data access throughout the app.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new coach can complete account registration in under 90 seconds from first landing on the registration form.
- **SC-002**: A coach can generate and copy an athlete invite link in under 30 seconds.
- **SC-003**: An athlete can complete registration via an invite link in under 2 minutes from opening the URL.
- **SC-004**: 100% of used, expired, or revoked invite links are rejected on any subsequent access attempt — zero false acceptances.
- **SC-005**: 100% of invite tokens are unique across all generated invites — zero collisions.
- **SC-006**: Expired invite links (older than 24 hours) are rejected automatically with no manual cleanup required.
- **SC-007**: 100% of coach–athlete relationships created through the invite flow are correctly stored — zero orphaned athletes (no linked coach) or ghost links (link to a non-existent account).
- **SC-008**: No personally identifiable information (email address, internal IDs) is exposed in the invite URL or in error messages returned to unauthenticated users.
- **SC-009**: All invite lifecycle events are captured in the audit log with zero data loss under normal operating conditions.
- **SC-010**: A user's personal data erasure request is fully processed (name and email removed or anonymised) within 30 days of the request.
- **SC-011**: A user can complete the full account deletion flow (both confirmation steps) in under 60 seconds.
- **SC-012**: 100% of deleted accounts result in immediate session termination — zero cases of a deleted account remaining accessible in an active session.

## Clarifications

### Session 2026-03-09

- Q: After athlete registration via invite, what session behaviour is expected? → A: Fresh session created — new session ID issued on registration success; any prior invite-page session state is discarded.
- Q: Is the app GDPR-applicable (EU users possible)? → A: Yes — registration must include a privacy notice link; personal data must be erasable on request.
- Q: Maximum invite links a coach can generate per day? → A: 5 per day; limit and remaining count must be visible in the UI; designed to be subscription-tier-configurable in future.
- Q: What language should the athlete invite landing page display in (no locale in URL)? → A: Browser language preference first; fall back to Polish (app default) if the detected language is unsupported.
- Q: What is the data retention policy for invite records under GDPR? → A: Anonymise on erasure request — personal identifiers (coach/athlete references) are removed from invite records but event structure and timestamps are retained for audit continuity.

## Assumptions

- Email verification (confirming the registrant owns the email address) is out of scope for this iteration; accounts are trusted immediately upon registration. Email verification can be layered on later without breaking the invite flow.
- The invite URL format is: `[app-domain]/invite/[opaque-token]` — locale prefix is omitted from invite URLs to avoid ambiguity. The invite landing page renders in the athlete's browser language preference; if unsupported, it falls back to Polish (app default). After successful registration the athlete is redirected to the appropriate locale-prefixed route.
- A coach is limited to generating 5 invite links per calendar day (default tier). The total number of simultaneously pending invites is not capped separately; the daily generation limit acts as the primary throttle. This limit is designed to become subscription-tier-configurable in future.
- An athlete is linked to exactly one coach at registration time; multi-coach support is out of scope.
- Coach accounts cannot be created via an invite link — invite links exclusively produce athlete accounts.
- Password reset flows are assumed to be handled by the existing authentication infrastructure and are not part of this feature.
- Bot protection at registration will use server-side rate limiting and honeypot fields as a first line of defence; a third-party CAPTCHA service is considered a future enhancement if abuse is observed.
- Link-preview crawlers (Slack, WhatsApp, iMessage) that open invite URLs automatically will only trigger a read of the invite metadata (coach name display); they MUST NOT consume the invite or mark it as opened until a human submits the registration form.
