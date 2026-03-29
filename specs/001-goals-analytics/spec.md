# Feature Specification: Goal Management & Analytics Dashboard

**Feature Branch**: `001-goals-analytics`
**Created**: 2026-03-28
**Status**: Draft
**Input**: User description: "Design an UX for goal management and analytics dashboard with an athlete performance. 1. Coach can see cumulative plan for all disciplines but also can switch to see a breakdown for all planned sports as part of a week summary. 2. Coach or athlete can set a goal for a selected number of weeks, this goal is visible in every week where an athlete preps for it. The day of the goal has a special session called competition, distinguished on the UI. It can be any of the disciplines. But its distance and performance is treated separately, not as training but as competition. The competitions can then be analysed separately and are distinguished in week summary too. 3. Coach can open a year/quarter/month/goal period view to analyse athlete performance. The performance can be filtered by sport. 4. Make sure the UX is consistent and follow best practices. Reuse existing user journeys/UI patterns where possible."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Set a Competition Goal (Priority: P1)

A coach or athlete creates a goal (an upcoming competition event) by specifying the competition date, sport discipline, goal distance, and a preparation window (number of weeks leading up to the competition). Once saved, every week within the preparation window displays a banner or indicator linking it to the goal, and the competition day itself contains a special "Competition" session card that is visually distinct from training sessions.

**Why this priority**: Goals are the anchor for the entire feature. Without goals, there are no competition sessions, no goal-period views, and no contextualisation of the week summary breakdown. It is the foundational data creation flow.

**Independent Test**: A coach can create a goal with a future date, verify the competition session appears on the correct day, and confirm prep-week indicators appear on all weeks within the preparation window.

**Acceptance Scenarios**:

1. **Given** a coach is viewing a week plan, **When** they open the goal creation dialog and fill in discipline (e.g. running), competition date, goal distance, and preparation weeks (e.g. 8), **Then** the competition session appears on the competition day and all 8 preceding weeks display a goal preparation indicator.
2. **Given** a goal exists, **When** the competition day is viewed in the week grid, **Then** the session card is styled distinctly (e.g. trophy/medal icon, gold/accent border) and labelled "Competition" instead of a standard session type name.
3. **Given** a goal exists, **When** an athlete views their week plan, **Then** they can see the goal preparation indicator and the competition session card (read-only access to the goal), but cannot edit the goal.
4. **Given** a competition goal is being created, **When** the preparation window extends further back than existing weeks, **Then** only weeks that already exist in the plan receive the preparation indicator; no new weeks are auto-created.
5. **Given** a goal already exists, **When** a coach edits the competition date or preparation weeks, **Then** the preparation indicators update on all previously and newly affected weeks.

---

### User Story 2 - Week Summary Sport Breakdown (Priority: P2)

The week summary panel (currently showing aggregate stats) gains a toggle to switch between a single cumulative view (existing behaviour) and a per-sport breakdown view. In breakdown mode, each planned sport appears as a row with its own session count, planned distance, actual distance, and duration. Competition sessions are visually separated from training sessions within the breakdown.

**Why this priority**: The breakdown view provides the coach with actionable, per-discipline insight during weekly planning. It extends the existing WeekSummary component in a backward-compatible way without requiring a new page.

**Independent Test**: A week with sessions of two different sports can be viewed in breakdown mode, showing each sport's stats separately, with competition sessions grouped distinctly.

**Acceptance Scenarios**:

1. **Given** the week summary is displayed, **When** the coach clicks the "By Sport" toggle, **Then** the summary switches from cumulative stats to a per-sport breakdown, showing one row per discipline that has at least one session that week.
2. **Given** breakdown mode is active, **When** the week contains a competition session, **Then** it appears in a separate "Competitions" row (or is highlighted within its sport row) with a visual distinction from training rows.
3. **Given** breakdown mode is active, **When** the week has only one sport planned, **Then** the breakdown still shows correctly with a single sport row.
4. **Given** the athlete views their week summary, **When** a breakdown mode toggle is present, **Then** they see the same breakdown view as the coach (read-only, no editing).
5. **Given** the user switches between cumulative and breakdown modes, **Then** their preference persists for the duration of the session (does not reset on navigation).

---

### User Story 3 - Performance Analytics View (Priority: P3)

A coach can open a dedicated analytics page for an athlete that displays performance data across a selectable time period (year, quarter, month, or a specific goal preparation period). The view shows training volume (distance, session count, duration) and completion rates. Competitions are shown as milestones on a timeline and can be analysed separately. The data can be filtered by sport discipline.

**Why this priority**: The analytics view provides longitudinal insight for coaches to assess training effectiveness and plan future periods. It is a read-only view and does not block any other workflows.

**Independent Test**: A coach with at least 4 weeks of session data for an athlete can open the analytics view, select a quarter period, filter by a single sport, and verify the totals match the sum of individual week summaries for that sport.

**Acceptance Scenarios**:

1. **Given** a coach is viewing an athlete's profile or week plan, **When** they navigate to the analytics view, **Then** they see a period selector (year / quarter / month / goal period) defaulting to the current month.
2. **Given** the analytics view is open, **When** the coach selects "Year", **Then** the view shows monthly aggregated data for the current calendar year, with one column or bar per month.
3. **Given** the analytics view is open, **When** the coach selects "Goal Period", **Then** a dropdown of all defined goals appears; selecting a goal shows data only for the preparation weeks of that goal.
4. **Given** a period is selected, **When** the coach applies a sport filter (e.g. "Running only"), **Then** all metrics (distance, sessions, duration) recalculate to include only sessions of that sport.
5. **Given** competitions exist within the selected period, **When** they are displayed in the analytics view, **Then** they appear as distinct milestone markers on the timeline (not counted in training totals) with their result distance/performance shown separately.
6. **Given** no sessions exist for the selected period and filter combination, **When** the analytics view is shown, **Then** an empty-state message is displayed rather than a blank chart.

