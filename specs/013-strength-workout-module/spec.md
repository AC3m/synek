# Feature Specification: Strength Workout Module

**Feature Branch**: `013-strength-workout-module`
**Created**: 2026-03-21
**Status**: Draft — UX/UI reviewed 2026-03-21
**Input**: User description: "Design and plan implementation of strenght workout modules. 1. An athlete and coach can go to strenght workout module and define strenght workout variants. 2. Each variant can be the used in a workout session. 3. In variant you can define an excercise name, url to video, number of sets and reps range. 4. When you add the strengh training to a session you've got fulfilled reps and load from previous session (as per variant definition). 5. You've got a place where you mark if given excercise should progress/regress or maintain the load for the next training. 6. You've got an analysis view where you can track a progress per given training variant."

---

## UX Design Principles (applied throughout)

These principles govern every screen in the module and are non-negotiable during implementation:

1. **Progressive disclosure** — Show summary first; surface detail on interaction. No wall of inputs on first render.
2. **Immediate feedback** — Every mutation confirms itself with a micro-animation or toast within one frame. Users never wonder if a save happened.
3. **Pre-fill is visible in its provenance** — Whenever values are auto-populated, the user sees *where they came from* (e.g., "From Jan 15") — no invisible magic.
4. **Touch-first sizing** — All interactive targets ≥ 44 × 44 px; destructive actions are never reachable with a single tap.
5. **Keyboard completeness** — Every flow can be completed without a mouse: `Tab`, `Enter`, `Space`, `Escape`, `↑↓` arrows.
6. **Undo over confirm** — Prefer instant delete + toast with Undo link (5 s timer) over blocking confirmation dialogs, *except* for destructive deletes with data implications (deleting a variant that has logged sessions — this uses a confirm dialog).

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Strength Variant Library (Priority: P1)

A coach (or athlete with `can_self_plan`) navigates to the Strength module and manages a personal library of workout variants (e.g., "Push Day A", "Lower Body"). Each variant is a named template of ordered exercises, each with a name, optional video link, sets count, and a reps range (min–max). The library page is scannable and searchable; variant detail is navigated as a separate page (not a dialog) to give the complex exercise list full screen estate.

**Why this priority**: Without variants, none of the session-linking, pre-fill, or analysis features work. The library is also usable standalone as an exercise programming tool.

**Independent Test**: Navigate to `/pl/coach/strength`. Create "Push A" with 3 exercises (Bench Press 3×8–12, Overhead Press 3×6–10, Tricep Dips 3×10–15). Edit the Bench Press reps range to 6–10. Delete Tricep Dips. Delete the variant. All changes persist in mock mode and are immediately reflected in the UI.

**Acceptance Scenarios**:

1. **Given** a coach is on the Strength Library page with no variants, **When** the page loads, **Then** an illustrated empty state is shown with the variant's sport icon (Dumbbell, orange), a heading ("Build your first strength template"), and a primary "New Variant" button — no generic placeholder text.

2. **Given** a coach clicks "New Variant", **When** the variant detail page loads (navigation, not dialog), **Then** the variant name input is automatically focused, and an exercise row is pre-populated (not empty) to prompt completion.

3. **Given** a coach is building a new variant, **When** they add an exercise row, **Then** focus moves directly to the new exercise's name input (no manual click required); pressing `Enter` on any exercise name field adds the next exercise row.

4. **Given** a coach is building a variant, **When** they set the reps range, **Then** reps min and max are entered as a compact "from–to" range input (single field accepting "8-12" notation, or two adjacent small inputs styled as a range) rather than two labelled number fields.

5. **Given** a coach sets the sets count, **When** the sets field is focused, **Then** a segmented button group shows common values (1–6) for single-tap selection, with a numeric fallback input for values outside the range.

6. **Given** a coach creates a variant with ≥ 1 exercise, **When** they save it, **Then** the variant appears in the library list with: name, exercise count badge, muscle group tags (inferred from exercise names if available, or user-entered), and a "last used" chip (hidden if never used).

7. **Given** the library has ≥ 4 variants, **When** the page renders, **Then** a search input appears at the top allowing text filtering by variant name or exercise name; results update as-you-type with no submit button.

8. **Given** a coach opens the library, **When** they hover or focus a variant card, **Then** a "peek" expansion shows the first 3 exercise names inline (not a separate overlay) to allow quick scanning without navigating to the detail page.

9. **Given** a coach deletes a variant that has **no** logged session history, **When** they click the delete button, **Then** an undo toast appears for 5 s before the deletion is committed; pressing Undo within 5 s restores the variant.

10. **Given** a coach deletes a variant that **has** logged session history, **When** they click delete, **Then** a confirmation dialog explains "This variant has logged sessions. The session history will be preserved — only the template is removed." and requires explicit confirmation.

