# Data Model: Strength Session UX Redesign

**Feature**: `015-strength-session-ux`
**Date**: 2026-04-03

---

## Schema Change

### New column: `strength_variant_exercises.progression_increment`

```sql
ALTER TABLE strength_variant_exercises
  ADD COLUMN progression_increment NUMERIC(6,2) NULL
    CHECK (progression_increment IS NULL OR progression_increment > 0);

COMMENT ON COLUMN strength_variant_exercises.progression_increment
  IS 'Load increment applied to the next session when progression intent is up (subtracted for down). NULL = not configured.';
```

**Migration file**: `supabase/migrations/TIMESTAMP_add_progression_increment.sql`

**No new tables.** All other data (prev-row display, pre-fill, copy-from-set) is derived from existing `strength_session_exercises.sets_data` and computed client-side.

---

## Type Changes

### `StrengthVariantExercise` (app/types/training.ts)

```typescript
export interface StrengthVariantExercise {
  id: string;
  variantId: string;
  name: string;
  videoUrl: string | null;
  sets: number;
  repsMin: number;
  repsMax: number;
  perSetReps: PerSetRep[] | null;
  loadUnit: LoadUnit;
  sortOrder: number;
  supersetGroup: number | null;
  progressionIncrement: number | null;  // ← NEW
  createdAt: string;
}
```

### Input types (`app/types/training.ts`)

Both `CreateStrengthVariantInput.exercises[n]` and `UpsertVariantExercisesInput.exercises[n]` gain:
```typescript
progressionIncrement?: number | null;
```

---

## Row Mapper Change

### `toVariantExercise(row)` in `app/lib/queries/strength-variants.ts`

```typescript
progressionIncrement: row.progression_increment ?? null,
```

---

## Client-side Derived Types

These are **not stored** — they exist only in component state.

### `SetState` (extended, inside `SessionExerciseLogger.tsx`)

```typescript
interface SetState {
  reps: string;
  load: string;
  isPreFilled: boolean;  // ← NEW — true = value came from computePrefillSets, cleared on user edit
}
```

### `PrefillMeta` (passed as prop to `ExerciseCard` alongside `prefill`)

```typescript
interface PrefillMeta {
  direction: 'up' | 'down' | 'maintain' | null;
  incrementApplied: number | null;  // actual delta used (for badge display)
  fromDate: string | null;          // ISO date of the source session
}
```

---

## New Utility Function Signature

### `computePrefillSets` (app/lib/utils/strength.ts)

```typescript
/**
 * Computes the suggested set values for the next session.
 * Only called when the exercise has no existing logged data (logMap entry absent).
 *
 * @param prefill  Last completed session exercise data
 * @param exercise Variant exercise with optional progressionIncrement
 * @returns        Array of SetState (isPreFilled = true for all entries)
 */
export function computePrefillSets(
  prefill: StrengthSessionExercise,
  exercise: StrengthVariantExercise,
): SetState[]
```

**Logic**:

| `prefill.progression` | `exercise.progressionIncrement` | `loadDelta` |
|---|---|---|
| `'up'` | `2.5` | `+2.5` |
| `'up'` | `null` | `0` (no increment configured) |
| `'down'` | `2.5` | `−2.5` |
| `'down'` | `null` | `0` |
| `'maintain'` | any | `0` |
| `null` | any | `0` (no intent set) |

**Per-set computation**:
```
prevLoad = setsData[i]?.loadKg ?? topSetLoadKg
prevReps = setsData[i]?.reps   ?? actualReps
newLoad  = max(0, prevLoad + loadDelta)
```

---

## Entity Relationship (unchanged)

```
strength_variants (1) ──< strength_variant_exercises   [progressionIncrement ← NEW]
training_sessions (1) ──< strength_session_exercises
strength_variant_exercises (1) ──< strength_session_exercises (SET NULL on delete)
```

---

## Mock Data Additions

In `app/lib/mock-data/strength-variants.ts`:

1. Add `progressionIncrement` field to all seed `StrengthVariantExercise` objects (null for exercises that don't configure it, e.g. `2.5` for Bench Press seed).
2. Add a seed `StrengthSessionExercise` with `progression: 'up'` for the Bench Press exercise to enable full prefill-computation test coverage without a DB.
3. Update `mockUpsertVariantExercises` to persist `progressionIncrement` in the in-memory store.
