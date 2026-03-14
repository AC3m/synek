# Feature Specification: Strava Run Interval Data

**Feature Branch**: `010-strava-run-intervals`
**Created**: 2026-03-14
**Status**: Draft
**Input**: User description: "I want to add a logic that will allow me to get the intervals training for runs. The logic should be designed in a way that doesn't break existing user journeys. Ideally the strava data model allows us to figure out which runs had intervals and which didn't. The ones with intervals would get this additional data and nicely display it on the frontend. I want to use the best UX practices to populate it within existing layout."

## Research Findings

> These findings informed the requirements below and are preserved here for future reference.

The Strava API provides two signals to identify interval runs and their structure:

**`workout_type` (available on all synced activities, no extra API call needed)**
- `0` = Default/easy run
- `1` = Race
- `2` = Long run
- `3` = Workout — the primary signal that a run contained structured intervals

**Lap data (requires one additional API call per activity to the detailed endpoint)**
- Only returned by the detailed activity endpoint, not the activity list
- Each lap has: `distance`, `elapsed_time`, `moving_time`, `average_speed`, `average_heartrate`, `max_heartrate`, `average_cadence`, `pace_zone`, `lap_index`, `name`, `total_elevation_gain`
- The `intensity` field on each lap (`"active"` or `"rest"`) directly marks interval vs recovery segments — but this field is only populated when the workout was executed via a GPS device (Garmin, Wahoo, Polar, etc.) that encodes structured workout data. Auto-lapped runs will show all laps as `"active"`.
- The `name` field on laps often contains device-assigned labels such as `"Warm Up"`, `"Interval 1"`, `"Recovery 1"`, `"Cool Down"` — these can be used to identify warm-up and cool-down segments explicitly. When not present, warm-up and cool-down can be inferred heuristically: the first active lap before any rest lap is the warm-up; the last active lap after the final rest lap is the cool-down.

**Key constraint**: Strava rate-limits detailed activity fetches to 100 requests per 15 minutes and 1,000 per day. Fetching lap data for every synced activity would exhaust this budget quickly for athletes with high training volume.

**Recommended detection strategy**:
1. Use `workout_type === 3` to identify candidate activities at no extra cost
2. Only fetch detailed lap data for those candidates, lazily on first card view
3. Within the laps, use `intensity` and `name` to classify segments as WU / active interval / recovery / CD

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Athlete Opens Interval Details from Session Card (Priority: P1)

An athlete completes an interval run with their GPS device (e.g., 6×800m with recovery jogs). After syncing with Strava and confirming the activity in Synek, they view their session card. The card remains clean — it shows a small "Intervals" button/chip alongside the existing performance summary. Tapping it opens a modal with the full interval breakdown: a visual chart of the session structure and a lap-by-lap table showing warm-up, each active interval and recovery, and cool-down, with pace, duration, and distance for each segment.

**Why this priority**: This is the core value of the feature. The card-stays-clean / modal-for-detail pattern preserves the existing training overview UX while giving athletes the depth they need for interval analysis.

**Independent Test**: Sync a real Strava workout-type run with structured laps. Confirm the session card shows an "Intervals" button without otherwise changing the card layout. Tap it and confirm the modal opens with chart and lap table. Close the modal and confirm the card is unchanged.

**Acceptance Scenarios**:

1. **Given** an athlete has confirmed a Strava run with `workout_type = 3` and structured laps, **When** they view the session card, **Then** an "Intervals" button or chip appears on the card alongside the existing performance chips — no other part of the card changes.
2. **Given** the "Intervals" button is visible, **When** the athlete taps it, **Then** a modal opens showing the interval breakdown.
3. **Given** the modal is open, **When** the athlete views it, **Then** they see: (a) a visual chart of the session structure, (b) a lap table with warm-up, each active interval, each recovery, and cool-down clearly labelled, each row showing duration, distance, and pace.
4. **Given** the modal is open and the session has lap-level heart rate data, **When** the athlete views the lap table, **Then** average heart rate is shown in the heart column for each row.
5. **Given** the modal is open and the session has no lap-level heart rate data, **When** the athlete views the lap table, **Then** the heart column shows the Strava pace zone (e.g., "Z3") for each row as a fallback — no empty cells.
6. **Given** an athlete views a regular easy run, **When** they view the session card, **Then** no "Intervals" button appears and the card looks exactly as before — no regression.

---

### User Story 2 - Loading State During First Interval Data Fetch (Priority: P2)

When an athlete opens a session card for a workout-type run for the first time, the system begins fetching lap data lazily. During this brief fetch, the card must communicate that something is happening without causing layout shifts or suddenly popping in a button. A skeleton or subtle animation placeholders for the "Intervals" button area while the data loads. Once loaded, the button appears smoothly. On subsequent views, data is already stored and the button appears instantly.

**Why this priority**: Without this, athletes see layout shifts — the card reflows when the button appears. This breaks the visual stability of the training week view and feels unpolished. Smooth loading is a UX requirement, not a nice-to-have.

