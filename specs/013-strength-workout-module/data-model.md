# Data Model: Strength Workout Module

## New Entities

### `strength_variants`

Reusable workout templates owned by a user (coach or athlete with `can_self_plan`).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK DEFAULT gen_random_uuid() | |
| `user_id` | `uuid` | NOT NULL FK → `profiles(id)` ON DELETE CASCADE | Owner (coach or self-plan athlete) |
| `name` | `text` | NOT NULL | e.g. "Push Day A" |
| `description` | `text` | | Optional notes |
| `created_at` | `timestamptz` | NOT NULL DEFAULT now() | |
| `updated_at` | `timestamptz` | NOT NULL DEFAULT now() | Auto-updated via trigger |

**RLS**: `user_id = auth.uid()` — each user sees only their own variants.

---

### `strength_variant_exercises`

Ordered exercise definitions within a variant.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK DEFAULT gen_random_uuid() | |
| `variant_id` | `uuid` | NOT NULL FK → `strength_variants(id)` ON DELETE CASCADE | |
| `name` | `text` | NOT NULL | Exercise name |
| `video_url` | `text` | | Optional link to demo video |
| `sets` | `integer` | NOT NULL DEFAULT 3 CHECK (sets > 0) | Number of sets |
| `reps_min` | `integer` | NOT NULL CHECK (reps_min > 0) | Target reps — lower bound |
| `reps_max` | `integer` | NOT NULL CHECK (reps_max >= reps_min) | Target reps — upper bound |
| `sort_order` | `integer` | NOT NULL DEFAULT 0 | Display order within variant |
| `created_at` | `timestamptz` | NOT NULL DEFAULT now() | |

**RLS**: Inherited from parent variant via join — only the variant owner can read/write exercises.

---

### `strength_session_exercises`

Per-session exercise performance log. One row per exercise per session completion.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK DEFAULT gen_random_uuid() | |
| `session_id` | `uuid` | NOT NULL FK → `training_sessions(id)` ON DELETE CASCADE | |
| `variant_exercise_id` | `uuid` | FK → `strength_variant_exercises(id)` ON DELETE SET NULL | Nullable — preserves history if exercise is deleted |
| `actual_reps` | `integer` | | Reps completed in this session |
| `load_kg` | `numeric(6,2)` | CHECK (load_kg >= 0) | Load used (kg) |
| `progression` | `text` | CHECK IN ('up', 'maintain', 'down') | Intent for next session |
| `notes` | `text` | | Per-exercise session notes |
| `sort_order` | `integer` | NOT NULL DEFAULT 0 | Display order within session |
| `created_at` | `timestamptz` | NOT NULL DEFAULT now() | |

**RLS**: Athlete can read/write their own session's exercises. Coach can read exercises for sessions belonging to their athletes.

---

## Modified Entities

### `training_sessions.type_specific_data` (JSONB — additive, no migration)

The existing `StrengthData` JSONB gains an optional `variantId` field:

```typescript
// Before
interface StrengthData {
  type: 'strength';
  exercises?: Exercise[];
  muscle_groups?: string[];
  equipment?: string[];
}

// After
interface StrengthData {
  type: 'strength';
  variantId?: string;           // NEW: references strength_variants.id
  exercises?: Exercise[];       // retained for free-form (no variant) sessions
  muscle_groups?: string[];
  equipment?: string[];
}
```

No SQL migration needed — JSONB is additive.

---

## New TypeScript Types (`app/types/training.ts`)

```typescript
// ── Strength Variant ────────────────────────────────────────────────────────

export interface StrengthVariantExercise {
  id: string;
  variantId: string;
  name: string;
  videoUrl: string | null;
  sets: number;
  repsMin: number;
  repsMax: number;
  sortOrder: number;
  createdAt: string;
}

export interface StrengthVariant {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  exercises: StrengthVariantExercise[];
  createdAt: string;
  updatedAt: string;
}

// ── Session Exercise Log ─────────────────────────────────────────────────────

export type ProgressionIntent = 'up' | 'maintain' | 'down';

export interface StrengthSessionExercise {
  id: string;
  sessionId: string;
  variantExerciseId: string | null;
  actualReps: number | null;
  loadKg: number | null;
  progression: ProgressionIntent | null;
  notes: string | null;
  sortOrder: number;
  createdAt: string;
}

// ── Input Types ──────────────────────────────────────────────────────────────

export interface CreateStrengthVariantInput {
  name: string;
  description?: string;
  exercises: Array<{
    name: string;
    videoUrl?: string;
    sets: number;
    repsMin: number;
    repsMax: number;
    sortOrder: number;
  }>;
}

export interface UpdateStrengthVariantInput {
  id: string;
  name?: string;
  description?: string | null;
}

export interface UpsertVariantExercisesInput {
  variantId: string;
  exercises: Array<{
    id?: string;        // present = update, absent = insert
    name: string;
    videoUrl?: string | null;
    sets: number;
    repsMin: number;
    repsMax: number;
    sortOrder: number;
  }>;
}

export interface UpsertSessionExercisesInput {
  sessionId: string;
  exercises: Array<{
    variantExerciseId: string;
    actualReps?: number | null;
    loadKg?: number | null;
    progression?: ProgressionIntent | null;
    notes?: string | null;
    sortOrder: number;
  }>;
}
```

---

## Entity Relationships

```
profiles
  ↑ user_id
strength_variants
  ↑ variant_id (CASCADE)
strength_variant_exercises
  ↑ variant_exercise_id (SET NULL — preserves history)
strength_session_exercises
  ↑ session_id (CASCADE)
training_sessions
  ↑ week_plan_id
week_plans
  ↑ athlete_id
profiles
```

---

## Pre-fill Query Logic

When loading variant exercises for a new session, the pre-fill query fetches the most recent completed session exercise data per exercise:

```sql
SELECT DISTINCT ON (sse.variant_exercise_id)
  sse.variant_exercise_id,
  sse.actual_reps,
  sse.load_kg,
  sse.progression,
  ts.completed_at
FROM strength_session_exercises sse
JOIN training_sessions ts ON ts.id = sse.session_id
JOIN week_plans wp ON wp.id = ts.week_plan_id
WHERE wp.athlete_id = :athlete_id
  AND sse.variant_exercise_id = ANY(:exercise_ids)
  AND ts.is_completed = true
ORDER BY sse.variant_exercise_id, ts.completed_at DESC NULLS LAST;
```

Result: one row per exercise with the latest actual values. Exposed as a Supabase RPC `get_last_session_exercises(athlete_id, exercise_ids)`.

---

## State Transitions

```
Strength Session (is_completed = false)
  → User logs actual data per exercise (strength_session_exercises rows upserted)
  → User marks session complete (is_completed = true)
  → Pre-fill query now returns this session's data for next session with same variant

Strength Variant Exercise
  Created → Edited (name/video/sets/reps) → Deleted
  On delete: strength_session_exercises.variant_exercise_id SET NULL (history preserved)
```

---

## Validation Rules

| Field | Rule |
|-------|------|
| `strength_variants.name` | Required, min 1 char, max 100 chars |
| `strength_variant_exercises.sets` | Integer > 0, max 20 |
| `strength_variant_exercises.reps_min` | Integer > 0, max 100 |
| `strength_variant_exercises.reps_max` | Integer ≥ reps_min, max 100 |
| `strength_session_exercises.actual_reps` | Integer ≥ 0 |
| `strength_session_exercises.load_kg` | Decimal ≥ 0, max 9999.99 |
| `strength_session_exercises.progression` | Enum: 'up' | 'maintain' | 'down' |

All validated with Zod 4 schemas before mutations.
