# Feature Specification: Strength Session UX Redesign

**Feature Branch**: `015-strength-session-ux`
**Created**: 2026-04-03
**Status**: Ready for planning
**Input**: User description: "Design a new UX that will ease fulfilling strength workout. US: 1. User can see the previous session if available as part of the training variant. 2. User can define a progress increment in variant config per exercise. 3. User has automatically pre-filled the next session (regardless if planned already or not) based on the next session intent (which is also a trigger for prefill). 4. User can easily copy a reps and load value from previous set within an exercise. 5. User can see the previous reps and load for a given exercise if exists."

---

## Context & Scope

This feature enhances the existing strength workout session logger (`SessionExerciseLogger`) and variant configuration (`VariantDetailView`). It does **not** replace the data model from `013-strength-workout-module`; it extends it with:

1. Visible previous-session data within the exercise logger (US1 + US5)
2. A per-exercise load increment configured in the variant (US2)
3. Proactive pre-fill of the next session driven by the current session's progression intent (US3)
4. A one-tap "copy from set above" action within each exercise card (US4)

The feature targets athletes logging workouts on mobile (iOS and Android WebView). All interactive targets must meet a 44 × 44 px minimum. Layouts must be thumb-reachable.

---

## UX Design Principles (applied throughout)

1. **Data proximity** — Previous-session values appear directly beside where the user types, not in a separate panel. Context collapses the cognitive gap.
2. **Progressive disclosure** — Load-increment config is hidden behind an "Advanced" expand in the variant exercise row so it doesn't clutter the default view.
3. **Explicit over implicit** — When pre-fill is auto-applied, the origin is always visible ("From Mar 24"). Auto-incremented values are shown distinctly so the user consciously confirms them.
4. **Single-action copy** — Copying a set's values should cost one tap, not a long-press or a drag.
5. **Touch-first sizing** — All controls ≥ 44 × 44 px; destructive or irreversible actions require a second confirm step.
6. **User intent is sacred** — Once a user has manually entered or corrected a value, the system never overwrites it — not on re-open, not on re-render, not on data refresh.

---

## Confirmed UX Decisions

| # | Question | Decision |
|---|----------|----------|
| Q1 | Previous-session layout on mobile | **Option B** — dedicated muted "prev" row below each active set row |
| Q2 | Pre-fill trigger model | **Option A** — pull on open; pre-fill applied only when exercise has no user-entered data yet |
| Q3 | Pre-fill application mode | **Option A** — actual values in inputs, muted tint until user edits |

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Previous Session Reference in Logger (Priority: P1)

An athlete opens a strength session that is linked to a variant they have performed before. While entering this session's reps and load, they can see — directly within each exercise card — what they did in the most recent completed session for the same variant. A dedicated muted "prev" row sits below each active set row, keeping the reference visible at all times without interfering with input.

**Why this priority**: The core friction point is athletes needing to remember what they lifted last time. Inline reference eliminates the need to switch screens or rely on memory. Everything else (increment, prefill, copy) builds on having previous data visible.

**Independent Test**: Open a mock strength session for "Push A" that has a prior completed session (Bench Press: Set 1 — 80 kg × 10, Set 2 — 82.5 kg × 10). Verify: (a) Below each active set row a muted "prev: 10 reps · 80 kg" row is shown. (b) The exercise header shows a "From [mock date]" provenance label. (c) The prev rows remain visible and unchanged as the user types new values in the active inputs.

**Acceptance Scenarios**:

1. **Given** a session logger opens for a variant with a prior completed session, **When** the exercise cards render, **Then** each active set row is followed immediately by a muted reference row displaying "prev: [reps] reps · [load] kg" for that set; the reference row is visually subordinate (smaller font, muted colour, no border).

2. **Given** the previous session had fewer sets than the current variant definition (e.g., variant now has 4 sets, prior session only logged 3), **When** the exercise card renders, **Then** the fourth set's reference row shows "prev: —"; it is still rendered so the layout remains consistent.

3. **Given** a session logger opens for a variant with **no** prior completed session, **When** the exercise cards render, **Then** no "prev" rows are shown; the set layout is the standard 2-column grid (reps | load) with no additional vertical spacing.

