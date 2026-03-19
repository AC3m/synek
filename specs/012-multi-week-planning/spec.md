# Feature Specification: Multi-Week Planning View & Copy/Drag

**Feature Branch**: `012-multi-week-planning`
**Created**: 2026-03-19
**Status**: Draft
**Input**: User description: "Design sleek UX and plan implementation for streamlining training planning for coach. Coach wants to be able to have multiple week view to analyse previous weeks (at least previous 4 weeks). Coach wants to be able to copy previous training or individual days/sessions to the planned week. Add drag and drop possibility to easily move and adjust trainings between days within a week."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Multi-Week Overview (Priority: P1)

A coach navigates to the planning page and sees a scrollable/paginated view showing the current week alongside the 4 most recent previous weeks. Each week is displayed in the familiar 7-column grid format, allowing the coach to compare training loads, spot patterns, and make informed planning decisions without leaving the page.

**Why this priority**: This is the foundational view that enables all other features. Without seeing historical weeks, copy and drag-and-drop operations lose context. Coaches currently must navigate back week-by-week to review past training — this view collapses that friction.

**Independent Test**: Can be fully tested by navigating to the coach planning page and verifying that at least 5 weeks (current + 4 previous) are visible, scrollable, and correctly display their sessions.

**Acceptance Scenarios**:

1. **Given** a coach is on the planning page, **When** the page loads, **Then** the current week and the 4 most recent previous weeks are displayed, with the current week visually highlighted as the active/target week.
2. **Given** a coach is viewing the multi-week layout, **When** they scroll or navigate between weeks, **Then** each week header shows the ISO week label (e.g., "W10 — Mar 3–9") and the week's total planned session count as a summary badge.
3. **Given** previous weeks exist with sessions, **When** displayed in the multi-week view, **Then** those sessions appear in read-only mode with their sport colour, title, and planned duration — the same visual fidelity as the current week.
4. **Given** a previous week has no sessions, **When** displayed, **Then** empty day cells are shown without placeholders or error states — consistent with the current week's empty state.

---

### User Story 2 - Copy Day or Entire Week (Priority: P2)

A coach looking at a previous week can copy an entire week's training plan or copy a single day's sessions to the currently planned week. This enables reuse of proven training blocks without manual re-entry.

**Why this priority**: The highest-value workflow for coaches is replicating successful training blocks. Copying whole weeks or days covers 80% of planning repetition. It delivers tangible time savings independently of drag-and-drop.

**Independent Test**: Can be fully tested by copying a past week or a single day onto the current week and verifying all sessions appear in the correct days with their original details preserved.

**Acceptance Scenarios**:

1. **Given** a coach opens a context menu on a previous week's header, **When** they select "Copy week to current week", **Then** all sessions from that previous week are duplicated into the corresponding days of the current week, preserving sport type, title, duration, and notes.
2. **Given** a coach opens a context menu on a day column header in a previous week, **When** they select "Copy day to [target day]", **Then** all sessions from that day are duplicated into the selected target day in the current week.
3. **Given** the current week already has sessions in the target day, **When** a copy action is performed, **Then** the copied sessions are appended after existing sessions (not replacing them), and the coach sees a brief confirmation notice.
4. **Given** a copy operation completes, **When** the coach views the current week, **Then** copied sessions are shown as new independent sessions — editing or deleting a copy does not affect the original.
5. **Given** a coach copies sessions from a previous week, **When** the sessions have type-specific data (e.g., run target pace, distance), **Then** all planned data is preserved in the copies.

---

### User Story 3 - Copy Individual Session (Priority: P3)

A coach can copy a single session from any visible previous week and place it on a specific day in the current week. This provides fine-grained control when only one or two sessions from a past week are worth repeating.

**Why this priority**: Granular session copy is a natural extension of day/week copy. It handles the common scenario where only a single key workout (e.g., a threshold run) should repeat. Lower priority than P2 because day-copy already covers multi-session days.

**Independent Test**: Can be fully tested by selecting a single session from a previous week, choosing a target day, and verifying it appears correctly in the current week.

**Acceptance Scenarios**:

1. **Given** a coach hovers over a session in a previous week, **When** they click a "Copy" action (icon button or context menu), **Then** a target day selector appears (within the current week) and the session is copied to the chosen day upon confirmation.
2. **Given** a copy of an individual session completes, **When** the current week is refreshed, **Then** the session appears with all original planned fields (type, title, duration, notes, type-specific data) intact.

---

### User Story 4 - Drag and Drop Sessions Within a Week (Priority: P4)

A coach can drag a session from one day to another within the same (current) week to quickly reschedule training without opening and editing each session individually.

**Why this priority**: Drag-and-drop reduces planning friction for quick rescheduling (e.g., moving a hard workout from Wednesday to Thursday due to athlete fatigue). It is additive to the core copy feature and can be enabled/disabled without breaking other flows.

**Independent Test**: Can be fully tested by dragging a session card from one day column to another within the current week and verifying the session moves, persists, and the original day no longer shows it.

**Acceptance Scenarios**:

1. **Given** a coach is viewing the current week, **When** they drag a session card and drop it on a different day column, **Then** the session moves to that day, the source day no longer shows it, and the change is persisted immediately.
2. **Given** a coach drags a session, **When** they hover over a valid drop target (another day), **Then** the target day column shows a visual drop indicator (highlighted border or insertion line).
3. **Given** a coach begins dragging a session but releases it outside any valid drop zone, **When** the drag is cancelled, **Then** the session returns to its original position and no change is saved.
4. **Given** a coach drags a session onto a day that already has sessions, **When** dropped, **Then** the session is appended at the end of that day's session list and sort order is updated accordingly.
5. **Given** the coach needs to move a session without using drag-and-drop, **When** they open the session's action menu, **Then** a "Move to day" option is available as a keyboard/tap-accessible fallback.

