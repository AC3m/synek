# Research: Google Sheets Training Data Migration

**Phase**: 0 — Research
**Branch**: `001-sheets-data-migration`
**Date**: 2026-03-08

---

## 1. CSV Structure Analysis

**Decision**: Parse the CSV at `.data/googleSheetData.csv` using `papaparse` with header mapping.

**Rationale**: The CSV contains quoted multiline fields (athlete notes span multiple rows), comma-inside-string values (distances like `"9,00"`), and emoji characters. `papaparse` handles all three automatically. Manual parsing would re-implement a non-trivial subset of the RFC 4180 spec.

**Bundle impact**: `papaparse` is used only in the migration script — a Node CLI that never ships to the browser. No bundle cost. Add as a `devDependency`.

**Alternatives considered**:
- Manual split parsing — rejected: fragile with quoted multiline cells (athlete interval notes span many rows, e.g., rows 45–52 in the CSV form a single cell).
- `csv-parse` — equivalent capability, but `papaparse` is already widely familiar in the JS ecosystem and has zero-config browser/Node dual mode.

### Column mapping table

| CSV column | Polish header | Maps to | Notes |
|---|---|---|---|
| Col 1 | `TYDZIEŃ` | ignored as week ID | Sequential plan counter, not ISO week |
| Col 2 | `DATA` | `weekStart` (derived) + `dayOfWeek` | YYYY-MM-DD; derive ISO week Monday |
| Col 3 | `D.T.` | `dayOfWeek` (fallback) | pon/wt/śr/czw/pt/sob/niedz |
| Col 4 | `OPIS` | `session.description` | Planned session description |
| Col 5 | `UWAGI TRENERA:` | `session.coachComments` | Pre-session coach instructions |
| Col 6 | `UWagi trenera po wykonanym...` | `session.coachPostFeedback` | Post-training coach feedback |
| Col 7 | `Obciążenie:` | `weekPlan.loadType` | Per-week; only on first row of week |
| Col 8 | `KM ZAPLANOWANE:` | `weekPlan.totalPlannedKm` | Per-week; only on first row |
| Col 9 | `KM ZREALIZOWANE:` | `weekPlan.actualTotalKm` | Per-week; only on first row |
| Col 10 | `ŁĄCZNY CZAS TRENINGU Z CAŁEGO TYGODNIA:` | ignored | Derivable from sessions; no new field needed |
| Col 11 | `ŁĄCZNY CZAS TRENINGU Z DANEGO DNIA` | ignored | Use per-session `CZAS` instead |
| Col 12 | `TĘTNO ŚREDNIE` | `session.avgHeartRate` | Integer bpm |
| Col 13 | `TĘTNO MAX` | `session.maxHeartRate` | Integer bpm |
| Col 14 | `ZMĘCZENIE 1-10` | `session.rpe` | Integer 1–10 |
| Col 15 | (empty separator) | ignored | — |
| Col 16 | `CZAS` | `session.actualDurationMinutes` | HH:MM:SS → convert to minutes |
| Col 17 | `DYSTANS` | `session.actualDistanceKm` | Comma-decimal → dot decimal |
| Col 18 | `TEMPO` | `session.actualPace` | Stored as text string (e.g., "4:47") |
| Col 19 | `RODZAJ` | `session.trainingType` | See type mapping below |
| Col 20 | `UWAGI ZAWODNIKA:` | `session.athleteNotes` | May be appended with weight |
| Col 21 | `Waga:` | appended to `session.athleteNotes` | As "Weight: XX kg" text |

---

## 2. Training Type Mapping

**Decision**: Map known sheet values to existing types; add `other` for unknowns. Do not attempt description-text parsing to infer type.

| Sheet value | Mapped type | Notes |
|---|---|---|
| BIEG | `run` | Case-insensitive |
| ROWER | `cycling` | Includes spinning entries |
| SIŁA, Siłowy, upper body, FBW | `strength` | Case-insensitive prefix match |
| Basen, PŁYWANIE | `swimming` | — |
| (empty + no activity in description) | skip row | Rest days with no `RODZAJ` field |
| anything else | `other` | Logged as warning |

**Multi-activity rows**: A single sheet row for one day may describe multiple activities (e.g., "Trening siłowy + Easy Run 8km"). Resolution:
- Primary `RODZAJ` value → first session (sort_order 0)
- Secondary activities parsed from description text using keyword detection → additional sessions (sort_order 1+)
- Each additional session gets the same `description` text as the primary, with `trainingType` inferred from keyword

---

## 3. Load Type Mapping

| Sheet value (case-insensitive) | Mapped type |
|---|---|
| niskie, low | `easy` |
| średnie, średnia, medium | `medium` |
| wysokie, ciężki, cieżki, high | `hard` |
| (empty) | `null` |

---

## 4. Day-of-Week Mapping

| Polish abbrev | Day |
|---|---|
| pon. | monday |
| wt. | tuesday |
| śr. | wednesday |
| czw. | thursday |
| pt. | friday |
| sob. | saturday |
| niedz. | sunday |