4. **Given** the prior session provenance date is available, **When** the exercise card header renders, **Then** a muted label "From [date, e.g. Mar 24]" appears beneath the exercise name and target reps — visible at all times, not behind a tap.

5. **Given** a prior session's exercise was saved with `setsData = []` (top-set only, no per-set breakdown), **When** the exercise card renders, **Then** the reference row for each set shows the single top-set value with a "(top set)" qualifier label — e.g., "prev: 10 reps · 80 kg (top set)"; no row is blank or broken.

6. **Given** the session is opened by a coach (read-only mode), **When** the logger renders, **Then** the "prev" rows behave identically — they are always shown when prior data exists, regardless of edit mode.

---

### User Story 2 — Per-Exercise Load Increment in Variant Config (Priority: P2)

A coach or self-plan athlete configures a progression increment on each exercise within a variant definition. The increment specifies by how much the load should change on the next session when the progression intent is "up" or "down". For example, Bench Press might have +2.5 kg per session while Bicep Curl has +1.25 kg.

**Why this priority**: Without a configured increment, the auto-prefill for US3 cannot produce a meaningful suggested value. This is the configuration step that unlocks US3's full potential.

**Independent Test**: Open the "Push A" variant detail page. On the Bench Press exercise row, expand the "Advanced" section and set increment to 2.5 kg. Save the variant. Verify: (a) The increment value persists on reload. (b) The exercise list shows a small "+2.5 kg" chip next to the Bench Press name. (c) Setting increment to 0 or clearing it removes the chip and stores null.

**Acceptance Scenarios**:

