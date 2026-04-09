# Data Model: Exercise Notes per Session

**Feature**: `016-exercise-notes`
**Date**: 2026-04-09

## Entities

### ExerciseNote (logical — no new table)

Notes are not a separate entity. They are a field on the existing `StrengthSessionExercise` record.

| Attribute | Type           | Constraint                             | Notes                                         |
| --------- | -------------- | -------------------------------------- | --------------------------------------------- |
| `notes`   | `text \| null` | optional, max 1000 chars (UI-enforced) | Already on `strength_session_exercises` table |

**Scope**: one note per `(session_id, variant_exercise_id)` pair — the composite unique key that already governs the table.

**Ownership**: written by athlete only; readable by coach (read-only).

---

## Schema Changes

### No new tables or columns

The `strength_session_exercises.notes` column is already present (migration `022_strength_variants.sql`).

### Migration required: `get_last_session_exercises` RPC

**File**: `supabase/migrations/20260409000000_add_notes_to_last_session_rpc.sql`

Add `notes text` to the `RETURNS TABLE` clause and `sse.notes` to the CTE projection. No other changes to the function logic.

```sql
-- Before (returns table excerpt):
RETURNS TABLE (
  variant_exercise_id uuid,
  actual_reps         integer,
  load_kg             numeric,
  sets_data           jsonb,
  progression         text,
  completed_at        timestamptz,
  last_session_date   date
)

-- After:
RETURNS TABLE (
  variant_exercise_id uuid,
  actual_reps         integer,
  load_kg             numeric,
  sets_data           jsonb,
  progression         text,
  notes               text,       -- ← added
  completed_at        timestamptz,
  last_session_date   date
)
```

---

## Type Changes

### `LogRowChange` (in `SessionExerciseLogger.tsx`)

```ts
// Before
export interface LogRowChange {
  variantExerciseId: string;
  actualReps: number | null;
  loadKg: number | null;
  setsData: SetEntry[];
  progression: ProgressionIntent | null;
}

// After
export interface LogRowChange {
  variantExerciseId: string;
  actualReps: number | null;
  loadKg: number | null;
  setsData: SetEntry[];
  progression: ProgressionIntent | null;
  notes?: string | null; // ← added
}
```

No other type changes. `StrengthSessionExercise`, `UpsertSessionExercisesInput`, and the hook already carry `notes`.

---

## Data Flow

```
Athlete types note
  → ExerciseCard local state (notes: string)
  → onBlur → commit()
  → LogRowChange { notes }
  → SessionExerciseLogger.onChange
  → useUpsertSessionExercises.mutate({ exercises: [{ notes }] })
  → upsertSessionExercises → strength_session_exercises.notes persisted

Next session opened
  → fetchLastSessionExercises → get_last_session_exercises RPC (now returns notes)
  → toStrengthSessionExercise maps r.notes
  → prefillData[exerciseId].notes = "previous note"
  → ExerciseCard receives prefill prop
  → PrevSummary receives notes prop
  → Expanded PrevSummary shows note text
```

---

## Validation Rules

| Rule                        | Enforcement                                                    |
| --------------------------- | -------------------------------------------------------------- |
| Notes are optional          | Field accepts empty string; stored as `null`                   |
| Max 1000 characters         | `maxLength={1000}` on `<Textarea>` (UI only)                   |
| Athlete-only write          | `readOnly` prop on `ExerciseCard` hides/disables input         |
| Coach read visibility       | When `readOnly=true` and note non-empty, textarea is disabled  |
| Coach empty-note visibility | When `readOnly=true` and note null/empty, notes area is hidden |
