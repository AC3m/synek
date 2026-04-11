# Feature Specification: Secure Registration

**Feature Branch**: `017-secure-registration`  
**Created**: 2026-04-11  
**Status**: Draft  
**Input**: User description: "Let's specify the proper registration process that's secure. Add email confirmation, captcha (or anything that prevents from bots that's industry standard now) and propose any other mechanism that are applied in such application like ours. Also if low hanging fruit and easy - let's consider GOOGLE saml add-on"

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Email/Password Registration with Confirmation (Priority: P1)

A new user (coach or athlete) visits the registration page, fills out their details, and submits the form. After submission they are shown a "check your email" screen instead of being logged in immediately. They click the confirmation link in their inbox, which verifies their address and redirects them into the app as a logged-in user.

**Why this priority**: Unconfirmed email addresses allow throwaway accounts, enable spam abuse, and prevent password-reset flows from working reliably. This is the most critical security gap in the current flow.

**Independent Test**: Can be fully tested by registering a new account and verifying the confirmation email arrives and the confirmation link works end-to-end, delivering a logged-in session.

**Acceptance Scenarios**:

1. **Given** a visitor on the registration page, **When** they submit valid name/email/password and pass the bot check, **Then** their account is created in an unconfirmed state and a confirmation email is sent to the provided address.
2. **Given** an unconfirmed user, **When** they click the confirmation link in the email, **Then** their email is verified and they are redirected to their dashboard as a logged-in user.
3. **Given** an unconfirmed user, **When** they try to log in before confirming, **Then** they see a clear message that their email address is not yet confirmed, with an option to resend the confirmation email.
4. **Given** a confirmation link older than 24 hours, **When** a user clicks it, **Then** they see an expired-link message and are offered a button to resend a fresh confirmation email.
5. **Given** a valid confirmation link that has already been used, **When** clicked again, **Then** the user is redirected to login with a message that their account is already confirmed.

---

### User Story 2 — Bot Prevention on Registration (Priority: P1)

A visitor submitting the registration form must pass an invisible bot check before the account creation request is sent. Legitimate users complete this without any friction. Automated scripts and bots are blocked at this step.

**Why this priority**: Without reliable bot protection, the existing beta slot limits can be exhausted by automated signups, and spam accounts degrade platform quality.

**Independent Test**: Can be fully tested by verifying that form submissions without a valid bot-check token are rejected, while a normal browser submission succeeds.

**Acceptance Scenarios**:

1. **Given** a normal user filling out the registration form in a browser, **When** they submit, **Then** the bot check completes invisibly in the background and does not add friction to the experience.
2. **Given** an automated script sending a registration request without a valid bot-check token, **When** the request reaches the backend, **Then** it is rejected with an error and no account is created.
3. **Given** a user whose bot check flags them as suspicious, **When** they submit, **Then** they see a clear error message and are not registered.

---

### User Story 3 — Google Sign-In (Priority: P2)

A visitor can register or log in using their existing Google account by clicking "Continue with Google". No password is required. On first use they are prompted to select their role (coach or athlete) before being taken to their dashboard.

**Why this priority**: Social login reduces registration friction and eliminates the weakest-password problem. Google OAuth is natively supported by the existing auth infrastructure with minimal configuration overhead — it is the lowest-effort, highest-value auth addition.

**Independent Test**: Can be fully tested by clicking "Continue with Google", completing the Google OAuth consent flow, selecting a role, and verifying a new account is created and the dashboard is accessible on subsequent logins without a role prompt.

**Acceptance Scenarios**:

1. **Given** a new visitor who clicks "Continue with Google", **When** they authorise the app in the Google consent screen, **Then** they are redirected back to a role-selection step before entering the app.
2. **Given** a new Google user who has selected their role, **When** the flow completes, **Then** an account is created, email is treated as confirmed (Google already verified it), and they land on their dashboard.
3. **Given** a returning Google user, **When** they click "Continue with Google", **Then** they are logged in directly without a role prompt.
4. **Given** an email address already registered via email/password, **When** the same address signs in via Google, **Then** the accounts are linked and the user is logged in without creating a duplicate account.

---

### User Story 4 — Rate Limiting on Auth Endpoints (Priority: P2)

