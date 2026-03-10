# Feature Specification: Public Landing Page

**Feature Branch**: `008-landing-page`
**Created**: 2026-03-10
**Status**: Draft
**Input**: User description: "Add a landing page that describes what the app does and that is the customer proposition. This should be a SPA with menu at the top that navigates by scrolling to anchors. The anchors should be: Get Started, Why Synek, Features, Log In, Join Beta (registration), Contact with feedback form. App is in BETA — accounts are free. Registration is open to both coaches and athletes. Encourage feedback throughout."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Prospect Discovers and Evaluates the App (Priority: P1)

A potential customer (coach or athlete) lands on the Synek homepage for the first time. They want to quickly understand what the product does, who it is for, and why they should use it. They scroll through the page and read the key sections before deciding whether to sign up. The page communicates that Synek is in public beta and that joining is free — and frames giving feedback as a valued part of the beta experience.

**Why this priority**: This is the primary conversion funnel entry point. Without a compelling value proposition and clear beta messaging, no visitor will proceed to registration or login.

**Independent Test**: Accessible at the root URL with no authentication required; renders the full page with all sections visible and beta positioning clearly communicated.

**Acceptance Scenarios**:

1. **Given** a visitor arrives at the landing page, **When** the page loads, **Then** a sticky top navigation bar is visible with links: Get Started, Why Synek, Features, Log In, Join Beta, Contact.
2. **Given** a visitor clicks a navigation link, **When** the link is activated, **Then** the page smoothly scrolls to the corresponding anchor section.
3. **Given** a visitor reads the hero section, **When** they view the page, **Then** the headline clearly communicates what Synek does, that it is in beta, and that joining is free.
4. **Given** a visitor reads the page, **When** they encounter calls to action, **Then** the messaging encourages them to try the app and share feedback.

---

### User Story 2 - Visitor Joins the Beta (Priority: P2)

A prospect who has read the landing page decides to create a free beta account — as either a coach or an athlete. They click "Join Beta" in the nav or a CTA, select their role, and complete the registration form.

**Why this priority**: Beta sign-up is the primary conversion goal of the landing page. The form must support both roles and clearly communicate free access.

**Independent Test**: Clicking "Join Beta" scrolls to the registration section; selecting a role and submitting valid details creates an account of that role and redirects the user into the app.

**Acceptance Scenarios**:

1. **Given** a visitor clicks "Join Beta" in the navigation, **When** the click is triggered, **Then** the page scrolls to the Join Beta section containing a registration form.
2. **Given** the registration form, **When** a visitor views it, **Then** they can select their role: Coach or Athlete.
3. **Given** the registration form with a role selected, **When** a visitor submits valid details (name, email, password), **Then** an account of the selected role is created and the user is redirected to their role-appropriate home.
4. **Given** the registration form, **When** a visitor submits an already-registered email, **Then** an informative error message is shown below the email field.
5. **Given** the registration form, **When** a visitor submits with missing required fields, **Then** inline validation errors appear for each missing field without page reload.
6. **Given** the Join Beta section, **When** a visitor views it, **Then** the section clearly communicates that the app is in beta, accounts are free, and feedback is welcome.

---

### User Story 3 - Existing User Logs In from Landing Page (Priority: P3)

An existing Synek user arrives at the landing page and wants to access their account. They click "Log In" in the navigation or the dedicated Log In section.

**Why this priority**: Returning users must not be forced to navigate away from the landing page to find the login entry point.

**Independent Test**: Clicking "Log In" scrolls to the Log In section; the login form authenticates and redirects existing users to their role-appropriate home.

**Acceptance Scenarios**:

1. **Given** an existing user clicks "Log In" in the navigation, **When** the click is triggered, **Then** the page scrolls to the Log In section with email and password fields.
2. **Given** a user submits correct credentials, **When** the form is submitted, **Then** the user is authenticated and redirected to their role-appropriate home.
3. **Given** a user submits incorrect credentials, **When** the form is submitted, **Then** an error message is displayed without page reload.

---

### User Story 4 - Visitor Sends Feedback (Priority: P4)

A visitor has a question or feedback about Synek. They scroll to the Contact section and submit the feedback form. The section explicitly welcomes beta feedback and positions it as helping shape the product.

**Why this priority**: Beta-stage products depend on early user feedback. The Contact section doubles as a feedback channel and should be framed accordingly.

**Independent Test**: Submitting the contact form with name, email, and message shows a confirmation message; the section copy references beta and thanks the visitor for contributing.

**Acceptance Scenarios**:

1. **Given** a visitor is in the Contact section, **When** they view it, **Then** the section communicates that feedback helps improve the beta.
2. **Given** a visitor submits a complete form (name, email, message), **When** the form is submitted, **Then** a success confirmation is displayed and the form is cleared.
3. **Given** a visitor submits with missing required fields, **Then** inline validation errors appear.
4. **Given** a visitor submits with an invalid email format, **Then** an error is shown for the email field.