**Independent Test**: Open a session card for a workout-type run that has never loaded interval data. Confirm a skeleton placeholder appears in the interval button area. Confirm it transitions to the "Intervals" button without a layout shift. Reload the card — confirm the button appears immediately (no skeleton, no delay).

**Acceptance Scenarios**:

1. **Given** a workout-type session card is rendered for the first time (no cached lap data), **When** the card appears, **Then** a skeleton placeholder occupies the space where the "Intervals" button will appear — the card height and layout do not change when data loads.
2. **Given** the lap data fetch completes successfully, **When** the result arrives, **Then** the skeleton transitions smoothly to the "Intervals" button without a visual jump.
3. **Given** a workout-type session card is viewed again (lap data already cached), **When** the card renders, **Then** the "Intervals" button appears immediately with no skeleton state.
4. **Given** a non-workout run session card is rendered, **When** the card appears, **Then** no skeleton or placeholder appears in the interval area — the card layout is identical to the current design.

---

### User Story 3 - Retry When Interval Data Fetch Fails (Priority: P3)

If the lap data fetch fails due to a transient error (network issue, Strava API timeout, rate limit), the system must not silently drop the failure or leave the athlete staring at a skeleton indefinitely. A clear but unobtrusive retry action replaces the skeleton so the athlete can try again without leaving the card.

**Why this priority**: Transient fetch failures are realistic (mobile networks, Strava rate limits). Leaving a broken or perpetually loading state is worse than a clear retry. This is lower priority because it is a failure path, not the happy path.

**Independent Test**: Simulate a network failure during the lazy lap fetch. Confirm the skeleton is replaced by a retry prompt. Tap retry and confirm the fetch is attempted again. On success, confirm the "Intervals" button appears normally.

**Acceptance Scenarios**:

1. **Given** the lazy lap fetch fails due to a transient error, **When** the error occurs, **Then** the skeleton is replaced by a small retry prompt (e.g., "Could not load intervals — Retry") in the same area without disrupting the rest of the card.
2. **Given** the retry prompt is visible, **When** the athlete taps "Retry", **Then** the fetch is attempted again and the skeleton reappears during the retry attempt.
3. **Given** the retry succeeds, **When** data arrives, **Then** the "Intervals" button appears normally.
4. **Given** interval data is simply absent for a session (not a fetch error — the activity has no structured laps), **When** the athlete views the card, **Then** no retry prompt is shown — the card shows no interval affordance at all, as if it were a regular run.

---

### User Story 4 - Coach Views Athlete Interval Breakdown After Confirmation (Priority: P4)

A coach views a confirmed athlete interval session. The card shows the "Intervals" button. Opening the modal gives the coach the same detailed view as the athlete — chart and lap table — providing insight into execution quality (consistency of pace and heart rate across intervals). Before confirmation, no interval affordance appears on the card.

**Why this priority**: Coaches are primary users but the coach view is derivative of the athlete view (same data, same modal). It must respect the existing confirmation gate.

**Independent Test**: Use a coach account. View an unconfirmed athlete workout run — confirm no "Intervals" button appears. Confirm the session; open the card again — confirm the "Intervals" button and modal work identically to the athlete view.

**Acceptance Scenarios**:

1. **Given** an athlete has confirmed a Strava interval run, **When** the coach views the session card, **Then** the "Intervals" button appears and the modal opens with the full breakdown.
2. **Given** a Strava interval run is synced but not yet confirmed by the athlete, **When** the coach views the session card, **Then** no "Intervals" button appears — the card shows the existing masked/blurred performance state only.

---

### User Story 5 - Workout-Type Run Without Structured Lap Data (Priority: P5)

Some athletes mark runs as "Workout" in Strava without a device that encodes structured intervals. In this case, `workout_type` is `3` but all laps have `intensity = "active"` with no rest laps. The system must not show an "Intervals" button for these runs — doing so would open a modal with no meaningful structure to show.

**Why this priority**: Prevents confusing or empty states. Lower priority as it is a guard against a specific device/data edge case.

**Independent Test**: Sync a Strava activity with `workout_type = 3` but only auto-laps. Confirm no "Intervals" button or skeleton appears on the card.

**Acceptance Scenarios**:

1. **Given** a synced run has `workout_type = 3` but all laps are `intensity = "active"` with no rest laps, **When** the athlete views the card, **Then** no "Intervals" button or skeleton appears — the card looks like a standard confirmed run.

---

### Edge Cases