Registration and the "resend confirmation" action are protected against brute-force and enumeration attacks by rate limiting at the backend. Users who hit the limit see a clear wait-and-retry message.

**Why this priority**: Without rate limits, bots can enumerate registered email addresses and exhaust confirmation-email quotas. It is a low-effort, high-impact hardening measure that pairs directly with the bot prevention story.

**Independent Test**: Can be fully tested by sending more than the allowed number of registration or resend-confirmation requests from the same origin within the rate window and verifying subsequent requests are rejected with an appropriate message.

**Acceptance Scenarios**:

1. **Given** more than 5 registration attempts from the same IP within 10 minutes, **When** the 6th attempt is submitted, **Then** it is rejected with a "too many attempts, please try again later" message.
2. **Given** a user who has requested 3 confirmation resends within an hour, **When** they request another, **Then** they see how long to wait before the next resend is available.
3. **Given** a legitimate user who was rate-limited, **When** the rate window expires, **Then** they can retry without any account-level penalty.

---

### User Story 5 — Password Reset (Priority: P2)

A registered user who has forgotten their password can request a reset link from the login page. They receive an email with a secure link that takes them to a page where they set a new password. After setting a new password they are logged in and taken to their dashboard.

**Why this priority**: Password reset is a standard expectation for any email/password auth flow. It is directly unblocked by the email confirmation work (Story 1) since it relies on the same verified-email channel. Without it, users who forget their password have no self-service recovery path.

**Independent Test**: Can be fully tested by requesting a reset link for a confirmed account, clicking the link, setting a new password, and verifying the old password no longer works and the new one does.

**Acceptance Scenarios**:

1. **Given** a user on the login page who clicks "Forgot password?", **When** they enter their registered email and submit, **Then** a password-reset email is sent to that address and they see a "check your email" confirmation message.
2. **Given** a user who enters an email address that is not registered, **When** they submit the forgot-password form, **Then** they see the same "check your email" confirmation message (no enumeration of registered addresses).
3. **Given** a valid, unexpired reset link, **When** the user clicks it and enters a new password that meets the password policy, **Then** their password is updated and they are logged in.
4. **Given** a reset link older than 1 hour, **When** clicked, **Then** the user sees an expired-link message and is prompted to request a new one.
5. **Given** a reset link that has already been used, **When** clicked again, **Then** the user sees an invalid-link message.
6. **Given** a Google-only account (no password set), **When** the user tries to use "Forgot password?", **Then** they see a message explaining their account uses Google sign-in and no reset email is sent.

---

### Edge Cases

- What happens when a user registers with an email domain that bounces (undeliverable)? The account is created but the confirmation never arrives — the resend flow must be accessible from the login page.
- What happens if a user closes the tab after registering but before confirming and then tries to re-register with the same email? The system should recognise the existing unconfirmed account and resend the confirmation rather than creating a duplicate.
- What happens when a confirmation email link is opened on a different device or browser? It must work — links must be stateless tokens, not session-bound.
- What happens if a Google OAuth callback is replayed or the state parameter is missing/tampered with? The callback must be rejected to prevent CSRF on the OAuth return.
- What happens when a Google-authenticated user's email matches an existing unconfirmed email/password account? The account should be confirmed and linked rather than creating a duplicate.
- What happens if a password-reset link is requested for an unconfirmed account? The system should prompt the user to confirm their email first rather than sending a reset link.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST send a confirmation email to the registered address immediately after a new email/password account is created.
- **FR-002**: System MUST block login for unconfirmed email/password accounts and display a clear message with a "Resend confirmation email" action.
- **FR-003**: System MUST expire confirmation links after 24 hours and allow users to request a fresh link from the login page.
- **FR-004**: System MUST include an invisible bot-prevention widget (Cloudflare Turnstile) on the registration form; the token MUST be validated server-side before the account is created.
- **FR-005**: System MUST reject registration requests that do not carry a valid, unexpired bot-check token.
- **FR-006**: System MUST offer "Continue with Google" as an alternative to email/password registration on both the registration and login pages.
- **FR-007**: System MUST prompt first-time Google users to select a role (coach or athlete) before entering the app.
- **FR-008**: System MUST treat the email address of a Google-authenticated user as confirmed.
- **FR-009**: System MUST link a Google sign-in to an existing email/password account when the Google email matches an existing confirmed account, rather than creating a duplicate.
- **FR-010**: System MUST rate-limit registration attempts to a maximum of 5 per IP address per 10-minute window.
- **FR-011**: System MUST rate-limit confirmation-email resend requests to a maximum of 3 per IP address per hour.
- **FR-012**: System MUST retain the existing honeypot field as a lightweight first-pass bot filter alongside the Turnstile check.
- **FR-013**: System MUST log security-relevant registration events (account created, confirmation sent, confirmation completed, rate limit triggered, bot check failed) for audit purposes.
- **FR-014**: System MUST provide a "Forgot password?" link on the login page that initiates a password-reset flow via email.
- **FR-015**: System MUST send a password-reset email regardless of whether the submitted address is registered, to prevent enumeration of registered accounts.
- **FR-016**: System MUST expire password-reset links after 1 hour and invalidate them after first use.
- **FR-017**: System MUST enforce the existing password policy (min 8 chars, uppercase, digit) when a user sets a new password via the reset flow.
- **FR-018**: System MUST prevent password-reset emails from being sent to Google-only accounts (accounts with no password credential) and instead guide the user to sign in with Google.

