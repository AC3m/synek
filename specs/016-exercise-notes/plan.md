# Implementation Plan: Exercise Notes per Session

**Branch**: `016-exercise-notes` | **Date**: 2026-04-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/016-exercise-notes/spec.md`

## Summary

Add an editable notes textarea per exercise card in the strength session logger. Notes are persisted per `(session, exercise)` pair. The previous-session collapsible (`PrevSummary`) displays the prior note when one exists. Coaches see notes as read-only static text (hidden if empty); athletes can edit freely.

The DB column (`strength_session_exercises.notes`) already exists. The full upsert/fetch pipeline already carries the field. The only backend work is a migration to add `notes` to the `get_last_session_exercises` RPC so previous-session notes are available for display in `PrevSummary`. All other work is UI-only within `SessionExerciseLogger.tsx` plus i18n keys.

## Technical Context

**Language/Version**: TypeScript 5 (strict)
**Primary Dependencies**: React 19, TanStack Query 5, shadcn/ui (New York), i18next, Supabase JS 2
**Storage**: PostgreSQL via Supabase — `strength_session_exercises.notes text` column already migrated
**Testing**: Vitest + React Testing Library — integration tests in `app/test/integration/SessionExerciseLogger.test.tsx`
**Target Platform**: SPA, React Router 7, `ssr: false`
**Project Type**: Web application (SPA)
**Performance Goals**: Notes input must not add visible latency; blur-triggered commit is already the established pattern
**Constraints**: `pnpm typecheck` must pass; no new dependencies; i18n both locales simultaneously
**Scale/Scope**: Single component file change + one migration + i18n

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                                   | Status  | Evidence                                                                                                                                                                                    |
| ------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **I. Lean & Purposeful**                    | ✅ PASS | Notes field maps directly to user need; no speculative abstractions. Uses existing `Textarea` from shadcn/ui — no new utility wrappers.                                                     |
| **II. Configuration Over Hardcoding**       | ✅ PASS | All UI strings via i18n keys in both `en/` and `pl/`; no hardcoded labels.                                                                                                                  |
| **III. Type Safety & Boundary Validation**  | ✅ PASS | `LogRowChange` updated with typed `notes?: string                                                                                                                                           | null`; RPC row-mapper updated to map `notes`explicitly via`toStrengthSessionExercise`. No `any`. |
| **IV. Modularity & Testability**            | ✅ PASS | No DB access in components. Optimistic update in `useUpsertSessionExercises` already maps `notes`. Mock implementation already returns `notes` from seed data. New integration tests added. |
| **V. Performance & Operational Discipline** | ✅ PASS | No new dependencies. `Textarea` is already in `app/components/ui/`. Blur-triggered commit matches existing pattern. `pnpm typecheck` gate enforced.                                         |

**Complexity Tracking**: No violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/016-exercise-notes/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (affected files)

```text
supabase/migrations/
└── 20260409000000_add_notes_to_last_session_rpc.sql   # NEW — add notes to RPC return

app/
├── lib/
│   └── queries/
│       └── strength-variants.ts        # EDIT — map r.notes in fetchLastSessionExercises
├── components/
│   └── strength/
│       └── SessionExerciseLogger.tsx   # EDIT — LogRowChange, ExerciseCard, PrevSummary
├── i18n/
│   └── resources/
│       ├── en/training.json            # EDIT — add notes keys
│       └── pl/training.json            # EDIT — add notes keys
└── test/
    └── integration/
        └── SessionExerciseLogger.test.tsx  # EDIT — add notes test cases