11. **Given** an athlete with `can_self_plan = true` opens the Strength module, **When** the page loads, **Then** they see and can manage their own variant library with identical capabilities to the coach view.

---

### User Story 2 — Pre-fill from Last Session on Session Form (Priority: P2)

When creating or editing a strength training session, the user selects a variant from a picker. The form then pre-populates each exercise's target reps and load from the athlete's most recent completed session that used the same variant, with a clear "From [date]" provenance label. The user can accept the pre-fill as-is, modify individual values, or detach the variant entirely.

**Why this priority**: Manual re-entry of last session data is the primary friction point for strength programming. This feature eliminates it.

**Independent Test**: Complete a mock strength session with "Push A" logging Bench Press at 80 kg × 10 reps. Open a new strength session the following week and select "Push A". Verify: (a) Bench Press shows 80 kg and 10 reps pre-filled, (b) a "From [mock date]" label is visible above the exercise list, (c) "Accept all" button is available and enabled.

**Acceptance Scenarios**:

1. **Given** a session form is open with training type `strength`, **When** the user opens the variant picker, **Then** on mobile it opens as a bottom Sheet with a search input and a list of variants (large touch targets, 48 px row height); on desktop it opens as a Popover/Command menu. Recently used variants appear at the top (max 3, labelled "Recently used").

2. **Given** the variant picker is open, **When** a variant is focused or hovered, **Then** a compact preview panel shows the first 3 exercises of that variant so the user can confirm they are selecting the right template.

3. **Given** a variant is selected and prior session data exists, **When** the exercise list renders, **Then**: (a) a provenance label "Pre-filled from [date, e.g. Mar 3]" appears above the list in muted text, (b) an "Accept all" button is visible which confirms all pre-filled values in one tap, (c) each pre-filled value has a subtle left border or background tint distinguishing it from user-entered values.

4. **Given** a prior session had `progression = 'up'` for an exercise, **When** that exercise row renders, **Then** a directional badge (▲ green) appears next to the exercise name indicating the previous intent to increase load; the load field shows the prior load value and a ghost suggestion "+2.5 kg" as placeholder text (not auto-filled — the user must consciously enter the new value).

5. **Given** a prior session had `progression = 'down'`, **When** that exercise row renders, **Then** a directional badge (▼ amber) appears and the load placeholder suggests a reduced value.

6. **Given** no prior session exists for the chosen variant, **When** the form renders, **Then** exercises show the variant's `reps_min`–`reps_max` as placeholder text in the reps field and an empty load field; no provenance label is shown; a muted hint "First session — establish your baseline" appears above the list.

7. **Given** a user clicks "Detach variant", **When** the action is confirmed (single click, no dialog needed), **Then** the variant reference is removed, the exercise list returns to the existing free-form editor, and a "Variant detached" toast confirms the action with an "Undo" link.

---

### User Story 3 — Session Exercise Logging with Progression Intent (Priority: P3)

During or after completing a strength session linked to a variant, the athlete logs actual reps and load per exercise and marks a progression intent for next time (up / maintain / down). The logger shows a delta vs. the pre-filled (last session) values to make progress visible at a glance.

**Why this priority**: This closes the progressive overload loop. The delta indicator turns raw data into meaning.

**Independent Test**: Open a completed mock strength session in SessionDetailModal. In the strength logger section, enter Bench Press: 82.5 kg × 10 reps, mark "up". Verify: (a) +2.5 kg delta indicator appears in green, (b) the progression toggle persists after navigating away and back, (c) next session with same variant pre-fills at 82.5 kg with a ▲ indicator.

**Acceptance Scenarios**:

1. **Given** an athlete opens a variant-linked strength session in the SessionDetailModal, **When** the "Strength Log" section renders, **Then** the section header shows the variant name as a subtitle, and the exercise table has sticky column headers ("Exercise | Reps | Load | Next") that remain visible when scrolling through many exercises.

2. **Given** the athlete enters an `actual_reps` or `load_kg` value, **When** the input loses focus (blur), **Then**: (a) the row saves automatically (optimistic mutation), (b) a brief "✓" checkmark animation fades in and out beside the row to confirm persistence, (c) the delta indicator updates immediately — showing `+2.5 kg` in green if load increased, `−5 kg` in amber if decreased, `=` in muted if unchanged vs. the pre-filled reference.

3. **Given** the athlete taps a progression toggle button (⬆ / ↔ / ⬇), **When** the button is selected, **Then** it highlights with the sport's orange accent colour and the selection persists; tapping the same button again returns to neutral (no selection).

4. **Given** multiple exercises exist, **When** the athlete completes logging all exercises, **Then** an "All logged ✓" summary line appears at the bottom of the exercise table showing total volume (sum of sets × reps × load across all exercises in kg), e.g. "Session volume: 4 320 kg".

