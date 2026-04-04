# Implementation Plan: Strength Session UX Redesign

**Branch**: `015-strength-session-ux` | **Date**: 2026-04-03 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/015-strength-session-ux/spec.md`

## Summary

Enhance the strength workout session logger and variant configuration to:
1. Show per-set previous-session values inline (persistent muted "prev" row below each set row)
2. Add a per-exercise load increment to variant config (collapsible "Advanced" field)
3. Pre-fill next session's load inputs with computed values (prev ± increment based on progression intent), applied only to exercises with no existing saved data
4. Add a one-tap "copy from set above" button on set rows 2+

The approach requires one DB migration, one new pure utility function, four new small components, targeted changes to `SessionExerciseLogger`'s `ExerciseCard`, and extension of `VariantExerciseList` with an increment field. No new dependencies.

---

## Technical Context

**Language/Version**: TypeScript 5 (strict)
**Primary Dependencies**: React 19, TanStack Query 5, shadcn/ui (New York), lucide-react, i18next
**Storage**: Supabase PostgreSQL — one new nullable column on `strength_variant_exercises`
**Testing**: Vitest 4 + @testing-library/react 16 + userEvent 14; jsdom environment
**Target Platform**: Mobile-first (iOS/Android WebView) + desktop browser SPA
**Performance Goals**: Pre-fill computation is synchronous/in-memory — renders within 1 frame (~16 ms). No new network queries.
**Constraints**: All touch targets ≥ 44×44 px; no `select('*')`; `pnpm typecheck` exit 0; EN+PL i18n simultaneous
**Scale/Scope**: 4 new components, 1 extended component, 1 new utility function, 1 new migration, ~3 new test files (unit + integration)

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Lean & Purposeful | ✅ PASS | Every change maps to a spec US. No speculative abstractions. `computePrefillSets` has exactly one call site (used in `initSets`) but is extracted purely for testability — a justified exception per research §2. |
| II. Configuration Over Hardcoding | ✅ PASS | `progressionIncrement` is data-driven per exercise. All new strings use i18n keys in both `en/` and `pl/` simultaneously. No inline color literals. |
| III. Type Safety & Boundary Validation | ✅ PASS | `progressionIncrement: number \| null` is fully typed. Row mapper updated. No `any`. New `SetState.isPreFilled` is typed. `pnpm typecheck` gate enforced. |
| IV. Modularity & Testability | ✅ PASS | Pure `computePrefillSets` is unit-testable. New components (`PrevSetRow`, `CopySetButton`, `PrefillBadge`, `IncrementField`) are display-only and independently testable. `ExerciseCard` state stays local. |
| V. Performance & Operational Discipline | ✅ PASS | Zero new dependencies (0 KB bundle impact). Pre-fill is synchronous arithmetic. All new interactive elements ≥ 44 px. Optimistic mutation cycle unchanged. |

**Merge Gates**:
1. ✅ `pnpm typecheck` — enforced as last task
2. ✅ Mock parity — `mockUpsertVariantExercises` updated for `progressionIncrement`
3. ✅ i18n complete — EN + PL keys added simultaneously
4. ✅ Optimistic updates — existing mutation cycle unchanged; no new mutations
5. ✅ No hardcoded colors — all styling via Tailwind tokens and `cn()`
6. ✅ No direct DB in components — all data through existing hook chain
7. ✅ Constitution check — this section
8. ✅ Docs updated — `docs/how-to/add-strength-session-ux.md` (prefill pattern) created at end

---

## Project Structure

### Documentation (this feature)

```text
specs/015-strength-session-ux/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── checklists/
│   └── requirements.md
└── tasks.md             ← /speckit.tasks output (not yet created)
```

### Source Code

```text
supabase/migrations/
└── TIMESTAMP_add_progression_increment.sql   ← new

