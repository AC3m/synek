# Strength Session Pre-fill Pattern

This document describes the pre-fill pattern introduced in `015-strength-session-ux` for auto-populating strength session load inputs from the previous session.

---

## Overview

When an athlete opens a strength session, the logger pre-fills the load and reps inputs with values computed from the previous completed session. The computation applies a configurable load increment based on the athlete's stated progression intent.

---

## `computePrefillSets`

**File**: `app/lib/utils/strength.ts`

```typescript
export function computePrefillSets(
  prefill: StrengthSessionExercise,  // last completed session exercise
  exercise: StrengthVariantExercise,  // variant exercise (has progressionIncrement)
): SetState[]
```

### How it works

1. Reads `exercise.progressionIncrement` (nullable; configured per-exercise in variant config)
2. Derives `loadDelta` from `prefill.progression`:
   - `'up'` → `+progressionIncrement` (or 0 if null)
   - `'down'` → `-progressionIncrement` (or 0 if null)
   - `'maintain'` / `null` → `0`
3. For each set slot (up to `exercise.sets`):
   - Falls back to `prefill.setsData[i]` if available, else `prefill.loadKg` / `prefill.actualReps`
   - Applies `loadDelta`, floors the result at 0 (no negative loads)
4. Returns `SetState[]` with `isPreFilled: true` on every entry

### Where it's called

Inside `initSets()` in `SessionExerciseLogger.tsx`:

```typescript
if (!logged && prefill) {
  return computePrefillSets(prefill, exercise);
}
```

---

## "User-owned" guard (`logged === undefined`)

Pre-fill is **only applied when the exercise has no saved data** (`logged === undefined`).

This is the critical safety constraint:

```typescript
// ✅ Pre-fill applied: no saved data for this exercise
logged === undefined && prefill != null

// ❌ Pre-fill NOT applied: user already has saved data
logged !== undefined  // even if setsData is empty
```

If the athlete has already committed any data for the exercise (even an empty progression toggle), the saved data always wins — pre-fill is never re-applied.

---

## `isPreFilled` state lifecycle

Each set row in `ExerciseCard` tracks `isPreFilled: boolean` as part of `SetState`:

| Event | Effect |
|-------|--------|
| Session opens, no logged data | All rows: `isPreFilled: true` (via `computePrefillSets`) |
| User edits a row | That row: `isPreFilled: false` (cleared in `updateSet`) |
| Session re-opened after commit | `hydratedRef` guard prevents re-applying pre-fill; saved values restored from `loggedExercises` |
| Copy-from-above used | Target row: `isPreFilled: false` |

The `isPreFilled` flag is **never written to the DB** — it is purely a local UI concern governing the muted tint (`bg-muted/40`) on pre-filled inputs.

---

## `progressionIncrement` flow

```
Coach edits variant exercise
  → IncrementField in VariantForm.tsx
  → UpsertVariantExercisesInput.exercises[n].progressionIncrement
  → upsertVariantExercises() in strength-variants.ts
  → progression_increment column in strength_variant_exercises table
  → toStrengthVariantExercise() row mapper
  → StrengthVariantExercise.progressionIncrement: number | null
  → ExerciseCard receives exercise.progressionIncrement
  → computePrefillSets() uses it to derive loadDelta
  → pre-filled load inputs in SessionExerciseLogger
```

**Null semantics**: `progressionIncrement: null` means "not configured". A null increment with `progression = 'up'` results in `loadDelta = 0` — the previous load is copied unchanged.

---

## DB migration

File: `supabase/migrations/20260403000000_add_progression_increment.sql`

```sql
ALTER TABLE strength_variant_exercises
  ADD COLUMN progression_increment NUMERIC(6,2) NULL
    CONSTRAINT progression_increment_positive
    CHECK (progression_increment IS NULL OR progression_increment > 0);
```

Zero is not a valid value (use `null` for "not configured"). The `CHECK` constraint enforces this at the DB level.