```

**Structure Decision**: Single SPA project. All changes are additive edits to existing files. No new files needed in `app/`. One new SQL migration file.

## Implementation Phases

### Phase A — RPC Migration (backend prerequisite)

**File**: `supabase/migrations/20260409000000_add_notes_to_last_session_rpc.sql`

Drop and recreate `get_last_session_exercises` to add `notes text` to the `RETURNS TABLE` clause and `sse.notes` to the CTE `SELECT`. The rest of the function body is unchanged.

This is a prerequisite: until the RPC returns `notes`, the `fetchLastSessionExercises` mapping always receives `null` and `PrevSummary` can never show a previous note.

### Phase B — Query Layer Update

**File**: `app/lib/queries/strength-variants.ts`, function `fetchLastSessionExercises`

Change the `toStrengthSessionExercise` call for each prefill row from:

```ts
notes: null,
```

to:

```ts
notes: r.notes as string | null,
```

No other changes to the query layer; the upsert and fetch paths already handle `notes` correctly.

### Phase C — `LogRowChange` Interface

**File**: `app/components/strength/SessionExerciseLogger.tsx`

Add `notes?: string | null` to `LogRowChange`:

```ts
export interface LogRowChange {
  variantExerciseId: string;
  actualReps: number | null;
  loadKg: number | null;
  setsData: SetEntry[];
  progression: ProgressionIntent | null;
  notes?: string | null; // ← new
}
```

### Phase D — `ExerciseCard` Notes State + Input

**File**: `app/components/strength/SessionExerciseLogger.tsx`, `ExerciseCard`

1. Add local state: `const [notes, setNotes] = useState<string>(logged?.notes ?? '')`
2. In the existing `useEffect` that hydrates `logged` data, also set `notes` from `logged.notes ?? ''`
3. Update `commit()` to include notes in the `onChange` payload
4. Add serialization of `notes` to `serializeCommit` so unchanged notes don't trigger unnecessary saves
5. Add `<Textarea>` below the set rows grid, above the footer section:
   - Hidden entirely when `readOnly && !notes` (coach with no note)
   - `readOnly` / `disabled` when `readOnly` is true and note exists (coach sees static-looking text)
   - Editable (no `readOnly`) for athletes
   - `onBlur={() => commit()}` to persist on focus-out
   - `maxLength={1000}`
   - i18n placeholder and aria-label

### Phase E — `PrevSummary` Notes Display

**File**: `app/components/strength/SessionExerciseLogger.tsx`, `PrevSummary`

Add `notes?: string | null` to `PrevSummaryProps`. When `expanded && notes` is truthy, render the note text below the set lines. No render when `notes` is null/empty (FR-007).

`ExerciseCard` already has `prefill` prop (`StrengthSessionExercise`) which carries `notes` — pass `prefill.notes` to `PrevSummary`.

### Phase F — i18n

**Files**: `app/i18n/resources/en/training.json`, `app/i18n/resources/pl/training.json`

Add under `strength.logger`:

```json
"notesPlaceholder": "Add a note for this exercise…",
"notesLabel": "Notes",
"prevNotes": "Note"
```

Polish equivalents added simultaneously.

### Phase G — Tests

**File**: `app/test/integration/SessionExerciseLogger.test.tsx`

Add two new `describe` blocks:

1. **Notes input** — athlete can type a note; `onChange` is called with the note value on blur; input is absent in `readOnly` mode when no note exists
2. **PrevSummary notes display** — when `prefillData` carries a non-null `notes`, expanding PrevSummary shows the note; when `notes` is null, no note section is rendered

## Merge Checklist

- [ ] `pnpm typecheck` passes with exit code 0
- [ ] Mock parity: `mockFetchLastSessionExercises` already returns full `StrengthSessionExercise` with `notes` — no extra mock work needed
- [ ] i18n: both `en/` and `pl/` updated with notes keys
- [ ] Optimistic update: `useUpsertSessionExercises.onMutate` already maps `notes` — no change needed
- [ ] No hardcoded colors introduced
- [ ] No direct DB calls in components
- [ ] Integration tests added for notes input and PrevSummary display
- [ ] PR description notes no new docs needed (pattern is existing textarea-on-blur, no new architectural decision)
