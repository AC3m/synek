# Feature Specification: Auth-Based Role Management

**Feature Branch**: `001-auth-role-management`
**Created**: 2026-03-08
**Status**: Draft
**Input**: User description: "Auth based role management. I want to be able to log in as a coach and as a athlete. Coach can choose which athlete plan he manages and can see only his view."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - User Login & Role-Based Routing (Priority: P1)

A user (coach or athlete) visits the app, sees a login screen, enters their credentials, and is immediately routed to the correct view for their role. A coach lands on the coach dashboard; an athlete lands on their training view. The previous "freely switch between roles by clicking" behaviour is replaced by authentication-enforced role assignment.

**Why this priority**: Without login, there is no identity, and the rest of the feature cannot exist. This is the single gate everything else passes through.

**Independent Test**: A coach account and an athlete account can be created and logged into separately, with each landing on the correct view and being unable to access the other role's UI.

**Acceptance Scenarios**:

1. **Given** a user with the "coach" role, **When** they log in, **Then** they are routed to the coach dashboard and have no access to the athlete-only view.
2. **Given** a user with the "athlete" role, **When** they log in, **Then** they are routed to their training week view and have no access to the coach-only view.
3. **Given** an unauthenticated user who visits any protected route, **When** the page loads, **Then** they are redirected to the login page.
4. **Given** a logged-in user, **When** they log out, **Then** their session is cleared and they are returned to the login page.
5. **Given** invalid credentials, **When** the user submits the login form, **Then** a clear error message is shown and no session is created.

---

### User Story 2 - Coach Selects & Manages an Athlete's Plan (Priority: P2)

After logging in as a coach, the user sees a list of the athletes assigned to them. They pick one athlete, and the entire coach workspace (week grid, session editor) now shows and edits **only that athlete's** training data. Switching to a different athlete reloads the workspace for that athlete.

**Why this priority**: The core product value for a coach — personalised plans per athlete — only works if the coach can explicitly choose whose data they are editing.

**Independent Test**: A coach with two linked athletes can switch between them and see different (isolated) week plans for each, and any session they create is saved only to the selected athlete's plan.

**Acceptance Scenarios**:

1. **Given** a logged-in coach with multiple athletes, **When** they open the app, **Then** they see a picker showing only their assigned athletes (not athletes belonging to other coaches).
2. **Given** a coach who has selected an athlete, **When** they create or edit a training session, **Then** the change is stored under that athlete's plan and not visible to other athletes.
3. **Given** a coach who switches to a different athlete, **When** the athlete changes, **Then** the week grid reloads showing the newly selected athlete's data.
4. **Given** a coach with no assigned athletes, **When** they log in, **Then** they see an empty state explaining they have no athletes yet.

---

### User Story 3 - Athlete Sees Only Their Own Plan (Priority: P3)

An athlete logs in and sees only their own training sessions. They cannot navigate to, or accidentally view, another athlete's plan or any coach-only interface.

**Why this priority**: Data privacy between athletes is essential for trust and correctness; without it, the multi-athlete model is broken.

**Independent Test**: Two athlete accounts exist with different plans. Logging in as each shows only that athlete's plan; no cross-athlete data leaks.

**Acceptance Scenarios**:

1. **Given** two athletes (A and B) with different week plans, **When** athlete A logs in, **Then** they see only their own sessions and cannot see athlete B's sessions.
2. **Given** a logged-in athlete, **When** they try to navigate to a coach route (e.g., `/coach`), **Then** they are redirected away or shown an "access denied" page.
3. **Given** an athlete, **When** they mark a session complete, **Then** only their own completion record is updated — another athlete's identical session remains unchanged.

---

### Edge Cases

- What happens when a coach's session expires mid-use while editing a session? → Unsaved changes are lost; user is redirected to login with a friendly message.
- What happens if an athlete account is removed from a coach's roster while the coach has that athlete selected? → The coach sees a "athlete not found" state and is prompted to select another athlete.
- What happens if an athlete tries to log in but their account exists with the "coach" role instead? → They are routed to the coach view; role determines routing, not the login form.
- What happens when a new coach has no athletes linked yet? → They see an empty state with guidance, not a blank crash.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to log in with an email address and password.
- **FR-002**: System MUST associate each account with exactly one role: "coach" or "athlete".
- **FR-003**: System MUST route authenticated users to their role-appropriate view immediately after login.
- **FR-004**: System MUST prevent unauthenticated users from accessing any view other than the login page.
- **FR-005**: System MUST prevent athletes from accessing coach views and coaches from accessing athlete views (route-level enforcement, not just UI hiding).
- **FR-006**: System MUST allow a coach to see a list of athletes assigned to them.
- **FR-007**: System MUST allow a coach to select one athlete at a time as their active working context.
- **FR-008**: System MUST scope all week plan and session data reads/writes to the currently selected athlete when the coach is active.
- **FR-009**: System MUST ensure each athlete's training data is only visible to that athlete and their assigned coach(es).
- **FR-010**: System MUST allow a user to log out, fully terminating their session.
- **FR-011**: System MUST persist the coach's last-selected athlete across page refreshes within the same session.
- **FR-012**: System MUST display a clear error message when login fails due to wrong credentials.

### Key Entities

- **User**: A person with an account. Has an email, a hashed credential, and a role ("coach" or "athlete"). A user maps to exactly one role.
- **Coach**: A user with the coach role. May be linked to one or more athletes.
- **Athlete**: A user with the athlete role. Belongs to one or more coaches. Owns their own training data (week plans, sessions).
- **Coach–Athlete Relationship**: The link between a coach and an athlete. Determines which athletes a coach can manage and whose data an athlete's coach can access.
- **WeekPlan**: Currently a global entity by week date. After this feature, each WeekPlan belongs to a specific athlete.
- **TrainingSession**: Currently global. After this feature, scoped to an athlete's WeekPlan.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can complete the login flow and reach their role-appropriate view in under 30 seconds from visiting the app.
- **SC-002**: A coach can switch between two assigned athletes and see the correct athlete's data each time, with zero cross-athlete data leakage.
- **SC-003**: 100% of protected routes reject unauthenticated access — no route is reachable without a valid session.
- **SC-004**: An athlete cannot access or read another athlete's training sessions by any navigable path in the application.
- **SC-005**: A logged-out user attempting to access a previously valid URL is redirected to login rather than seeing stale or cached data.

---

## Assumptions

- **Account creation**: Accounts are provisioned out-of-band (e.g., by an admin or directly in the database) for this feature. Self-registration UI is out of scope.
- **Coach–Athlete linking**: The coach–athlete relationship is also provisioned out-of-band for now. A UI to invite or link athletes is out of scope.
- **Single coach per athlete**: An athlete is assumed to be managed by one coach. Multi-coach per athlete is out of scope.
- **Password reset**: Forgotten-password / reset flows are out of scope for this feature.
- **Session duration**: Standard session expiry applies (idle timeout or browser close). No explicit "remember me" toggle needed.
- **Schema migration**: Adding `athlete_id` (owner) to `week_plans` and `training_sessions` is a required database change that comes with this feature. Existing mock data and the single-plan-per-week constraint will need revisiting.