app/
├── types/
│   └── training.ts                           ← progressionIncrement field added
├── lib/
│   ├── utils/
│   │   └── strength.ts                       ← computePrefillSets added
│   ├── queries/
│   │   └── strength-variants.ts              ← row mapper + upsert updated
│   └── mock-data/
│       └── strength-variants.ts              ← seed data + mock upsert updated
├── components/strength/
│   ├── PrevSetRow.tsx                         ← new
│   ├── CopySetButton.tsx                      ← new
│   ├── PrefillBadge.tsx                       ← new
│   ├── IncrementField.tsx                     ← new
│   ├── SessionExerciseLogger.tsx              ← ExerciseCard refactored
│   └── VariantExerciseList.tsx                ← increment field wired in
└── i18n/resources/
    ├── en/training.json                       ← new keys
    └── pl/training.json                       ← new keys (simultaneously)

app/test/
├── unit/
│   └── computePrefillSets.test.ts             ← new
└── integration/
    ├── SessionExerciseLogger.test.tsx         ← extended
    └── IncrementField.test.tsx                ← new
```

**Structure Decision**: Single-project SPA layout. All changes are within `app/` and `supabase/migrations/`. No new routes or pages.

---

## Implementation Phases

---

### Phase 1 — DB Migration & Type Layer

**Goal**: The schema change and type changes are the foundation. Everything downstream depends on `progressionIncrement` being available.

#### Task 1.1 — DB Migration

**File**: `supabase/migrations/TIMESTAMP_add_progression_increment.sql`

```sql
ALTER TABLE strength_variant_exercises
  ADD COLUMN progression_increment NUMERIC(6,2) NULL
    CONSTRAINT progression_increment_positive
    CHECK (progression_increment IS NULL OR progression_increment > 0);

COMMENT ON COLUMN strength_variant_exercises.progression_increment
  IS 'Load increment applied per session when progression intent is up (subtracted for down). NULL = not configured.';
