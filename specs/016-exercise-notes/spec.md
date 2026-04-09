# Feature Specification: Exercise Notes per Session

**Feature Branch**: `016-exercise-notes`
**Created**: 2026-04-09
**Status**: Draft
**Input**: User description: "Add a notes field per strength exercise per session. Each exercise row in a strength session form can have a text note attached. When viewing a previous session (collapsed component), the notes from that session's exercises are visible alongside the other exercise data."

## Context & Background

The strength session logger already stores `notes` per exercise in the database (`strength_session_exercises.notes`) and the data type carries this field. However, the field is never exposed in the UI — there is no input for athletes to write notes, and the Previous Session collapsible (`PrevSummary`) does not display notes from the prior session.

The Supabase RPC `get_last_session_exercises` (used for prefill) also does not return `notes`, so previous-session notes cannot flow through to the display.

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Athlete writes a note while logging an exercise (Priority: P1)

An athlete logging a strength session can type a free-text note on any exercise row. The note is optional. When the session is saved (or auto-saved on blur), the note is persisted alongside the reps/load data.

**Why this priority**: Core value of the feature — nothing else works without the input existing.

**Independent Test**: Open a strength session, type a note on one exercise, blur the field or save the session, reload the page, and confirm the note is still present.

**Acceptance Scenarios**:

1. **Given** an athlete is logging a strength session, **When** they expand an exercise card, **Then** a text input area for notes is visible below the set rows.
2. **Given** the athlete types a note and moves focus away (blur), **When** the session is saved, **Then** the note is persisted and survives a page reload.
3. **Given** the athlete leaves the notes field empty, **When** the session is saved, **Then** no error occurs and the note is stored as null/empty.
4. **Given** the athlete previously saved a note, **When** they reopen the session form, **Then** the note is pre-populated in the field.

---

### User Story 2 — Notes from the previous session are visible in the PrevSummary collapsible (Priority: P2)

When a previous session's data is loaded as prefill context, and that session contained a note for an exercise, the note appears inside the collapsed "Previous session" component for that exercise.

**Why this priority**: The motivating use case — carrying coaching cues or personal observations forward to the next session.

**Independent Test**: Complete a session with a note on an exercise, start a new session using the same variant, expand the Previous Session collapsible on that exercise, and confirm the note text is shown.

**Acceptance Scenarios**:

1. **Given** a previous session has a note for an exercise, **When** the athlete opens a new session for the same variant and expands PrevSummary, **Then** the note text is displayed within the expanded collapsible.
2. **Given** a previous session has no note for an exercise, **When** the athlete opens PrevSummary, **Then** no notes section is shown (no empty label).
3. **Given** a previous session note is very long, **When** displayed in PrevSummary, **Then** the text wraps gracefully without breaking the layout.

---

### Edge Cases

- What happens when the athlete clears a previously saved note? The field accepts empty input and persists null.
- What does a coach see when no note exists? Nothing — the notes area is hidden entirely for coaches when the note is empty.
- What if the previous session note was written for an exercise that no longer exists in the variant? The exercise won't appear (existing behavior), so this is a non-issue.
- What happens if the note is longer than a reasonable limit? Input accepts up to 1000 characters; beyond that, input is silently capped at the field level.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Athletes MUST be able to enter a free-text note on each exercise card within a strength session form.
- **FR-002**: Notes MUST be persisted per exercise per session (scoped to the session + exercise pair).
- **FR-003**: Notes MUST be restored when an athlete reopens an in-progress or previously completed session.
- **FR-004**: The note input MUST be optional — leaving it blank must not block saving.
- **FR-005**: Notes from the previous session MUST be fetched alongside the other prefill data (reps, load, progression) via the existing last-session lookup.
- **FR-006**: When a previous-session note exists, it MUST be displayed inside the expanded PrevSummary collapsible for that exercise.
- **FR-007**: When no previous-session note exists, the notes area MUST NOT be shown in PrevSummary (no empty placeholder).
- **FR-008**: The note input MUST be editable only by the athlete. When a coach views the same session, the note field MUST be read-only (displayed as static text if a note exists, hidden if empty).
- **FR-009**: Notes MUST accept up to 1000 characters; longer input is capped at the field level.
- **FR-010**: All new UI strings (label, placeholder, aria-label) MUST be added to both `en` and `pl` translation namespaces simultaneously.

### Key Entities

- **Exercise Note**: A free-text annotation attached to one exercise within one session. Scoped to the `(session, exercise)` pair. Optional, up to 1000 characters.
- **Previous Session Data**: The snapshot of a prior session used as a reference. Must now include each exercise's note so it can be shown in PrevSummary.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: An athlete can enter, save, and retrieve a note on any exercise without additional steps beyond typing and blurring the field.
- **SC-002**: Previous-session notes appear in the PrevSummary collapsible without requiring any extra action from the athlete.
- **SC-003**: The notes input does not introduce layout shift or visual regression in the exercise card at any common screen width.
- **SC-004**: Type checking passes with no new errors after implementation.
- **SC-005**: Both `en` and `pl` translation files are updated — no untranslated string keys remain in the rendered UI.

## Assumptions

- Notes are per exercise per session, not per set. One note field per exercise card.
- The existing DB column (`strength_session_exercises.notes`) is already in place and requires no schema change.
- The `get_last_session_exercises` Supabase RPC needs a new migration to add `notes` to its return set so previous-session notes flow through to PrevSummary.
- The 1000-character cap is enforced in the UI only (no DB constraint change needed).
- In coach (read-only) view: if a note exists it is shown as static text; if empty it is hidden entirely. This is the opposite of the earlier assumption — coaches DO see existing notes but cannot edit them.