---

### Edge Cases

- What happens when a competition date falls on a day that already has a training session? → Both can coexist; the competition session is added in addition to, not replacing, the existing training session.
- What happens when a goal is deleted? → Competition session is removed from the day; preparation-week indicators are removed; historical analytics data retains the completed sessions but no longer marks them as competition-prep.
- What happens when a goal's preparation window is set to 0 weeks? → Only the competition day receives the session; no weeks receive a preparation indicator.
- What happens when two goals overlap in preparation windows? → Both goal indicators are shown simultaneously on shared weeks; the week summary breakdown shows each competition goal separately.
- What happens when the athlete has no sessions in the selected analytics period? → An empty state is displayed with an actionable prompt (e.g. "No sessions planned for this periIt'sod").
- What happens when a competition session result is not yet entered (future date)? → The competition appears as a planned milestone; result fields remain empty and editable once the date has passed.

## Requirements *(mandatory)*

### Functional Requirements

**Goal Management**

- **FR-001**: Both coaches and athletes MUST be able to create a goal by specifying: name, discipline (any supported sport), competition date, goal distance/target, and preparation window in weeks.
- **FR-002**: Only coaches MUST be able to edit or delete a goal; athletes have read-only access.
- **FR-003**: The system MUST create a Competition session on the goal's competition date automatically when a goal is saved.
- **FR-004**: The system MUST display a preparation indicator (e.g. badge or banner) on every week within the goal's preparation window.
- **FR-005**: Competition sessions MUST be visually distinguished from training sessions across all views (week grid, week summary, analytics).
- **FR-006**: A Competition session MUST record distance and performance (time/pace) separately from training volume; it MUST NOT be aggregated into planned training totals.
- **FR-007**: When a goal is edited (date or preparation window changes), all affected week indicators and the competition session MUST update accordingly.
- **FR-008**: When a goal is deleted, the competition session and all preparation-week indicators MUST be removed.

**Week Summary Breakdown**

- **FR-009**: The week summary MUST offer a toggle between "Cumulative" (existing behaviour) and "By Sport" views.
- **FR-010**: In "By Sport" view, the summary MUST show one row per discipline that has at least one session planned or completed in that week, displaying: session count, planned distance, actual distance, and duration.
- **FR-011**: Competition sessions MUST appear as a separate, visually distinct row in "By Sport" view.
- **FR-012**: The toggle state MUST persist across week navigation within a session.

**Performance Analytics**

- **FR-013**: Coaches MUST be able to access a performance analytics view for each athlete they coach.
- **FR-014**: The analytics view MUST support period selection: current year (monthly breakdown), current quarter (weekly breakdown), current month (daily breakdown), and goal period (prep weeks of a selected goal).
- **FR-015**: The analytics view MUST display for the selected period: total distance, total sessions, total duration, and completion rate — all aggregated and broken down over time.
- **FR-016**: The analytics view MUST support filtering by sport discipline; the "All Sports" option is the default.
- **FR-017**: Competitions within the selected period MUST be shown as milestone markers on the timeline, not included in training volume totals.
- **FR-018**: Competition milestones MUST display: discipline, goal distance, actual result distance/performance, and whether the goal was achieved.
- **FR-019**: The analytics view MUST display an empty state when no sessions exist for the selected period and filter.

### Key Entities

- **Goal**: Represents a competition target. Attributes: name, discipline, competition date, preparation window (weeks), goal distance/target performance. Belongs to a coach–athlete relationship. Can have one Competition session.
- **Competition Session**: A special session variant linked to a Goal. Attributes: discipline, date (equals goal date), goal distance, result distance, result performance (time/pace), notes. Not counted as a training session in volume aggregations.
- **Goal Preparation Indicator**: A marker on a WeekPlan indicating it falls within a goal's preparation window. Attributes: reference to Goal, week number.
- **Analytics Period**: A time range for the analytics view. Variants: year, quarter, month, goal period (references a Goal).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A coach can create a goal and see the competition session and preparation indicators appear across all relevant weeks within 30 seconds of saving.
- **SC-002**: Coaches can switch between cumulative and breakdown views in the week summary without a page reload, and the transition completes within 300ms.
- **SC-003**: A coach can open the analytics view, change the period, and apply a sport filter — the view updates within 2 seconds for datasets covering up to one year of sessions.
- **SC-004**: 90% of coaches can set up a goal and verify the resulting competition session without needing help documentation, based on first-use observation.
- **SC-005**: Competition sessions are never counted in training volume totals in either the week summary or analytics view — verified by a 100% pass rate on integration tests covering this boundary.
- **SC-006**: All goal management and analytics interactions are available to coaches on both desktop and mobile screen sizes without layout breakage.

## Assumptions

- Athletes can view goals and competition sessions but cannot create, edit, or delete goals. This scope boundary prevents workflow conflicts between coach and athlete.
- A Competition session is a first-class session type with its own distinct UI treatment, not a flag on an existing session type.
- "Performance" for a competition session means time-based metrics (finish time, pace) appropriate to the discipline — not a generic score.
- The analytics view is coach-only in the first version; athlete self-analytics may be added in a future iteration.
- The analytics view does not require real-time data; data is fetched on page load and on filter/period changes.
- The existing sport color system (run = blue, cycling = green, etc.) is reused for the breakdown rows and analytics charts. Competition sessions use a distinct gold/amber accent consistent with the trophy metaphor.
- "Goal period" in the analytics period selector is only available if at least one goal exists for the athlete.
- Multiple simultaneous goals are supported; there is no hard limit on the number of goals per athlete.