```

Apply via `supabase db push` (local) or the Supabase MCP `apply_migration` tool.

#### Task 1.2 — Update `StrengthVariantExercise` type

**File**: `app/types/training.ts`

Add to `StrengthVariantExercise` interface:
```typescript
progressionIncrement: number | null;
```

Add to both `CreateStrengthVariantInput.exercises[n]` and `UpsertVariantExercisesInput.exercises[n]`:
```typescript
progressionIncrement?: number | null;
```

#### Task 1.3 — Update row mapper in queries

**File**: `app/lib/queries/strength-variants.ts`

In `toVariantExercise(row)` add:
```typescript
progressionIncrement: row.progression_increment ?? null,
```

In the `upsertVariantExercises` Supabase call, add `progression_increment` to the insert/update payload:
```typescript
progression_increment: ex.progressionIncrement ?? null,
```

#### Task 1.4 — Update mock data

**File**: `app/lib/mock-data/strength-variants.ts`

1. Add `progressionIncrement` to all seed `StrengthVariantExercise` objects. Bench Press = `2.5`, others = `null`.
2. Update `mockUpsertVariantExercises` to persist `progressionIncrement` when updating an exercise.
3. Ensure one seed `StrengthSessionExercise` has `progression: 'up'` on the Bench Press exercise to enable full prefill testing in mock mode.

**Verification**: `pnpm typecheck` exits 0.

---

### Phase 2 — Pure Utility: `computePrefillSets`

**Goal**: The core pre-fill computation logic, fully unit-tested before any component touches it.

#### Task 2.1 — Implement `computePrefillSets`

**File**: `app/lib/utils/strength.ts`

Extend `SetState` definition (exported for use in tests):
```typescript
export interface SetState {
  reps: string;
  load: string;
  isPreFilled: boolean;
}
```

Add function:
```typescript
export function computePrefillSets(
  prefill: StrengthSessionExercise,
  exercise: StrengthVariantExercise,
): SetState[] {
  const increment = exercise.progressionIncrement ?? 0;
  const loadDelta =
    prefill.progression === 'up' ? increment
    : prefill.progression === 'down' ? -increment
    : 0;

  return Array.from({ length: exercise.sets }, (_, i) => {
    const prevLoad = prefill.setsData?.[i]?.loadKg ?? prefill.loadKg;
    const prevReps = prefill.setsData?.[i]?.reps ?? prefill.actualReps;
    const newLoad = prevLoad != null ? Math.max(0, prevLoad + loadDelta) : null;

    return {
      reps: prevReps?.toString() ?? '',
      load: newLoad?.toString() ?? '',
      isPreFilled: true,
    };
  });
}
```

Update the existing `initSets` helper (inside `SessionExerciseLogger.tsx`) to use `SetState` with `isPreFilled: false` for all entries when initialising from logged data.

#### Task 2.2 — Unit test `computePrefillSets`

**File**: `app/test/unit/computePrefillSets.test.ts`

Test cases (aim for 100% branch coverage):

```typescript
describe('computePrefillSets', () => {
  // Progression: up with increment
  it('applies positive load delta when intent is up', ...)
  it('applies delta per-set when setsData is present', ...)
  it('falls back to topSet load when setsData is empty', ...)
  it('falls back to topSet reps when setsData is empty', ...)

  // Progression: down with increment
  it('applies negative load delta when intent is down', ...)
  it('floors load at 0 when delta would go negative', ...)

  // Progression: maintain
  it('preserves load unchanged when intent is maintain', ...)

  // Progression: null (no intent set)
  it('preserves load unchanged when intent is null', ...)

  // No increment configured
  it('preserves load when progressionIncrement is null (up intent)', ...)
  it('preserves load when progressionIncrement is null (down intent)', ...)

  // All sets marked isPreFilled
  it('marks all returned SetState entries as isPreFilled: true', ...)

  // Missing data
  it('returns empty string for reps when actualReps is null', ...)
  it('returns empty string for load when loadKg is null', ...)
})
```

---

### Phase 3 — New Display Components

**Goal**: Four small, focused, independently testable display components. No state. Tested via the `SessionExerciseLogger` integration test or their own unit-style integration tests.

#### Task 3.1 — `PrevSetRow`

**File**: `app/components/strength/PrevSetRow.tsx`

```typescript
interface PrevSetRowProps {
  reps: number | null;
  load: number | null;
  loadUnit: LoadUnit;
  colSpan?: number;  // grid column span for the text cell; default 2
  isTopSetOnly?: boolean;  // shows "(top set)" qualifier
}

export function PrevSetRow({ reps, load, loadUnit, colSpan = 2, isTopSetOnly }: PrevSetRowProps) {
  // Renders a full-width muted row: "prev: X reps · Y kg" or "prev: —"
  // Uses grid-column span to align under reps+load columns
}
```

**Styling**: `text-xs text-muted-foreground`, no border, `pb-1` bottom padding to create visual grouping with the next set row above.

#### Task 3.2 — `CopySetButton`

**File**: `app/components/strength/CopySetButton.tsx`

```typescript
interface CopySetButtonProps {
  onCopy: () => void;
  disabled: boolean;
  exerciseName: string;  // for aria-label
  setIndex: number;      // for aria-label
}

export function CopySetButton({ onCopy, disabled, exerciseName, setIndex }: CopySetButtonProps) {
  // Icon button: Copy icon from lucide-react
  // min-w-[44px] min-h-[44px] p-2 to meet touch target
  // disabled state: opacity-40 cursor-not-allowed
  // aria-label: t('strength.logger.copyFromAbove') + ` (${exerciseName} set ${setIndex + 1})`
}
```

#### Task 3.3 — `PrefillBadge`

**File**: `app/components/strength/PrefillBadge.tsx`

```typescript
interface PrefillBadgeProps {
  direction: ProgressionIntent | null;
  incrementApplied: number | null;
  fromDate: string | null;  // ISO date string
  loadUnit: LoadUnit;
}