---

### Edge Cases

- What happens when all 4 previous weeks have no sessions (new athlete/coach)? — Previous week columns show empty states gracefully; copy actions are disabled or hidden with a tooltip explaining no sessions exist.
- What happens when copying a session whose sport type has been removed? — The session is copied with its original type data preserved; a warning indicator is shown.
- What happens if a coach attempts drag-and-drop on a previous week (read-only)? — Previous weeks do not allow drag-and-drop; drag handles are not rendered on read-only session cards.
- What happens when the coach copies sessions that would create many sessions in one day? — Sessions are added and the day column scrolls vertically; no hard limit is enforced.
- What happens during a slow or failed network request after a copy? — Optimistic UI shows the copied sessions immediately; if the request fails, the copied sessions are removed and an error toast is displayed.
- What happens if the drag-and-drop is interrupted by a page scroll? — The drag is cancelled and the session returns to its original position.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The planning view MUST display the current week and the 4 most recent previous weeks simultaneously in a scrollable or paginated multi-week layout, requiring no additional navigation clicks.
- **FR-002**: Each week MUST display a header showing the ISO week number, date range (e.g., "W10 — Mar 3–9, 2026"), and the total number of planned sessions for that week.
- **FR-003**: Sessions in previous weeks MUST be displayed in read-only mode — adding, editing, deleting, and drag-and-drop are not permitted on past week sessions from this view.
- **FR-004**: The coach MUST be able to copy an entire week's sessions to the current week via a week-level action (e.g., context menu on week header or dedicated "Copy week" button).
- **FR-005**: The coach MUST be able to copy all sessions from a single day in a previous week to a specific day in the current week.
- **FR-006**: The coach MUST be able to copy an individual session from any visible previous week to a specific day in the current week.
- **FR-007**: When copying sessions (week, day, or individual), the system MUST preserve all planned fields: sport type, title, planned duration, coach notes, and type-specific data.
- **FR-008**: Copied sessions MUST be independent records — changes to a copy MUST NOT affect the original, and vice versa.
- **FR-009**: When a copy targets a day that already has sessions, copied sessions MUST be appended after existing ones without replacing or removing them.
- **FR-010**: After a copy action, the coach MUST receive visible confirmation (e.g., a brief toast notification) indicating how many sessions were copied.
- **FR-011**: The coach MUST be able to drag and drop sessions between day columns within the current (editable) week.
- **FR-012**: During a drag, the target day column MUST display a visual drop indicator (e.g., highlighted border or insertion marker) when the dragged item hovers over it.
- **FR-013**: Releasing a dragged session outside any valid drop zone MUST cancel the operation and restore the session to its original position without any data change.
- **FR-014**: A successful drag-and-drop MUST update the session's day assignment and sort order persistently (survives page refresh).
- **FR-015**: A keyboard/tap-accessible "Move to day" option MUST be available in each session's action menu as an alternative to drag-and-drop.
- **FR-016**: The multi-week layout MUST be usable on desktop viewports (≥ 1024px wide); smaller viewports MUST show at minimum a scrollable single-week view without breaking.

### Key Entities

- **Week**: A 7-day planning block identified by ISO week number and year (e.g., `2026-W10`). Has a start date (Monday) and a collection of training sessions. In this view, weeks are either "current" (editable) or "previous" (read-only).
- **Training Session**: A single planned workout assigned to a specific day within a week. Has sport type, title, planned duration, optional notes, and type-specific data. Sessions have a `sort_order` controlling display order within a day.
- **Copy Operation**: A user-initiated action that duplicates one or more sessions from a source week/day into target day(s) in the current week. Creates new independent session records; does not transfer actual/Strava/Garmin performance data.
- **Drag-and-Drop Event**: A user interaction that reassigns a session from its current day to a different day within the same (current) week, updating the session's day assignment and sort order.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Coaches can view the current week alongside at least 4 previous weeks without any additional navigation — all weeks visible within one page load and one scroll/swipe gesture.
- **SC-002**: Copying an entire previous week's sessions to the current week completes in a single action (one click + one confirmation) and all sessions appear within 2 seconds under normal conditions.
- **SC-003**: Copying an individual day or session completes in under 3 seconds and the copied sessions are immediately visible in the current week without a page refresh.
- **SC-004**: Drag-and-drop reassignment of a session between days persists within 1 second of drop and survives a page refresh.
- **SC-005**: A coach can fully populate the current week by copying from a single previous week in under 30 seconds — a measurable reduction from manual re-entry.
- **SC-006**: All copy and move operations are individually reversible — the coach can delete any copied or moved session without affecting other sessions.
- **SC-007**: The multi-week layout renders without horizontal overflow on desktop viewports ≥ 1280px wide.
- **SC-008**: Read-only enforcement is absolute — no previous-week session data is modified through any interaction in this view.

## Assumptions

- The coach plans **one week at a time** (the current/upcoming week); previous weeks are always read-only in this view.
- "Current week" means the most recently created or active week plan for the coach — not necessarily the calendar week; coaches can navigate to any future week to plan.
- Copy operations carry over **planned fields only** — actual performance data (Strava, Garmin) is never copied.
- Drag-and-drop is scoped to **within a single week** (the current editable week only); moving sessions across weeks is handled by the copy feature, not drag-and-drop.
- The 4-week history minimum is a floor; the UI may allow scrolling back further if history exists.
- Sort order after a drag-and-drop defaults to appending at the end of the target day; a precise insertion-point UI is a stretch goal.
- Copying does not create a "linked" relationship — copies are always independent sessions from the moment of creation.
