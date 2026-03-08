# Feature Specification: Google Sheets Training Data Migration

**Feature Branch**: `001-sheets-data-migration`
**Created**: 2026-03-08
**Status**: Ready for Planning

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View All Historical Sessions in Synek (Priority: P1)

The athlete has 25 weeks of training history recorded in Google Sheets (September 2025 – March 2026). After migration, they open Synek and can browse any past week — seeing each session with the correct type, the coach's pre-session instructions, and what they actually executed (duration, distance, pace, heart rate, RPE, notes).

**Why this priority**: This is the core value of the migration. Without historical data visible in Synek, the athlete cannot fully leave Google Sheets.

**Independent Test**: Navigate to any past week (e.g., Week 10, October 2025), confirm all sessions appear with correct type, planned description, and actual performance data.

**Acceptance Scenarios**:

1. **Given** the migration has run, **When** the athlete navigates to any week between Week 1 (2025-09-29) and Week 23 (2026-03-02), **Then** all sessions for each day appear with the correct training type, description, and actual data.
2. **Given** a day with no training (rest day / empty in sheet), **When** the athlete views that day, **Then** either no session appears or a rest-day entry is shown — not an error.
3. **Given** a week with a recorded load type (low/medium/high), **When** the athlete views that week, **Then** the weekly load indicator matches the value from the sheet.
4. **Given** a day with multiple combined activities (e.g., strength + easy run), **When** the athlete views that day, **Then** separate sessions appear for each distinct activity.

---

### User Story 2 - Actual Performance Data Captured Per Session (Priority: P2)

When viewing a completed session, the athlete sees not just the plan but also what they actually did: how long they trained, how far, at what pace, their average and max heart rate, and their perceived exertion (RPE 1–10).

**Why this priority**: The Google Sheet captures actual vs. planned data side-by-side. Preserving actual performance data is essential for the athlete and coach to track progress and analyse trends.

**Independent Test**: Open the 2025-10-12 half-marathon session. Verify actual duration (1:41:13), actual distance (21.12 km), average HR (172), max HR (208), and RPE (8) are displayed.

**Acceptance Scenarios**:

1. **Given** a completed session with actual data, **When** the athlete views it, **Then** actual duration, distance, pace, average HR, max HR, and RPE are all visible.
2. **Given** a session with no actual data (future/unexecuted), **When** the athlete views it, **Then** only planned data is shown; actual fields are absent or marked as pending.
3. **Given** a session marked as completed (✅ in the original sheet or has actual data recorded), **When** viewed in Synek, **Then** it shows as completed with a completion date.

---

### User Story 3 - Coach Adds Post-Training Feedback After Completion (Priority: P2)

Once an athlete marks a session as done, the coach can write post-training feedback for that session — separate from the pre-session instructions they wrote when planning. Historical post-training feedback from the sheet is pre-populated in this field.

**Why this priority**: The Google Sheet has a dedicated column for coach feedback written after execution. This workflow (plan → athlete executes → coach reviews) is central to the coaching loop.

**Independent Test**: Open a completed session (e.g., 2025-10-25 interval run). Verify the pre-session instructions and the coach's post-training comment are both displayed as separate fields.

**Acceptance Scenarios**:

1. **Given** a completed session with pre-session instructions, **When** viewed by either role, **Then** the pre-session instructions are displayed.
2. **Given** a completed session where the coach wrote post-training feedback in the sheet, **When** viewed, **Then** that feedback appears in a distinct post-training feedback field — not mixed with the pre-session instructions.
3. **Given** a session that was just marked done by the athlete, **When** the coach views it, **Then** the coach can write (or edit) post-training feedback for that session.
4. **Given** a session that is not yet completed, **When** the coach views it, **Then** the post-training feedback field is not available (the session hasn't happened yet).

---

### User Story 4 - Data Validated Before Import (Priority: P2)

Before any data is written, every row from the CSV is validated. Invalid or unrecognisable rows are reported — not silently skipped or incorrectly saved.

**Why this priority**: Corrupt or malformed data would cause hard-to-diagnose issues in the UI. Validation ensures data integrity from day one.

**Independent Test**: Run the migration against the CSV and observe a printed summary: total rows processed, sessions created, weeks created, rows rejected with specific reasons.

**Acceptance Scenarios**:

1. **Given** the CSV has rows with missing required fields (e.g., no date), **When** migration runs, **Then** those rows are skipped and reported with their row number and the specific issue.
2. **Given** all rows are valid, **When** migration runs, **Then** a success summary is printed with total weeks and sessions created.
3. **Given** a record for a date that already exists in the database, **When** migration runs again, **Then** no duplicate record is created (idempotent behaviour).

---

### Edge Cases

- Days with combined activities in one sheet row (e.g., "Strength + Easy Run 8km") — split into separate session records, one per activity. If the type is ambiguous or unknown, it maps to the "other" type.
- Planned km/duration embedded in description text but not in a dedicated column — leave planned duration and distance fields null for migrated sessions; do not attempt to parse from free text.
- Malformed time strings (e.g., `44:43:00` recorded instead of `0:44:43`) — normalise to correct duration during import.
- Comma-as-decimal in distance values (e.g., `"9,00"` km) — convert to decimal dot format.
- Empty days within a week (no training, no data at all) — skip gracefully; do not create empty session records.
- Future weeks (24–25) with a plan but no actual data — import as planned-only sessions with `isCompleted = false`.
- Body weight recordings in the `Waga:` column — append as text to the `athleteNotes` field of the closest session on that day (e.g., "Weight: 88.5 kg"); if no session exists that day, attach to the final session of the week.
- Emoji and special characters in descriptions (✅, 🥵, 💪) — preserve as-is in text fields.
- The `TYDZIEŃ` column is a sequential training-plan counter (1–25), not an ISO week number — derive actual ISO week from the `DATA` date column.

## Requirements *(mandatory)*

### Functional Requirements

**Schema alignment — new fields:**

- **FR-001**: The session data model MUST include fields for actual performance: actual duration (minutes), actual distance (km), actual pace (min/km), average heart rate (bpm), max heart rate (bpm), and RPE (integer 1–10).
- **FR-002**: The weekly plan data model MUST include a field for actual completed kilometres for the week (separate from the existing planned-km field).
- **FR-003**: The session data model MUST add a `coachPostFeedback` field — a free-text field separate from the existing pre-session `coachComments`. This field is only writable when the session is marked as completed.
- **FR-004**: The `isCompleted` flag MUST be set to true when the session has ✅ in the description OR when actual performance data (duration or distance) is present in the sheet.
- **FR-005**: A new training type "other" MUST be added to the type system to accommodate activities from the sheet that do not match any existing type.

**Schema fields challenged — not in Google Sheets:**

- **FR-006**: The following existing app fields are NOT present in the Google Sheet and will be null for all migrated records: Strava activity linkage, structured interval blocks, terrain type, elevation gain, muscle groups, equipment, pool length, stroke type. These fields MUST be retained in the schema for future use but are NOT populated during this migration.
- **FR-007**: Planned session duration and planned session distance are NOT explicit columns in the sheet (they appear embedded in description text). These fields MUST remain in the schema but will be null for all migrated sessions.
- **FR-008**: The "Training Focus" field currently shown in the Week Summary view MUST be removed from the UI, as it has no corresponding concept in the Google Sheet and is not tracked by the athlete.

**Training type mapping:**

- **FR-009**: Training type values from the sheet MUST map as follows: BIEG → run, ROWER/spinning → cycling, SIŁA/Siłowy → strength, Basen/PŁYWANIE → swimming. Any entry that cannot be mapped to a known type MUST be assigned the "other" type and logged with a note.

**Multi-activity days:**

- **FR-010**: When a day's sheet entry contains multiple distinct activities (e.g., "Trening siłowy + Easy Run 8km"), the migration MUST create one separate session record per activity, each with its own training type. The `sort_order` field MUST be used to preserve the original order within the day.

**Body weight:**

- **FR-011**: Body weight data from the `Waga:` column MUST be appended as plain text to the `athleteNotes` field of the associated session on that date (e.g., "Weight: 88.5 kg"). It is NOT stored as a separate field or entity.

**Data validation:**

- **FR-012**: Every CSV row MUST be validated before writing. Minimum required: a valid date and at least one of (description or recognisable training type).
- **FR-013**: Date values MUST be in or convertible to YYYY-MM-DD format. Malformed dates cause the row to be rejected and logged.
- **FR-014**: Numeric fields (distance, heart rate, RPE) MUST be converted from string format — including comma-decimal notation and HH:MM:SS time strings — to their correct numeric type before validation.
- **FR-015**: Each row MUST pass a schema check before insertion. Rows failing validation MUST be reported with the specific failing field and reason.

**Migration behaviour:**

- **FR-016**: All 25 weeks (2025-09-29 through the week of 2026-03-22) MUST be migrated, including future weeks with planned-only data.
- **FR-017**: The migration MUST be idempotent: running it multiple times MUST NOT create duplicate week plan or session records.
- **FR-018**: Migration MUST be scoped to a specific athlete (the athlete whose Google Sheet data this is).
- **FR-019**: The migration MUST print a final summary: total weeks created, total sessions created, total rows skipped, and any warnings.

### Key Entities

- **WeekPlan**: One record per ISO week per athlete. Gains a new `actualTotalKm` field (realised km for the week, from `KM ZREALIZOWANE`). Existing fields `totalPlannedKm` (from `KM ZAPLANOWANE`), `loadType` (from `Obciążenie`), and `coachComments` map directly from sheet columns.
- **TrainingSession**: One record per activity per day per athlete (multiple per day where the sheet combines activities). Gains new fields: `actualDurationMinutes`, `actualDistanceKm`, `actualPace`, `avgHeartRate`, `maxHeartRate`, `rpe`, `coachPostFeedback`. Existing `coachComments` maps from pre-session coach instructions. Existing `athleteNotes` maps from athlete session notes (with body weight appended where present).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the 25 training weeks (September 2025 – March 2026) from Google Sheets are accessible in Synek after migration — zero weeks missing.
- **SC-002**: All sessions with actual performance data display correct values for duration, distance, and heart rate when viewed in the app.
- **SC-003**: The migration produces a validation report; no data is silently lost — every skipped or rejected row is logged with a clear reason.
- **SC-004**: Running the migration script a second time results in zero new records created (idempotent).
- **SC-005**: The athlete can fully discontinue using Google Sheets for training history — all data previously tracked there is available in Synek.
- **SC-006**: The coach can write and view post-training feedback on any completed session, separate from pre-session instructions.

## Assumptions

- The CSV is for athlete Artur Cempura; migration targets his athlete account.
- ISO weeks are derived from the `DATA` date column, not the sheet's `TYDZIEŃ` counter.
- Load type mapping: `niskie` → easy, `średnie` → medium, `wysokie` → hard.
- Sessions with ✅ in the description, OR with actual performance data filled in, are treated as completed.
- Future weeks (24–25) with plan but no actual data are imported as planned sessions with `isCompleted = false`.
- Migration runs once in a controlled environment (not an automated background process).
- Emoji and Polish characters in text fields are preserved as-is.
- The weekly total training time column (`ŁĄCZNY CZAS TRENINGU Z CAŁEGO TYGODNIA`) is informational and does not require a dedicated field — it can be derived from session data.
