# Feature Specification: Athlete Self-Planning & Coach Personal Profile

**Feature Branch**: `007-athlete-planning`
**Created**: 2026-03-10
**Status**: Draft

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Coach Enables Athlete Self-Planning (Priority: P1)

A coach views a specific athlete and flips a toggle to allow that athlete to manage their own training sessions. From that moment, when the athlete opens their week view they see the same session creation and editing controls a coach would use, allowing them to plan independently alongside any coaching input.

**Why this priority**: This is the primary unlock mechanism. Without it athletes remain fully read-only, so it is the minimum viable change that makes self-planning possible at all.

**Independent Test**: Coach enables self-planning for an athlete → log in as that athlete → confirm session creation controls are visible and functional in the week view. Disable the toggle → confirm controls disappear.

**Acceptance Scenarios**:

1. **Given** self-planning is disabled for an athlete, **When** the athlete views their week, **Then** no session creation, editing, or deletion controls are visible.
2. **Given** a coach is managing an athlete, **When** the coach enables self-planning for that athlete, **Then** the athlete gains session creation, editing, and deletion controls in their week view on next navigation.
3. **Given** self-planning is enabled by the coach, **When** the coach disables it and the athlete has not independently enabled it, **Then** the athlete's week view reverts to read-only.
4. **Given** self-planning is enabled, **When** the athlete edits or creates a session, **Then** the session is saved and visible to both the athlete and the coach.

---

### User Story 2 — Athlete Enables Their Own Self-Planning (Priority: P2)

An athlete opens their settings and toggles on self-planning without needing to ask their coach. The next time they open their week view, session planning controls are available.

**Why this priority**: Empowers athlete autonomy. Some athletes train without a coach or with a coach who prefers not to manage the toggle — this path removes the dependency.

**Independent Test**: Athlete navigates to settings, enables self-planning → navigates to week view → confirms add/edit/delete controls are present. Disables it → controls disappear (unless coach has also enabled it).

**Acceptance Scenarios**:

1. **Given** an athlete is in their settings, **When** they enable self-planning, **Then** session planning controls appear in their week view.
2. **Given** an athlete has enabled self-planning themselves, **When** they disable it, **Then** controls disappear (unless their coach has also enabled it independently).
3. **Given** an athlete has enabled self-planning, **When** a coach views that athlete's profile, **Then** the toggle is shown as on — reflecting the current shared state.
4. **Given** neither party has enabled self-planning, **When** viewed from either the coach or athlete side, **Then** the athlete week view is read-only.

---

### User Story 3 — Coach Manages Their Own Training Plan (Priority: P3)

A coach opens the athlete picker and finds a "Myself" entry at the top — visually distinct from their athletes. Selecting it takes them to a week view where they have full access to both plan sessions (planning capability) and mark them complete with performance notes (athlete capability). They experience the product exactly as their athletes do, from the same interface.

**Why this priority**: High-value for coaches who also train. Lets coaches validate the athlete experience firsthand with no extra account or registration required.

**Independent Test**: Coach selects "Myself" in the athlete picker → navigates to their own week → creates a session, marks it complete, and adds a performance note. Switch to a real athlete → confirm data is fully isolated.

**Acceptance Scenarios**:

1. **Given** a coach opens the athlete picker, **When** it renders, **Then** a "Myself" entry appears first, before all athlete entries, with a distinct visual treatment that makes it immediately recognisable without reading text.
2. **Given** a coach selects "Myself", **When** they view their week, **Then** they can create, edit, and delete sessions AND mark sessions complete and add performance notes in the same view.
3. **Given** a coach selects "Myself" and then switches to an athlete, **When** navigating, **Then** the two sets of data are completely isolated — changes to one never affect the other.
4. **Given** a coach has never planned for themselves, **When** they open their own week view for the first time, **Then** an empty state prompts them to create their first session.
5. **Given** a coach is viewing "Myself", **When** they perform any athlete action (mark complete, add note), **Then** the action is saved identically to how it would work for a real athlete.