export function PrefillBadge({ direction, incrementApplied, fromDate, loadUnit }: PrefillBadgeProps) {
  // Renders a single line below the exercise name:
  //   ▲ +2.5 kg · From Mar 24   (direction='up', incrementApplied=2.5)
  //   ▼ −2.5 kg · From Mar 24   (direction='down')
  //   = From Mar 24             (direction='maintain' or null increment)
  //   "Floor reached — adjust increment" warning (when load would go < 0)
  // Uses text-xs, muted-foreground base, green for up, amber for down
}
```

**Note**: `PrefillBadge` is only rendered when `fromDate` is non-null (prior session exists and pre-fill was applied).

#### Task 3.4 — `IncrementField`

**File**: `app/components/strength/IncrementField.tsx`

```typescript
interface IncrementFieldProps {
  value: number | null;
  loadUnit: LoadUnit;
  onChange: (value: number | null) => void;
  disabled?: boolean;
}

export function IncrementField({ value, loadUnit, onChange, disabled }: IncrementFieldProps) {
  // Collapsible "Advanced" section using shadcn Collapsible primitive
  // Contains: numeric Input with unit suffix (kg or s)
  // Label: t('strength.exercise.incrementLabel') or t('strength.exercise.durationIncrement')
  // On change: parse float, if NaN or ≤ 0 → call onChange(null); else onChange(parsed)
  // Shows "+2.5 kg" chip above the collapsible trigger when value is non-null
}
```

---

### Phase 4 — Refactor `ExerciseCard` in `SessionExerciseLogger`

**Goal**: Integrate the new display components and pre-fill logic. Keep `ExerciseCard` as the single stateful unit; delegate all rendering to the new sub-components.

#### Task 4.1 — Extend `SetState` and `initSets`

**File**: `app/components/strength/SessionExerciseLogger.tsx`

Replace `interface SetState` with the exported one from `strength.ts`.

Update `initSets`:
```typescript
function initSets(
  count: number,
  logged: StrengthSessionExercise | undefined,
  prefill: StrengthSessionExercise | undefined,
  exercise: StrengthVariantExercise,
): SetState[] {
  // If logged data exists → hydrate from it (isPreFilled = false for all)
  if (logged?.setsData && logged.setsData.length > 0) {
    return Array.from({ length: count }, (_, i) => ({
      reps: logged.setsData[i]?.reps?.toString() ?? '',
      load: logged.setsData[i]?.loadKg?.toString() ?? '',
      isPreFilled: false,
    }));
  }
  // If no logged data but prefill exists → apply computePrefillSets
  if (!logged && prefill) {
    return computePrefillSets(prefill, exercise);
  }
  // No data at all → empty
  return Array.from({ length: count }, () => ({ reps: '', load: '', isPreFilled: false }));
}
```

**Critical guard**: Pre-fill is only applied when `logged === undefined`. If `logged` exists (even with empty setsData), the user's data wins.

#### Task 4.2 — Add `isPreFilled` clear-on-edit

In `updateSet`:
```typescript
function updateSet(index: number, field: 'reps' | 'load', value: string) {
  setSets((prev) => {
    const next = [...prev];
    next[index] = { ...next[index], [field]: value, isPreFilled: false };
    return next;
  });
}
```

#### Task 4.3 — Render `PrevSetRow` below each set row

In the set rows loop, after each active row:
```tsx
<SetRow key={`active-${i}`} ... />
{hasPrefillData && (
  <PrevSetRow
    key={`prev-${i}`}
    reps={prefillSetAt(i)?.reps ?? null}
    load={prefillSetAt(i)?.loadKg ?? null}
    loadUnit={exercise.loadUnit}
    isTopSetOnly={isTopSetOnly}
  />
)}
```

Where `hasPrefillData = prefill != null` — the "prev" column is present whenever a prior session exists, regardless of whether pre-fill was applied to inputs.

#### Task 4.4 — Render `CopySetButton` on set rows 2+

In the active set row, after the load input:
```tsx
{i > 0 && !readOnly && (
  <CopySetButton
    onCopy={() => handleCopyFromAbove(i)}
    disabled={sets[i - 1].reps === '' && sets[i - 1].load === ''}
    exerciseName={exercise.name}
    setIndex={i}
  />
)}
```

`handleCopyFromAbove(i)`:
```typescript
function handleCopyFromAbove(i: number) {
  const above = sets[i - 1];
  setSets((prev) => {
    const next = [...prev];
    next[i] = { reps: above.reps, load: above.load, isPreFilled: false };
    return next;
  });
  commit(); // fire save immediately
}
```

#### Task 4.5 — Render `PrefillBadge` in exercise header

In `ExerciseCard` header, below the target reps line, render `PrefillBadge` when `prefill` is non-null:
```tsx
{prefill && (
  <PrefillBadge
    direction={prefill.progression}
    incrementApplied={computedLoadDelta}
    fromDate={prefillDate}
    loadUnit={exercise.loadUnit}
  />
)}
```

`computedLoadDelta` is derived from `exercise.progressionIncrement` and `prefill.progression` (same formula as in `computePrefillSets`). Pass `prefillDate` as a new prop to `ExerciseCard` (sourced from the `prefillData` query result's `date` field, already available in `SessionExerciseLogger`).

#### Task 4.6 — Update `ExerciseCardProps` and `SessionExerciseLoggerProps`

Add `prefillDate?: string | null` to both prop interfaces so the date can be passed down for `PrefillBadge`.

---

### Phase 5 — Variant Config: Increment Field

**Goal**: Wire `IncrementField` into the exercise editing UI in `VariantExerciseList`.

#### Task 5.1 — Add increment to exercise edit form in `VariantExerciseList`

**File**: `app/components/strength/VariantExerciseList.tsx`

In the exercise edit row, add `<IncrementField>` after the existing load unit selector:
```tsx
<IncrementField
  value={ex.progressionIncrement ?? null}
  loadUnit={ex.loadUnit}
  onChange={(val) => updateExerciseField(ex.id, 'progressionIncrement', val)}
  disabled={!canEdit}
