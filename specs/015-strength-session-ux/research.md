# Research: Strength Session UX Redesign

**Feature**: `015-strength-session-ux`
**Date**: 2026-04-03

---

## 1. Existing prefill data flow

**Decision**: Re-use the existing `useLastSessionExercises` hook and `prefillData` prop chain — no new query infrastructure needed.

**Rationale**: The hook already fetches the most recent completed session's per-set data via the `get_last_session_exercises` Supabase RPC. The `prefillData: Record<variantExerciseId, StrengthSessionExercise>` prop already reaches `ExerciseCard`. The only change is _how_ that data is rendered: actual values in inputs + prev rows, instead of placeholder text only.

**Flow** (unchanged):
```
SessionDetailModal / SessionForm
  → useLastSessionExercises(athleteId, exerciseIds)
  → fetchLastSessionExercises → get_last_session_exercises RPC
  → prefillData: Record<string, StrengthSessionExercise>
  → SessionExerciseLogger → ExerciseCard (prefill prop)
```

**Alternatives considered**: A separate `useNextSessionSuggestion` hook that pre-computes incremented values server-side. Rejected — the computation is trivial (`previousLoad ± increment`), purely arithmetic, requires no extra DB query, and belongs in a pure client-side utility function.

---

## 2. Pre-fill computation: where it lives

**Decision**: New pure utility function `computePrefillSets(prefill, exercise)` in `app/lib/utils/strength.ts`.

**Rationale**: Pure functions are the easiest to unit-test with full branch coverage. The function takes `StrengthSessionExercise` (last session) + `StrengthVariantExercise` (has `progressionIncrement`) and returns an array of `{ reps: string, load: string }` — the same `SetState` type used in `ExerciseCard`. This keeps all math testable without any React render setup.

**Logic**:
```
loadDelta = progression === 'up'   ? increment
          : progression === 'down' ? -increment
          : 0

perSetLoad(i) = max(0, (setsData[i]?.loadKg ?? topSetLoadKg) + loadDelta)
perSetReps(i) = setsData[i]?.reps ?? actualReps
```

Floor at 0 covers the "floor reached" edge case. If `progressionIncrement` is null, `loadDelta = 0` (maintain behaviour, not an error).

**Alternatives considered**: Computing inside `initSets()` inline. Rejected — would make `initSets` harder to test and harder to reason about (two responsibilities: init from logged data vs init from prefill).

---

## 3. "User-owned" state: tracking pre-fill vs user-entered per set row

**Decision**: Extend local `SetState` to include `isPreFilled: boolean` per row. Apply pre-fill only once on mount, only when the exercise has no saved `loggedExercises` entry. Clear `isPreFilled` for a row on user edit.

**Rationale**: This is a local UI concern — it governs the visual tint and must never be written to the DB. Keeping it in component state (`useState<SetState[]>`) is the lowest sensible scope. The guard `logMap[ex.id] === undefined` (no saved data for this exercise) is evaluated in `initSets` at mount time — if a saved entry exists, pre-fill is never applied.

**Alternatives considered**: A global context flag per exercise. Rejected — YAGNI, over-engineered for a per-row UI concern. Storing it in the DB. Rejected — it's purely presentational.

---

## 4. `progressionIncrement` storage location

**Decision**: New nullable numeric column `progression_increment NUMERIC(6,2)` on `strength_variant_exercises`. Null = not configured. Zero is not a valid value (stored as null).

**Rationale**: The increment belongs on the exercise template, not on each session log. It's a coach/variant-owner configuration, not athlete runtime data. It must survive across sessions.

**Constraint added**: `CHECK (progression_increment IS NULL OR progression_increment > 0)` — prevents storing zero (zero increment is indistinguishable from "not configured" semantically, and storing null is cleaner).

**Alternatives considered**: Storing on the variant level (one increment for all exercises). Rejected — Bench Press progresses at a different rate than Bicep Curl; per-exercise granularity is required by US2. Storing in JSON on the variant's description field. Rejected — violates type safety and would require Zod parsing on every read.

---

## 5. Component decomposition strategy