### Key Entities

- **Registration Attempt**: Tracks origin IP, timestamp, and outcome (success / rate-limited / bot-blocked) to support rate limiting and audit.
- **Email Confirmation Token**: A short-lived, single-use token tied to a user account; carries created-at and expiry timestamps; invalidated upon first successful use.
- **OAuth Identity**: A record linking an external provider account (Google) to an internal Synek user; stores provider name, provider user ID, and the linked email address.
- **User Account**: Extended with `email_confirmed_at` (nullable) and `registration_method` (email-password | google) attributes.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of new email/password registrations result in a confirmation email being sent before the user can access the app.
- **SC-002**: Automated registration requests without a valid bot-check token are blocked in 100% of test cases.
- **SC-003**: Legitimate users can complete the full registration + email confirmation flow in under 3 minutes.
- **SC-004**: Google sign-in (first-time, including role selection) completes in under 30 seconds under normal network conditions.
- **SC-005**: Rate limiting activates after the defined threshold in 100% of test cases; no legitimate user is permanently locked out.
- **SC-006**: Zero duplicate accounts are created when the same email is used via both email/password and Google paths.
- **SC-007**: Users can complete the full password-reset flow (request → email → new password → logged in) in under 3 minutes.
- **SC-008**: The forgot-password form reveals no information about whether an email address is registered.

## Assumptions

- **Cloudflare Turnstile** is chosen over reCAPTCHA v3 because it is privacy-preserving (no personal data sent to Google), frictionless for most users, and has a free tier appropriate for a beta platform.
- "Google SAML add-on" in the user request is interpreted as **Google OAuth social login** (standard OAuth 2.0 for consumer accounts), not enterprise SAML 2.0 / Google Workspace SSO. The athlete/coach audience does not require enterprise SAML; OAuth social login is the low-hanging-fruit equivalent.
- Email confirmation is handled via the platform's existing auth provider (Supabase), which has built-in support for confirmation emails and token management, rather than a bespoke token system.
- The existing beta slot limits (coach_limit_reached, athlete_limit_reached) remain in effect and apply equally to Google sign-in registrations.
- Confirmation emails are delivered via the existing Supabase email integration. Email deliverability improvements (SPF/DKIM/DMARC) are out of scope for this feature.
- Rate limiting is enforced at the backend function layer using the incoming IP address; no dedicated rate-limiting infrastructure is introduced.
- FR-013 audit logging is implemented via structured `console.log` statements in the Edge Function (surfaced in Supabase Edge Function logs). A dedicated audit database table is deferred to a future operational hardening feature. This makes FR-013 testable: log output is verifiable in Edge Function log streams.
- Password-reset links expire after 1 hour (shorter than confirmation links at 24 hours) because reset links grant immediate account access and are higher-value targets.
- **Current bug (implementation note)**: the `register-user` Edge Function currently passes `email_confirm: true` to `admin.createUser()`, which auto-confirms all accounts. This must be changed to send a real confirmation email as part of Story 1.