---

### Edge Cases

- What happens if coach and athlete change the toggle at the same time? Last write wins; the state displayed to both always reflects the most recent change.
- What happens when an athlete with self-planning enabled is removed from a coach's roster? Their self-set permission and data persist; only the coach-granted portion is cleared.
- What happens if a coach selects "Myself" and has no data yet? Same empty state as any new athlete with no plans.
- What happens when an athlete with self-planning enabled has sessions that were coach-created? They can edit or delete those too — no ownership distinction within a week.
- What happens when a coach views "Myself" and Strava is connected? All athlete features including Strava sync work for their own profile.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Each athlete MUST have a single shared self-planning toggle that both the coach and the athlete can read and write.
- **FR-002**: Changing the toggle from either side MUST immediately update the shared state visible to both parties.
- **FR-003**: When self-planning is active for an athlete, session creation, editing, and deletion controls MUST appear in the athlete's week view.
- **FR-004**: When self-planning is inactive, the athlete week view MUST remain read-only for session management (completion, notes, and performance entry remain available).
- **FR-005**: Coaches MUST be able to toggle self-planning for any assigned athlete from within their current coaching interface without navigating to a separate settings area.
- **FR-006**: Athletes MUST be able to toggle their own self-planning permission from their settings.
- **FR-007**: Self-planning toggle state MUST persist across logout and login.
- **FR-008**: The coach's own profile MUST appear as a selectable entry in the athlete picker, always positioned first before all athlete entries.
- **FR-009**: The coach's own entry in the picker MUST be visually distinct from athlete entries (label, colour, or badge — not just position alone).
- **FR-010**: When a coach selects their own profile, the resulting week view MUST provide both planning controls (create, edit, delete sessions) and athlete controls (mark complete, add performance notes) simultaneously.
- **FR-011**: The coach's personal training data MUST be fully isolated from their athletes' data; no query, display, or action on one must affect the other.
- **FR-012**: No additional registration or profile creation step MUST be required for a coach to access their own training plan — the capability is available by default.

### Key Entities

- **Self-Planning Permission**: A single shared boolean toggle per athlete, enabled by default. Either the coach or the athlete can flip it; both see the same current state. Last write wins. Persists across sessions.
- **Coach Personal Profile**: The coach's implicit athlete identity using the same account without extra registration. Always present as the first entry in the athlete picker. When selected, grants the union of planning and athlete capabilities.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An athlete with self-planning enabled can create a new training session in under 30 seconds from their week view.
- **SC-002**: A coach can enable or disable self-planning for an athlete in 2 interactions or fewer from their current coaching context.
- **SC-003**: The "Myself" entry in the athlete picker is visually distinguishable at a glance without reading any label text.
- **SC-004**: A coach accessing their own week view can complete the full session-marking flow (mark complete + add note) in the same number of steps as any athlete — no additional steps due to dual role.
- **SC-005**: Self-planning permission state change is reflected in the athlete's week view within one navigation — no hard refresh required.
- **SC-006**: Switching between "Myself" and an athlete in the picker produces correctly isolated data with no cross-contamination visible to the user.

---

## Assumptions

- Self-planning grants full session CRUD (create, edit, delete) — not a partial or tiered permission.
- Coaches can still view, edit, delete, and comment on sessions that an athlete created with self-planning — no ownership restriction within a week plan.
- The "Myself" coach entry does not need an explicit setup step; it is present for all coaches by default.
- Self-planning is a single shared toggle — not two independent flags. Either party can change it; the state is the same for both.
- Self-planning permission is scoped per athlete, not applied globally across all of a coach's athletes at once.
- The visual treatment for the "Myself" picker card reuses existing design tokens — no new colours or components needed.
- Athlete-created sessions and coach-created sessions are equal in all respects — no visual distinction needed between their origins within the same week.