---

### Edge Cases

- What happens when a user who is already authenticated visits the landing page — are they redirected to their dashboard or shown the landing page?
- How does the navigation bar behave on mobile viewports — does it collapse into a hamburger menu?
- What happens when the registration email is already in use?
- What happens if the contact form submission fails (network error)?
- What happens if a visitor submits the registration form without selecting a role?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The landing page MUST be accessible without authentication.
- **FR-002**: The page MUST include a sticky top navigation bar with anchor links to: Get Started, Why Synek, Features, Log In, Join Beta, Contact.
- **FR-003**: Clicking any navigation link MUST smoothly scroll the viewport to the corresponding page section.
- **FR-004**: The page MUST include the following named sections in order: Hero / Get Started, Why Synek, Features, Log In, Join Beta, Contact.
- **FR-005**: The Hero section MUST clearly state Synek's value proposition for coaches and athletes, communicate the beta status, and state that accounts are free.
- **FR-006**: The "Why Synek" section MUST present the key differentiators and benefits of the platform.
- **FR-007**: The "Features" section MUST list the main product features with brief descriptions.
- **FR-008**: The "Log In" section MUST contain a working login form (email and password) that authenticates users and redirects them to their role-appropriate dashboard.
- **FR-009**: The "Join Beta" section MUST contain a registration form that allows the visitor to choose their role (Coach or Athlete) before completing sign-up (name, email, password minimum).
- **FR-010**: The "Join Beta" section MUST communicate that the app is in beta, that accounts are free, and that feedback is encouraged.
- **FR-011**: The registration form MUST validate inputs and display inline errors without full-page reload.
- **FR-012**: The "Contact" section MUST contain a feedback form (name, email, message) that submits successfully and shows a confirmation; section copy MUST reference beta and frame feedback as shaping the product.
- **FR-013**: All public-facing forms MUST include honeypot spam protection.
- **FR-014-A**: The Contact form MUST capture the authenticated user's ID when submitted by a logged-in user, storing `null` for anonymous visitors — enabling the team to distinguish internal user feedback from pre-signup feedback.
- **FR-014-B**: When a logged-in user opens the Contact section, their name and email MUST be prefilled from their profile; the fields remain editable before submission.
- **FR-014**: The page MUST be responsive and usable on mobile, tablet, and desktop viewports.
- **FR-015**: The navigation bar MUST remain visible (sticky) while the user scrolls the page.
- **FR-016**: After successful registration, the user MUST be signed in automatically and redirected to their role-appropriate dashboard (coach home for Coach, athlete home for Athlete).

### Key Entities

- **Landing Visitor**: Unauthenticated user browsing the page; no persistent state required.
- **Beta Registration**: New account created via the Join Beta form; role (Coach or Athlete) is selected by the visitor during sign-up.
- **Feedback Submission**: Name, email, and message submitted by a visitor. Carries an optional link to an authenticated user's profile — `null` for anonymous, user ID for logged-in users. Read by the team via the Supabase dashboard.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time visitor can understand Synek's purpose, target audience, and beta status within 10 seconds of the page loading.
- **SC-002**: A visitor can navigate to any section of the page within 2 interactions (one click from the navigation).
- **SC-003**: A new user can complete beta registration (either role) and reach their dashboard in under 3 minutes.
- **SC-004**: The page is fully functional and readable on screen widths from 375px (mobile) to 1440px (desktop).
- **SC-005**: A visitor submitting the contact form receives a success confirmation within 5 seconds.
- **SC-006**: All form validation errors are visible to the user without requiring a page reload.
- **SC-007**: The page loads and becomes interactive within 3 seconds on a standard broadband connection.
- **SC-008**: Beta messaging (free accounts, feedback welcome) is visible in at least two distinct sections of the page.

## Assumptions

- Both Coach and Athlete roles can self-register via the landing page; the athlete invite flow remains available but is no longer the only path for athletes.
- The landing page is served as part of the existing SPA — no SSR or separate deployment required.
- Contact form submissions are stored in a `feedback_submissions` Supabase table. The team reads feedback directly via the Supabase dashboard — no admin UI is built in this feature.
- Page copy (headlines, feature descriptions, value propositions) will be provided in both English and Polish to align with the existing i18n setup.
- The routing integration (how the landing page coexists with the current root redirect to `/:locale`) is deferred to planning.
- An authenticated user visiting the landing page will be redirected to their dashboard (to be confirmed in planning).
- The "Join Beta" label replaces "Free Trial" everywhere in the UI and copy; it better reflects the product stage and the free-access model.