- What happens when the lap fetch fails? The skeleton is replaced by a retry prompt; the rest of the card is unaffected.
- What happens when a run has only one lap? No "Intervals" affordance is shown — treated as a regular run.
- What happens when `workout_type = 3` but zero laps are returned? Treated as a regular run, no affordance shown.
- What happens when a session has many intervals (20+ laps)? The modal's lap table is scrollable; the chart scales to fit or uses horizontal scroll — the session card itself is unaffected.
- What happens when a device labels the first and last laps as warm-up/cool-down by name but there are no rest laps in between? Show WU and CD in the modal table but do not show an "Intervals" button if there are no actual interval/recovery pairs — this would be an incomplete structured workout.
- What happens when a previously confirmed session's Strava activity is later deleted on Strava? Stored lap data is retained — do not cascade-delete on Strava delink.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST identify, at sync time, which synced run activities are tagged as structured workouts (`workout_type = 3`), without requiring additional API calls beyond those already made during sync.
- **FR-002**: System MUST fetch lap-level data lazily — triggered the first time an athlete views the session card for a workout-type run. The card renders immediately using existing summary data; the lap fetch runs in the background.
- **FR-003**: System MUST store lap data (per-lap: index, type/intensity, distance, duration, average pace, average heart rate, max heart rate, average cadence, lap name) persistently after the first successful fetch, so all subsequent views load instantly without hitting the Strava API.
- **FR-004**: System MUST display a skeleton placeholder in the interval button area during the initial lap data fetch, sized to match the eventual button, so the card layout does not shift when data arrives.
- **FR-005**: System MUST replace the skeleton with an "Intervals" button once lap data is loaded and the session has qualifying structured laps (at least one active/rest pair).
- **FR-006**: System MUST replace the skeleton with a retry prompt when the lap fetch fails due to a transient error (network failure, API timeout, rate limit). The retry prompt must allow the athlete to re-trigger the fetch. Strava data unavailability (no structured laps) is not a failure — it shows nothing.
- **FR-007**: System MUST open a modal when the "Intervals" button is tapped, consistent with existing modal patterns in the application.
- **FR-008**: The modal MUST display a visual chart of the session interval structure, making it easy to read the rhythm of work and rest segments at a glance.
- **FR-009**: The modal MUST display a lap-by-lap table. Each row MUST include: segment label (WU / Interval N / Recovery N / CD), duration, distance, and pace. The heart column follows this priority: (1) average heart rate when available from Strava; (2) pace zone (1–5, sourced from Strava's lap data) as a fallback when HR is absent. In a future iteration, heart zone will be computed from user-configured HR zones in settings rather than relying on Strava's pace zone — the column must be designed to accommodate either value without a layout change.
- **FR-010**: System MUST identify and label warm-up (WU) and cool-down (CD) segments in the modal, using the lap `name` field when provided by the device. When not provided, WU is inferred as the first active lap before the first rest lap; CD is inferred as the last active lap after the final rest lap.
- **FR-011**: System MUST visually distinguish active (interval) laps, rest (recovery) laps, warm-up, and cool-down segments in both the chart and the lap table.
- **FR-012**: System MUST NOT display any interval affordance (button, skeleton, or retry) to a coach for an activity the athlete has not yet confirmed — the existing masking behaviour applies.
- **FR-013**: System MUST NOT alter the appearance of session cards for runs that have no interval data — no regressions to existing non-interval session cards.

### Key Entities

- **Run Interval Session**: A training session of type `run` from a Strava activity with `workout_type = 3`. Contains all existing session attributes plus a collection of laps once fetched.
- **Lap**: A single timed segment within a run interval session. Attributes: sequential index, segment type (warm-up / active interval / recovery / cool-down), device-assigned name (optional), distance, elapsed time, moving time, average pace, average heart rate (optional), max heart rate (optional), average cadence (optional). Belongs to one Run Interval Session.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Athletes with confirmed structured interval runs see an "Intervals" button on their session card with no layout shift during load — zero cases where the card reflows when the button appears.
- **SC-002**: The interval button and skeleton are absent on all non-interval session cards — zero regressions observed on easy runs, long runs, races, or rest days.
- **SC-003**: Opening the interval modal takes under 1 second for sessions whose lap data is already cached.
- **SC-004**: A coach viewing a confirmed athlete interval session sees the same "Intervals" button and modal as the athlete — no additional navigation required beyond tapping the button.
- **SC-005**: When lap fetch fails, a retry prompt appears in under 3 seconds — no indefinite skeleton states.
- **SC-006**: Lap data is stored after first successful fetch — subsequent views of the same session load the "Intervals" button instantly without hitting the Strava API.
- **SC-007**: The interval modal is readable on mobile — chart and lap table are usable on a 375px-wide screen without horizontal overflow.

### Assumptions

- Athletes using GPS devices that record structured workout data (Garmin, Wahoo, Polar) will have `intensity` fields on their laps. Athletes without such devices will not see an interval affordance even if `workout_type = 3`.
- The Strava `workout_type` field is set by the device or athlete — the system does not attempt to infer interval structure from pace variance.
- Interval data is read-only in Synek — athletes cannot edit lap data manually.
- The heart column in the lap table currently uses Strava's pace zone as an HR fallback. Once user-configurable HR zones are added to settings (a future feature), the fallback will switch to zones computed from the athlete's own max/resting HR — the lap table layout must not need to change when this happens.
- Sessions with 1 or fewer laps, or with no active/rest pairs, are not shown as interval sessions.
- WU/CD inference (first/last active lap heuristic) may occasionally misclassify a lap if the device does not name laps explicitly — this is an acceptable approximation.

## Post-Implementation

At the end of implementation, update existing documentation or create new documentation depending on what fits better. Specifically: if the Strava integration docs already exist, extend them with interval data fetching behaviour; if nothing covers the interval modal pattern or lap data model, create dedicated docs.