5. **Given** some exercises have been logged and some have not, **When** the athlete views the logger, **Then** unlogged exercises show a subtle orange-tinted left border to indicate they are incomplete — not a blocking error, just a visible nudge.

6. **Given** a coach views the same session, **When** they open the Strength Log section, **Then** all inputs are `readOnly`; the delta indicators and progression badges are still shown; coach sees a read-only summary of the athlete's session.

7. **Given** the session logger is open, **When** the user tabs through fields, **Then** focus follows the logical order: exercise 1 reps → exercise 1 load → exercise 1 progression → exercise 2 reps → … → last exercise progression; pressing `Enter` on the last progression toggle closes the logger focus.

---

### User Story 4 — Variant Progress Analysis View (Priority: P4)

A coach or athlete views a per-variant progress dashboard: summary stat cards, an interactive load progression chart, and a scrollable session history table. The dashboard gives a complete picture of training progression for a specific variant.

**Why this priority**: This is the payoff of consistent logging. The stat cards surface progress without needing to read a chart.

**Independent Test**: Log 4 strength sessions over 4 weeks with "Push A", increasing Bench Press load each session (80 → 82.5 → 85 → 87.5 kg). Navigate to the variant's Progress tab. Verify: (a) "Best" stat card shows 87.5 kg, (b) the chart shows an upward line for Bench Press, (c) the session history table lists all 4 sessions in reverse-chronological order.

**Acceptance Scenarios**:

1. **Given** a coach opens a variant's Progress tab, **When** there are ≥ 1 logged sessions, **Then** a row of summary stat cards appears above the chart showing: "Total Sessions", "Best Load" (per exercise — uses a dropdown to switch exercise), "Last Session" date, "Volume Trend" (▲ increasing / — flat / ▼ decreasing based on last 3 sessions).

2. **Given** the chart renders, **When** it is first displayed, **Then** the visible state defaults to showing only the **first exercise** selected (not all exercises stacked, which would be visually noisy); additional exercises can be toggled on/off via a filter row of pill buttons below the chart.

3. **Given** the chart is rendered, **When** the user hovers or taps a data point, **Then** a tooltip appears showing: session date, actual reps, load (kg), and the progression intent icon (▲/↔/▼) that was set in that session.

4. **Given** a session had `progression = 'up'` AND the next session's load actually increased, **When** the chart renders that data point, **Then** a small ▲ marker is drawn directly on the line at that point to surface confirmed progressions visually.

5. **Given** the Progress tab is open, **When** scrolling below the chart, **Then** a session history table appears with columns: Date | Sets × Reps | Load (kg) | Volume | Next Intent; rows are in reverse-chronological order; the table is sortable by clicking column headers.

6. **Given** fewer than 2 logged sessions exist for the variant, **When** the Progress tab is opened, **Then** an empty state shows the Dumbbell icon, the message "Log at least 2 sessions to track progress", and a button "Go to today's session" that links to the current week's training page.

7. **Given** a coach is viewing an athlete's variant progress, **When** the tab loads, **Then** the dashboard is scoped to that athlete's data (`effectiveAthleteId`) with the athlete's name shown in the tab subtitle.

---

### Edge Cases

- **Deleted exercise in history**: When a variant exercise is deleted, `variant_exercise_id` is `SET NULL`. Historical `strength_session_exercises` rows with null `variant_exercise_id` are shown in the progress table under the label "[Removed exercise]" with their data intact — data is never silently dropped.
- **Variant used by multiple athletes**: Each athlete's dashboard is scoped by `athlete_id` derived from `week_plans`. No cross-contamination is possible.
- **No linked variant on a strength session**: Existing free-form exercise list continues to work. The strength logger in SessionDetailModal only renders when `typeSpecificData.variantId` is set.
- **Reps display convention**: Pre-fill shows last actual reps as a value; the variant's target range is shown as a muted secondary label ("target: 8–12") in the reps input's description text.
- **Mobile progression toggle**: The three-way toggle (⬆/↔/⬇) must use a minimum 44 px height and ≥ 48 px width per button on mobile to be reliably tappable.
- **"Accept all" and dirty state**: If the user has manually edited any pre-filled value, "Accept all" only updates the untouched fields — it does not overwrite user edits.

---

## Success Criteria

- Variant CRUD fully functional in mock mode and with Supabase connected
- Pre-fill loads correct data from last completed session; provenance date is shown
- Session exercise logging persists and drives next-session pre-fill; delta indicators render
- Progress chart renders correctly with ≥ 2 data points; stat cards are accurate
- `pnpm typecheck` passes with 0 errors
- EN + PL translations complete for all new keys
- No new `select('*')` Supabase queries
- All interactive elements have accessible labels (`aria-label`) and meet 44 px touch target minimum
- Keyboard navigation works end-to-end through variant form, session logger, and progress chart (focus management)