1. **Given** a user is on the variant detail page editing an exercise, **When** they expand the "Advanced" section of that exercise row, **Then** a numeric increment field appears labelled "Load increment per session" with a unit suffix (kg or the exercise's load unit); it is collapsed by default to avoid clutter.

2. **Given** a load increment is set on an exercise, **When** the exercise appears in any list or card, **Then** a compact chip (e.g. "+2.5 kg") is shown next to the exercise name, providing a quick visual confirmation without needing to expand settings.

3. **Given** a user sets the load increment to 0 or leaves it empty, **When** the variant saves, **Then** no chip is shown and the field is stored as null — not zero — to clearly distinguish "not configured" from "zero increment".

4. **Given** a variant exercise has `loadUnit = 'sec'` (time-based, e.g., planks), **When** the user edits the increment, **Then** the field label reads "Duration increment per session" and the suffix shows "s"; the input accepts decimals to one place.

5. **Given** a coach sets increments on multiple exercises, **When** they save the variant, **Then** all increments persist independently per exercise; updating one does not affect others.

---

### User Story 3 — Auto Pre-fill Next Session on Progression Intent (Priority: P3)

When an athlete completes a session and sets a progression intent (up / maintain / down) for an exercise, the system computes the suggested values for the **next** session using that variant — applying the configured load increment if intent is "up", subtracting it if "down", or keeping it flat if "maintain". Pre-fill is computed at session-open time (pull model), applied only to exercises that have not yet been touched by the user, and is never re-applied once the user has entered any value.

**Why this priority**: This closes the progressive overload loop automatically. The athlete no longer has to mentally add 2.5 kg or remember to check last session; the suggestion appears ready to accept or override.

**Independent Test**: In mock mode, complete a Bench Press set at 80 kg × 10, set progression intent to "up", with increment 2.5 kg. Open a new strength session and select the same variant. Verify: (a) Bench Press Set 1 and Set 2 load fields show 82.5 kg (actual values, not placeholders) with muted tint. (b) A "▲ +2.5 kg from Mar 24" label is visible on the exercise card header. (c) Typing a different value in Set 1 clears its tint; Set 2 remains pre-filled and tinted. (d) Closing and reopening the session does not reset Set 1 back to 82.5 kg — the user's typed value is preserved.

**Acceptance Scenarios**:

1. **Given** a prior session exists with progression intent "up" and load increment 2.5 kg, **When** a new session logger opens and the exercise has no user-entered data, **Then** each set row's load field is pre-filled with (previous load + increment) as an actual value; reps are pre-filled from the previous session's actual reps unchanged.

2. **Given** a prior session exists with progression intent "down" and load increment 2.5 kg, **When** a new session logger opens and the exercise has no user-entered data, **Then** each set row's load field is pre-filled with (previous load − increment), floored at 0; a "▼ −2.5 kg from [date]" label appears on the exercise header.

3. **Given** a prior session exists with progression intent "maintain", **When** a new session logger opens, **Then** each set row's load field is pre-filled with the exact previous load; no increment is applied; a "= from [date]" label is shown in muted style.

4. **Given** an exercise has no configured increment but intent is "up" or "down", **When** a new session opens, **Then** the load is pre-filled from the previous session unchanged (no increment to add); a muted hint "Set an increment in variant config to auto-progress" appears on the exercise card.

5. **Given** pre-filled values are applied to set rows, **When** the exercise card renders, **Then** pre-filled values are visually distinct: inputs show a muted background tint and the exercise header carries a directional badge (▲ green / ▼ amber / = muted) with provenance date.

6. **Given** a user modifies any pre-filled value in a set row, **When** the input changes, **Then** that set row's tint is immediately cleared; the other pre-filled rows in the same exercise are unaffected; the row is now considered "user-owned".

7. **Given** a session is saved, closed, and reopened, **When** the logger re-hydrates, **Then** user-entered values are restored from the saved session data; pre-fill computation is NOT re-applied to any row that already has saved data — the saved value always wins.

8. **Given** a session logger opens for a variant that has never been used before, **When** the cards render, **Then** no pre-fill is applied; the exercise card shows the variant's target reps range as placeholder and load fields are empty; a muted hint "First session — establish your baseline" is shown above the exercise list.

---

### User Story 4 — Copy Set Values from Previous Set (Priority: P4)

While logging sets for an exercise, an athlete can copy the reps and load values from the set directly above with a single tap. This is the standard interaction pattern in dedicated gym tracker apps (e.g., Strong, Hevy) and eliminates repetitive data entry for exercises where all sets use the same weight.

**Why this priority**: Many strength exercises are logged with identical values across sets (e.g., 4 × 80 kg × 8 reps). Requiring the user to re-type the same value for each set creates unnecessary friction on mobile keyboards.

**Independent Test**: Enter Set 1 of Bench Press as 80 kg × 10 reps. Tap the copy button on Set 2. Verify: (a) Set 2 immediately shows 80 kg and 10 reps as actual values with the "user-owned" (un-tinted) style. (b) No copy button exists on Set 1. (c) An existing value in Set 2 is overwritten by the copy. (d) The commit fires automatically — no extra tap needed to save.

**Acceptance Scenarios**:

1. **Given** an exercise has multiple sets, **When** the set rows render in edit mode, **Then** every row except the first displays a copy icon button to the right of the load field; the first row has no copy button.

2. **Given** a user taps the copy button on set N, **When** the tap fires, **Then** set N's reps and load fields are immediately populated with set N−1's **current live values** (not the saved values — whatever is visible in the UI at that moment); the commit fires automatically; the copied row is styled as "user-owned" (no pre-fill tint).

3. **Given** the previous set (N−1) has no values entered, **When** the user taps the copy button on set N, **Then** no values are copied; the copy button shows a disabled/muted state; no commit fires.

4. **Given** the session is in read-only mode (coach view), **When** the logger renders, **Then** copy buttons are not shown.

5. **Given** an exercise is part of a superset, **When** the copy button is tapped, **Then** values are copied only within the same exercise's set rows — not across exercises in the superset.

---

### Edge Cases

- **Missing prior setsData**: If the prior session was saved with `setsData = []` (top-set only), the "prev" row for each set shows the single top-set value with a "(top set)" qualifier. Pre-fill applies the same top-set value to all set rows.
- **Variant exercise added after prior session**: New exercises added to a variant since the last session have no prior data. They render without "prev" rows and without pre-fill — identical to the "first session" state.
- **Load increment larger than current load (floor)**: When progression intent is "down" and the increment exceeds the current load, the pre-filled value floors at 0. A warning chip "Floor reached — adjust increment" is shown on that exercise card.
- **User-owned value protection**: Once a set row has been committed (saved) with a user-entered value, that value is never overwritten by pre-fill on any subsequent open. This applies even if the progression intent changes after the fact.
- **Multiple athletes sharing a variant**: Pre-fill is always scoped to the individual athlete's session history. Increment config is part of the variant (shared), but the computed next-session value is personal.
- **Offline / optimistic state**: Copy-from-set and pre-fill are purely local operations requiring no network round-trip. Only the commit (save) requires connectivity, using the existing optimistic mutation pattern.
- **Copy overwrites pre-filled value**: If set N has a pre-filled (tinted) value and the user taps copy from set N−1, the pre-fill is replaced by the copied value; the row transitions to "user-owned" style.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The session exercise logger MUST display a muted "prev" reference row below each active set row when prior session data exists for the same variant exercise.
- **FR-002**: "Prev" rows MUST be hidden entirely when no prior session data exists, preserving the original 2-column set layout.
- **FR-003**: Each variant exercise MUST support an optional numeric load increment field, stored per exercise, independent of other exercises.
- **FR-004**: A configured load increment MUST be displayed as a compact chip on the exercise row in the variant exercise list.
- **FR-005**: Pre-fill computation MUST use the pull-on-open model: values are computed at session-open time from the last completed session's data, the exercise's configured increment, and the saved progression intent.
- **FR-006**: Pre-fill MUST only be applied to a set row that has no existing saved data. A row with any user-entered saved value MUST NOT be overwritten by pre-fill — on first open or any subsequent open.
- **FR-007**: Pre-filled set rows MUST be visually distinguished from user-entered rows via a muted background tint until the user edits the value.
- **FR-008**: Editing a pre-filled value in any set row MUST immediately clear that row's tint; all other rows in the exercise are unaffected.
- **FR-009**: The exercise card header MUST show a directional badge (▲ / ▼ / =) and provenance label ("from [date]") whenever pre-fill is active for that exercise.
- **FR-010**: Users MUST be able to copy the reps and load values from any set to the next set with a single tap; the copy action MUST fire the save commit automatically.
- **FR-011**: The copy button MUST NOT appear on the first set row, and MUST appear in a disabled/muted state when the previous set has no values.
- **FR-012**: Copy buttons MUST NOT be shown in read-only (coach) mode.
- **FR-013**: All new interactive elements MUST meet the 44 × 44 px minimum touch target size on mobile viewports.
- **FR-014**: EN + PL translations MUST be provided for all new UI strings simultaneously.

### Key Entities

- **StrengthVariantExercise** (extended): Gains an optional `progressionIncrement` numeric field (null = not configured). Stored per exercise, not per variant.
- **Session pre-fill computation**: A derived value calculated at session-open time from: (a) the most recent completed `StrengthSessionExercise` for the same `variantExerciseId`, (b) that exercise's `progressionIncrement`, and (c) the saved `progression` intent. Not stored as a separate entity.
- **Set row ownership state**: A client-side flag per set row — "pre-filled" (tinted, came from computation) vs "user-owned" (un-tinted, entered or copied by the user). Derived from whether the row has existing saved data on open; transitions to "user-owned" on first edit.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An athlete can review their previous session's per-set values without leaving the active session logger — zero additional taps to see prior data.
- **SC-002**: An athlete starting a session for a repeat variant can accept all pre-filled values and complete the logger in under 10 seconds without typing a single character.
- **SC-003**: Copying one set's values to the next set costs exactly 1 tap, verified on iOS and Android WebView.
- **SC-004**: 100% of exercises with a configured increment and a saved progression intent show correct computed pre-fill values on the next session open.
- **SC-005**: Pre-filled values are never overwritten after the user has committed a value to any set row — verified by closing and reopening the session.
- **SC-006**: The session logger renders without horizontal scroll on viewports as narrow as 320 px (iPhone SE) with "prev" rows visible.
- **SC-007**: EN + PL i18n coverage at 100% for all new keys.
- **SC-008**: `pnpm typecheck` passes with 0 errors after all changes.

---

## Assumptions

- The existing `setsData: SetEntry[]` field on `StrengthSessionExercise` is the canonical per-set history source for "prev" rows and pre-fill. The `actualReps` / `loadKg` top-set fields remain as before.
- Load increment is stored in the same unit as the exercise's `loadUnit` (kg or sec).
- The progression intent UI (`ProgressionToggle` component) is not visually changed by this feature — only the downstream pre-fill consequence is added.
- "Previous session" means the most recent **completed** session for the same `variantId`, scoped to the current athlete.
- Pre-fill "user-owned" state is determined at open time by whether a set row already has saved data in the session record — not tracked as a separate database field.