Authoritative source: `DATA` column date → compute `getDay()` → map to `DayOfWeek`. Polish abbreviation used as fallback only if date is missing.

---

## 5. Week Grouping Strategy

**Decision**: Group rows into ISO weeks using the Monday date derived from `DATA` using `date-fns` `startOfISOWeek`.

**Rationale**: The sheet's `TYDZIEŃ` column is a sequential plan counter (1–25 from Sep 2025), not ISO week numbers. ISO weeks are consistent with the app's existing `weekStart` convention. `date-fns` is already a project dependency.

**Week start derivation**:
```
weekStart = format(startOfISOWeek(parseISO(row.DATA)), 'yyyy-MM-dd')
year = getISOWeekYear(date)
weekNumber = getISOWeek(date)
```

**Edge**: Week 25 starts 2026-03-16 — row `2026-03-22` (Rome Marathon) falls in the same ISO week (W12 2026). The sheet marks it as week 25 in its counter — this is fine since we use ISO weeks internally.

---

## 6. Duration Parsing

**Decision**: Parse all duration strings to total minutes (integer), handling multiple observed formats.

**Formats found in CSV**:
- `HH:MM:SS` → standard, e.g., `01:41:13` = 101 minutes
- `H:MM:SS` → e.g., `1:47:00` = 107 minutes
- `MM:SS` → ambiguous; treat as MM:SS if hours field < 3 (i.e., `00:54` = 54 minutes... but `44:43:00` would be invalid — treat `44:43:00` as 44h:43m:00s → likely data entry error → cap at `44:43` = 44 minutes 43 seconds → 44 minutes)
- `HH:MM` → two-part strings, treat as hours:minutes

**Heuristic**: If a time string has two colons, parse as H:M:S. If one colon, parse as M:S if both parts ≤ 59, otherwise H:M. Log any time that parses to more than 600 minutes as a warning.

---

## 7. Distance Parsing

**Decision**: Replace comma with period, then `parseFloat`. Strip non-numeric suffix (e.g., `"8km"` → `8`).

**Formats found**: `"9,00"`, `12km`, `"21,12"`, `12.48` — all normalised to float.

---

## 8. Completion Detection

**Decision**: Mark `isCompleted = true` if the row has ✅ in `OPIS` OR if `actualDurationMinutes` or `actualDistanceKm` is non-null. Set `completedAt = DATA` (the session date, as a UTC midnight ISO string).

---

## 9. Migration Script Runtime

**Decision**: Standalone TypeScript script at `scripts/migrate-sheets.ts`, executed with `pnpm dlx tsx scripts/migrate-sheets.ts`.

**Rationale**: The project has no server runtime. `tsx` executes TypeScript directly without a build step. It's a one-time script run by a developer with Supabase credentials in environment variables, matching how Supabase migrations are applied.

**Environment**: Reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from `.env` or environment. Must be run with a service-role key or an authenticated user with insert permissions.

**Idempotency strategy**:
- Week plans: `upsert` on `(athlete_id, week_start)` unique constraint.
- Sessions: Match on `(week_plan_id, day_of_week, sort_order)` via select-then-insert. If a session already exists for that slot, skip (log "already exists").

---

## 10. Zod Validation Schema Design

**Decision**: Define two Zod schemas — one for raw CSV rows (loose, string-typed), one for the validated output ready for DB insertion (strict, typed). Transformation happens in the pipeline between them.

**Approach**:
```
CsvRowSchema (z.object with z.string() for all fields)
  → transform() → parse/normalise all fields
  → ValidatedSessionSchema (strict types, nullable where appropriate)
```

Any row failing the validated schema is collected into an error report and skipped (not thrown).

---

## 11. UI Changes Summary

**Training Focus removal**:
- `WeekSummary.tsx` renders a `description` field labelled "Training Focus" (via `t('coach:weekSummary.description')`).
- This is the `weekPlan.description` field — has no corresponding Google Sheet column at week level.
- **Remove** this field from the `WeekSummary` component. Retain the DB column (used for other purposes, e.g., admin annotations), but remove from the coach-facing week summary UI.

**New session fields display**:
- Actual performance data (duration, distance, pace, HR, RPE) shown on `SessionCard` for completed sessions — collapsed by default, expandable.
- `coachPostFeedback` displayed below `coachComments` on `SessionCard` when session is completed; editable by coach only.

---

## 12. `coach_post_feedback` Write Permissions

**Decision**: `coach_post_feedback` is writable by coach via the existing `updateSession` query path. Athletes cannot write to it (RLS enforced). Visibility: both roles can read it.

**UI trigger**: Coach sees an editable textarea for `coachPostFeedback` only when `session.isCompleted = true`. Field renders as read-only placeholder ("No post-training feedback yet") when empty.

**No new RLS policy needed**: Existing `coach_assigned_athlete_training_sessions` policy already covers UPDATE for coaches. The field will be part of the standard `UPDATE training_sessions SET coach_post_feedback = $1 WHERE id = $2`.