**Decision**: Split `ExerciseCard` into focused sub-components. New components: `PrevSetRow`, `CopySetButton`, `PrefillBadge`. Keep `ExerciseCard` as the stateful container.

**Rationale**: The current `ExerciseCard` has 284 lines and mixes state management, layout rendering, prev-data display, copy interaction, and progression toggle. The new features (prev rows, copy buttons, prefill badges) would push it beyond 400 lines. Extracting display-only sub-components keeps each file under ~100 lines, makes them independently testable, and follows the single-responsibility principle.

| Component | Responsibility | Testable in isolation? |
|-----------|---------------|----------------------|
| `PrevSetRow` | Render one muted previous-session row | Yes — pure display |
| `CopySetButton` | Render copy icon with enabled/disabled state | Yes — pure display + callback |
| `PrefillBadge` | Render ▲/▼/= badge + provenance date | Yes — pure display |
| `ExerciseCard` | Own set state, pre-fill logic, progression state, commit | Yes — with mock onChange |

**Alternatives considered**: Keeping everything in `ExerciseCard`. Rejected — violates user's explicit requirement for small, single-responsibility components.

---

## 6. `IncrementField` for variant config

**Decision**: New `IncrementField` component — a collapsible "Advanced" section containing the numeric increment input. Used inside `VariantExerciseList` exercise row edit form.

**Rationale**: The increment config is not part of the core exercise definition (sets, reps, load unit), so it should be visually subordinate. Using a collapsible section prevents cluttering the exercise form for the majority of users who don't configure increments immediately. The component is small enough (~60 lines) to be independently testable.

---

## 7. Copy-from-above interaction pattern

**Decision**: Icon button (copy/duplicate icon from lucide-react) positioned to the right of the load field in each set row after the first. On tap: copy live values from set N−1 to set N, clear any `isPreFilled` flag, fire commit.

**Rationale**: This is the standard pattern in Strong (iOS) and Hevy — a small copy icon adjacent to the load field. Using an icon (not a text button) saves horizontal space on narrow viewports. The 44px touch target is achieved with `p-2` padding around a 16px icon (totalling 40px → use `min-w-[44px] min-h-[44px]` on the button).

**Alternatives considered**: Swipe gesture. Rejected — not discoverable on WebView; gestures conflict with scroll. Long-press. Rejected — adds delay and is non-obvious for first-time users.

---

## 8. "Prev" row layout on mobile (confirmed: Option B)

**Decision**: Each active set row is followed by a full-width muted reference row: `"prev: X reps · Y kg"` (or `"prev: —"` when no data). On mobile (≤ 430 px), the reference row spans the full card width using `grid-column: 2 / -1` so it doesn't require its own column allocation in the parent grid.

**Rationale**: This is the least disruptive layout change — the existing set grid (set# | reps | load) stays intact. The prev row is visually subordinate and never competes with the active input for focus. No font-size reduction needed (can use `text-xs` at 12px, well above WCAG 4.5:1 threshold with muted foreground).

---

## 9. No new external dependencies

**Decision**: Zero new npm packages.

**Rationale**: All new UI is composed from existing shadcn/ui primitives (Input, Button, Badge, Collapsible) and lucide-react icons already in the bundle. The `computePrefillSets` utility uses no external math libraries. Bundle impact: 0 additional KB.

---

## 10. Testing strategy

**Decision**: Unit tests for `computePrefillSets` (pure function, high branch coverage). Integration tests for all new interactive behaviours in `SessionExerciseLogger`, and for `IncrementField` in variant config. Extend existing `SessionExerciseLogger.test.tsx` rather than creating a parallel file.

**Coverage target**: `app/lib/utils/strength.ts` (new utility) should reach 100% line coverage. New components (`PrevSetRow`, `CopySetButton`, `PrefillBadge`) tested via integration tests on `SessionExerciseLogger`. `IncrementField` tested in a dedicated component integration test.

**Mock data additions**: Add `progressionIncrement` to seed exercises in `mock-data/strength-variants.ts`. Add a variant whose last session has `progression = 'up'` to test the full pre-fill path without a DB.