/>
```

Add `progressionIncrement` to the local exercise state managed by `VariantExerciseList` (it already tracks `loadUnit`, `sets`, `repsMin`, `repsMax` etc. — add this field alongside).

#### Task 5.2 — Show increment chip on exercise list rows (view mode)

When `progressionIncrement` is non-null and the row is in read/display mode, render a small chip after the exercise name:
```tsx
{ex.progressionIncrement != null && (
  <Badge variant="secondary" className="text-[10px]">
    {t('strength.exercise.incrementChip', {
      value: ex.progressionIncrement,
      unit: ex.loadUnit === 'sec' ? 's' : 'kg',
    })}
  </Badge>
)}
```

---

### Phase 6 — i18n

**Goal**: Both EN and PL keys added simultaneously, before any UI is considered done.

#### Task 6.1 — Add EN keys

**File**: `app/i18n/resources/en/training.json`

Add under the `strength` namespace (see full key list in `quickstart.md`).

#### Task 6.2 — Add PL keys (simultaneously with EN)

**File**: `app/i18n/resources/pl/training.json`

Polish translations for every new key. Keys that are symbols/formats (`▲`, `▼`, `=`) can share the same value but interpolation parameters must be present.

---

### Phase 7 — Integration Tests

**Goal**: High, reasonable test coverage for all new interactive behaviours.

#### Task 7.1 — Extend `SessionExerciseLogger.test.tsx`

**File**: `app/test/integration/SessionExerciseLogger.test.tsx`

Add the following test blocks alongside the existing hydration tests:

**Prev row scenarios**:
```typescript
describe('previous session reference rows', () => {
  it('renders a prev row below each set row when prefill data exists', ...)
  it('shows "—" in prev row when prior session had fewer sets', ...)
  it('does not render prev rows when no prefill data provided', ...)
  it('shows "(top set)" qualifier when prior setsData is empty', ...)
  it('shows "From [date]" provenance in exercise header', ...)
})
```

**Pre-fill as actual values**:
```typescript
describe('pre-fill applied to inputs', () => {
  it('applies computed values to load inputs when no logged data exists', ...)
  it('does not apply pre-fill when logged data already exists for the exercise', ...)
  it('clears isPreFilled tint when user edits a set row', ...)
  it('does not overwrite other rows when one row is edited', ...)
  it('renders PrefillBadge with correct direction and date', ...)
})
```

**Copy from above**:
```typescript
describe('copy from set above', () => {
  it('copy button absent on first set row', ...)
  it('copy button present on set rows 2+', ...)
  it('copies reps and load from set N-1 to set N on tap', ...)
  it('copy button is disabled when set N-1 has no values', ...)
  it('does not show copy buttons in read-only mode', ...)
  it('fires commit automatically after copy', ...)
})
```

**Mock setup**: Use `vi.mock('~/lib/queries/strength-variants', async () => { ... })` with `mockFetchLastSessionExercises` returning a seeded prior session that has `progression: 'up'` on Bench Press with `progressionIncrement: 2.5`.

#### Task 7.2 — New `IncrementField.test.tsx`

**File**: `app/test/integration/IncrementField.test.tsx`

```typescript
describe('IncrementField', () => {
  it('is collapsed by default', ...)
  it('expands on trigger click', ...)
  it('calls onChange with numeric value on valid input', ...)
  it('calls onChange(null) when input is cleared', ...)
  it('calls onChange(null) when input is 0 or negative', ...)
  it('shows unit suffix "kg" for kg loadUnit', ...)
  it('shows unit suffix "s" for sec loadUnit', ...)
  it('shows increment chip above trigger when value is non-null', ...)
  it('does not show chip when value is null', ...)
  it('disables input when disabled prop is true', ...)
})
```

---

### Phase 8 — Quality Gates & Docs

#### Task 8.1 — `pnpm typecheck`

Run `pnpm typecheck`. Must exit 0. Fix any type errors before marking the feature complete.

#### Task 8.2 — `pnpm test:run`

All existing tests must still pass. New tests must pass. Target: 0 failing tests.

#### Task 8.3 — Docs update

Create `docs/how-to/strength-prefill-pattern.md` documenting:
- How `computePrefillSets` works and where it's called
- The "user-owned" guard (`logged === undefined`) that prevents overwriting saved data
- How `progressionIncrement` flows from variant config to session prefill

This is a new reusable pattern introduced by this feature, satisfying Merge Gate 8.

---

## Performance Review (applied to plan, per user request)

React-specific optimisations evaluated and applied in the plan:

| Concern | Decision |
|---------|----------|
| `ExerciseCard` re-renders | Already wrapped in `React.memo`. `onChange` prop passed from `SessionExerciseLogger` is already wrapped in `useCallback`. No change needed. |
| `PrevSetRow`, `CopySetButton`, `PrefillBadge` | These are tiny stateless components. `memo()` would add overhead with no benefit — **do not** wrap them in `memo`. |
| `IncrementField` | Stateless controlled input. No `memo` needed. |
| `computePrefillSets` in `initSets` | Called once on mount (inside `useState` initialiser `() => initSets(...)`). Not called on every render. No `useMemo` needed. |
| `handleCopyFromAbove` | Defined inline in `ExerciseCard` (already scoped per card). Fine — it's a stable reference within the component's closure. |
| `sets` state updates | All setState calls create new arrays (immutable updates). Correct. |
| `commit` debouncing | Existing `saveTimerRef` pattern handles the visual save indicator. The copy action calls `commit()` directly (no debounce needed — it's a deliberate user action, not a keystroke stream). |
| `logMap` in `SessionExerciseLogger` | Already `useMemo`'d over `loggedExercises`. No change. |
| `totalVolume` | Already `useMemo`'d. No change. |
| `prefillDate` prop | Passed from `SessionExerciseLogger` down to `ExerciseCard` — sourced from the query result's `date` field which is already computed once in `SessionDetailModal`. No new computation. |

**Net performance impact**: None — the added computations are O(sets) arithmetic operations running once at mount time.

---

## Complexity Tracking

No constitution violations to justify.
