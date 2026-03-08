# Tasks: Google Sheets Training Data Migration

**Input**: Design documents from `/specs/001-sheets-data-migration/`
**Branch**: `001-sheets-data-migration`

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no blocking dependencies)
- **[US#]**: User story this task belongs to

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare tooling and script skeleton before any DB or UI work.

- [x] T001 Add `papaparse` and `@types/papaparse` as devDependencies in `package.json` via `pnpm add -D papaparse @types/papaparse`
- [x] T002 Create `scripts/migrate-sheets.ts` with top-level skeleton: env-var checks (`VITE_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ATHLETE_ID`), Supabase client init using service-role key, CSV file path constant (`.data/googleSheetData.csv`), and `main()` stub that reads the file and logs row count

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema, types, mappers, and mock parity must be complete before any user story UI or migration logic can be implemented.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T003 Write `supabase/migrations/009_sheets_schema_extension.sql`: add `other` to `training_type` enum; add columns `actual_duration_minutes INTEGER`, `actual_distance_km DECIMAL(6,2)`, `actual_pace TEXT`, `avg_heart_rate INTEGER`, `max_heart_rate INTEGER`, `rpe INTEGER CHECK (rpe >= 1 AND rpe <= 10)`, `coach_post_feedback TEXT` to `training_sessions`; add `actual_total_km DECIMAL(6,2)` to `week_plans`
- [x] T004 [P] Extend `app/types/training.ts`: add `'other'` to `TRAINING_TYPES` and `TrainingType`; add `OtherData` interface (`{ type: 'other' }`); add `OtherData` to `TypeSpecificData` union; add `actualDurationMinutes`, `actualDistanceKm`, `actualPace`, `avgHeartRate`, `maxHeartRate`, `rpe`, `coachPostFeedback` (all `number | null` or `string | null`) to `TrainingSession`; add `actualTotalKm: number | null` to `WeekPlan`; extend `UpdateSessionInput` and `CreateSessionInput` with the same new optional fields; extend `UpdateWeekPlanInput` with `actualTotalKm?: number | null`
- [x] T005 [P] Add `other` entry to `trainingTypeConfig` in `app/lib/utils/training-types.ts`: `{ color: 'text-slate-600', bgColor: 'bg-slate-100', icon: 'Activity' }`; also add `Activity` to the `iconMap` import in `app/components/calendar/SessionCard.tsx`
- [x] T006 Update `app/lib/queries/sessions.ts`: extend `toSession()` mapper to read the 7 new columns from DB row; extend `createSession()` insert payload to include the new fields when present in input; extend `updateSession()` diff-builder to include `actual_duration_minutes`, `actual_distance_km`, `actual_pace`, `avg_heart_rate`, `max_heart_rate`, `rpe`, `coach_post_feedback`
- [x] T007 Update `app/lib/queries/weeks.ts`: extend `toWeekPlan()` mapper to read `actual_total_km`; extend `updateWeekPlan()` diff-builder to include `actual_total_km`
- [x] T008 Update `app/lib/mock-data.ts`: add `actualDurationMinutes: null, actualDistanceKm: null, actualPace: null, avgHeartRate: null, maxHeartRate: null, rpe: null, coachPostFeedback: null` to every `TrainingSession` object in seed functions; add `actualTotalKm: null` to every `WeekPlan` object; extend `mockCreateSession` and `mockUpdateSession` to pass through any new fields present in their input; extend `mockUpdateWeekPlan` to handle `actualTotalKm`
- [x] T009 [P] Add `"other": "Other"` to `trainingTypes` in `app/i18n/resources/en/common.json` and `"other": "Inne"` in `app/i18n/resources/pl/common.json`
- [x] T010 Remove "Training Focus" from `app/components/calendar/WeekSummary.tsx`: delete the `description` state variable, the `useEffect` sync for it, the `handleBlur` branch for `'description'`, the Description `<div>` block (textarea + label), and update `onUpdate`'s `Partial<Pick<...>>` to remove `'description'`
- [x] T011 [P] Remove `weekSummary.description` and `weekSummary.descriptionPlaceholder` keys from `app/i18n/resources/en/coach.json` and `app/i18n/resources/pl/coach.json`

**Checkpoint**: Run `pnpm typecheck` — must pass with zero errors before proceeding.

---

## Phase 3: User Story 1 & 4 — Historical Data Migration 🎯 MVP

**Goal**: All 25 weeks of training history imported into Supabase, each day's sessions created with correct types and data, idempotent, validated.

**Independent Test**: Run `pnpm dlx tsx scripts/migrate-sheets.ts --dry-run` → zero validation errors. Then run live → summary shows 25 weeks created, ~150 sessions created. Open any past week in the app and see sessions.

### Implementation

- [x] T012 [US1] Implement all parsing helpers in `scripts/migrate-sheets.ts`: `parseDuration(str): number | null` (HH:MM:SS → minutes, handles malformed strings), `parseDistance(str): number | null` (comma-decimal, strips "km" suffix), `parsePace(str): string | null` (pass-through, normalise separator), `parseHr(str): number | null`, `parseRpe(str): number | null`, `parseLoadType(str): LoadType | null` (Polish → enum), `parseDayOfWeek(date: Date): DayOfWeek`, `deriveWeekStart(date: Date): string` (Monday date via date-fns `startOfISOWeek`)
- [x] T013 [US1] Implement `detectTrainingType(rodzaj: string): TrainingType` in `scripts/migrate-sheets.ts` using case-insensitive matching: BIEG→run, ROWER→cycling, SIŁA/FBW/Siłowy→strength, Basen/PŁYWANIE→swimming, empty→skip marker, else→other
- [x] T014 [US4] Implement Zod schemas in `scripts/migrate-sheets.ts`: `ValidatedSessionSchema` (typed + nullable fields after transformation) and `ValidatedWeekSchema`; implement `validateRow(row): ValidatedSession | ValidationError` that applies all parsing helpers then runs `ValidatedSessionSchema.safeParse()` — no raw-row schema needed since papaparse already guarantees string fields
- [x] T015 [US1] Implement `groupRowsByWeek(rows: CsvRow[]): Map<string, CsvRow[]>` in `scripts/migrate-sheets.ts`: groups by `weekStart` derived from DATA column; handles rows where DATA is empty (skip); carry-forwards week-level fields (`Obciążenie:`, `KM ZAPLANOWANE:`, `KM ZREALIZOWANE:`) from the first non-empty row of each week
- [x] T016 [US1] Implement `splitMultiActivityRow(row: ValidatedSession): ValidatedSession[]` in `scripts/migrate-sheets.ts`: if `OPIS` contains `+` separating distinct activities and `RODZAJ` is empty or only covers one, detect secondary activities by keyword scan (bieg/run, siłow/strength, rower/cycling, basen/swim) and return 2+ session records with sequential `sortOrder` values
- [x] T017 [US1] Implement `upsertWeekPlan(plan: ValidatedWeek, athleteId: string): string` (returns weekPlanId) in `scripts/migrate-sheets.ts` using Supabase `.upsert()` on `(athlete_id, week_start)` conflict key; map all validated week fields to DB columns
- [x] T018 [US1] Implement `insertSession(session: ValidatedSession, weekPlanId: string): 'created' | 'skipped'` in `scripts/migrate-sheets.ts`: first SELECT by `(week_plan_id, day_of_week, sort_order)`; if found, log "skipped" and return; else INSERT with all new fields mapped to DB column names
- [x] T019 [US1] Wire the full pipeline in `main()` of `scripts/migrate-sheets.ts`: read CSV → parse → group by week → for each week: validate week fields + upsertWeekPlan + splitMultiActivityRow + validate each session + insertSession; maintain inline counters (`weeksCreated`, `sessionsCreated`, `sessionsSkipped`, `errors[]`); print summary and any error rows to stdout at the end
- [ ] T020 [US1] Run `pnpm dlx tsx scripts/migrate-sheets.ts`, review output, fix any parse errors or type mismatches; confirm summary shows 25 weeks and the expected session count with 0 rejected rows

**Checkpoint**: Navigate to week of 2025-10-20 in the app → all 7 sessions visible with correct training types.

---

## Phase 4: User Story 2 — Actual Performance Data Display

**Goal**: Completed sessions show actual duration, distance, pace, heart rate, and RPE in the session card.

**Independent Test**: Open the 2025-10-12 half-marathon session → verify "1:41 h", "21.1 km", "4:47 /km", "Avg HR: 172", "Max HR: 208", "RPE: 8/10" are displayed.

### Implementation

- [x] T022 [P] [US2] Add actual performance i18n keys to `app/i18n/resources/en/training.json` and `app/i18n/resources/pl/training.json` under `"actualPerformance"` namespace: `title`, `duration`, `distance`, `pace`, `avgHr`, `maxHr`, `rpe` (see data-model.md for exact strings in both languages)
- [x] T023 [US2] Add `ActualPerformance` display section to `app/components/calendar/SessionCard.tsx`: render below the planned duration/distance row; only when `session.isCompleted` and at least one of the 6 actual fields is non-null; display each non-null field as a small chip `<span>` with its i18n label and formatted value (`X min`, `X.X km`, `X bpm`, `X/10`); use `text-[10px]` sizing consistent with existing planned-fields row
- [x] T024 [US2] Add `actualTotalKm` display and edit to `app/components/calendar/WeekSummary.tsx`: add `actualKm` state (mirrors `weekPlan.actualTotalKm`); add a `useEffect` sync; add an editable `<Input>` labelled `t('coach:weekSummary.actualKm')` below the planned KM input; add `'actualTotalKm'` to the `handleBlur` switch and to the `onUpdate` `Partial<Pick<...>>` type; in `readonly` mode show value as static text, hide if null
- [x] T025 [P] [US2] Add `weekSummary.actualKm` key to `app/i18n/resources/en/coach.json` (`"Actual KM"`) and `app/i18n/resources/pl/coach.json` (`"Zrealizowane KM"`)

**Checkpoint**: Past completed sessions display actual performance chips. WeekSummary shows both planned and actual km rows.

---

## Phase 5: User Story 3 — Coach Post-Training Feedback

**Goal**: Coaches can write post-training feedback on any completed session; athletes can read it; historical feedback from the sheet is pre-populated.

**Independent Test**: Open the 2025-10-25 interval run as coach → a "Post-Training Coach Notes" textarea is editable; type a note, blur, reload → note persists. Open same session as athlete → note is read-only text.

### Implementation

- [x] T026 [P] [US3] Add `coachPostFeedback` i18n keys to `app/i18n/resources/en/training.json` and `app/i18n/resources/pl/training.json` under `"coachPostFeedback"`: `label`, `placeholder`, `empty` (see data-model.md for exact strings in both languages)
- [x] T027 [US3] Add `onUpdateCoachPostFeedback?: (sessionId: string, feedback: string | null) => void` to `SessionCardProps` in `app/components/calendar/SessionCard.tsx`; add a "Post-Training Coach Notes" section that renders only when `session.isCompleted`; coach view (`!athleteMode`): editable `<Textarea>` pre-filled with `session.coachPostFeedback`, saves on blur via `onUpdateCoachPostFeedback`; athlete view: read-only `<p>` with the text or the `empty` i18n string in muted style if null; position this section below the existing `coachComments` display
- [x] T028 [US3] Wire `onUpdateCoachPostFeedback` in `app/routes/coach/week.$weekId.tsx`: add a handler that calls `updateSession({ id: sessionId, coachPostFeedback: feedback })`; pass the handler as `onUpdateCoachPostFeedback` prop to `SessionCard` (or through `WeekGrid` → `DayColumn` → `SessionCard` following the existing prop-drilling pattern used by `onEdit`, `onDelete`)

**Checkpoint**: As coach, add post-training feedback to any completed session. Reload → feedback persists. Switch to athlete view → feedback visible as read-only.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, type-check gate, and smoke test.

- [x] T029 Run `pnpm typecheck` and fix all TypeScript errors — must exit with code 0 before merge
- [x] T030 [P] Run `pnpm build` and confirm production build succeeds with no warnings about missing i18n keys or type errors
- [ ] T031 Smoke-test migrated data end-to-end: log in as athlete → navigate to week of 2025-11-08 (interval run week) → verify the Saturday session shows type "run", description contains interval details, actual distance 12 km, avg HR 156, max HR 176, RPE 8; verify week shows actual KM from migration; log in as coach → add post-training feedback to one session → verify persists

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — **BLOCKS all phases 3–6**
- **Phase 3 (US1/US4 — Migration)**: Depends on Phase 2 completion
- **Phase 4 (US2 — Performance display)**: Depends on Phase 2 completion; independent of Phase 3
- **Phase 5 (US3 — Coach feedback)**: Depends on Phase 2 completion; independent of Phases 3 & 4
- **Phase 6 (Polish)**: Depends on Phases 3, 4, and 5 all being complete

### User Story Dependencies

- **US1/US4 (Phase 3)**: Can start immediately after Phase 2 — no dependency on US2 or US3
- **US2 (Phase 4)**: Can start immediately after Phase 2 — no dependency on US1/US4 or US3
- **US3 (Phase 5)**: Can start immediately after Phase 2 — no dependency on US1/US4 or US2

### Within Each Phase

- T004, T005 are [P] (different files) — run together after T003
- T006, T007 depend on T004 (type changes must exist first)
- T008 depends on T004 (mock must match updated types)
- T009, T011 are [P] (i18n files) — can run alongside T010
- T012–T016 are [P] within Phase 3 (all helpers, all in `scripts/migrate-sheets.ts` — sequential by a single developer but listed by logical grouping)
- T017, T018 depend on T012–T016
- T019 depends on T017, T018 (wire pipeline after upsert/insert functions exist)
- T020 must be last in Phase 3 (live run requires all script work complete)
- T022, T025 are [P] (different files — i18n separate from component)
- T023 depends on T004 (WeekPlan type must include `actualTotalKm`)
- T024 (T025) is [P] with T022
- T026, T027 are [P] (i18n separate from component)
- T028 depends on T027

### Parallel Opportunities

After Phase 2 completes, **Phases 3, 4, and 5 can run in parallel**. Single developer: work Phase 3 first (data in DB), then 4 and 5 (display). Two developers: split Phase 3 and Phase 4+5.

---

## Implementation Strategy

### MVP First (US1 — historical data visible)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational → **run `pnpm typecheck`**
3. Complete Phase 3: Migration script + live run
4. **STOP and validate**: Navigate to a past week → sessions appear in the app — SC-001 and SC-005 satisfied

### Incremental Delivery

1. Phase 1 + 2 → Foundation ready
2. Phase 3 → Data in Supabase (MVP!)
3. Phase 4 → Actual performance visible in UI (SC-002 satisfied)
4. Phase 5 → Coach can add post-training feedback (SC-006 satisfied)
5. Phase 6 → Quality gates passed, ready to merge

---

## Notes

- Migration script is a **one-time developer tool** — run it once, verify, done. Do not over-engineer.
- `--dry-run` is the safety net — always run it first.
- All 7 new columns on `training_sessions` are nullable — no existing data is affected by the migration SQL.
- The `other` training type requires both the enum DB value AND the TS type AND the training-types.ts config AND the i18n key — all 4 must be in place before any component renders a session with that type.
- `pnpm typecheck` must pass at the Foundational checkpoint AND again at Phase 6 before merge.
