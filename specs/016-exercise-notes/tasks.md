# Tasks: Exercise Notes per Session

**Input**: Design documents from `/specs/016-exercise-notes/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2)

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Infrastructure changes that MUST be complete before any user story work can proceed.

**⚠️ CRITICAL**: These tasks unblock US1 and US2 respectively. T001 must complete before any ExerciseCard changes. T002 and T003 must complete before PrevSummary notes display.

- [x] T001 Add `notes?: string | null` to the `LogRowChange` interface in `app/components/strength/SessionExerciseLogger.tsx` — this field must exist before ExerciseCard can propagate notes upward via `onChange`
- [x] T002 [P] Create migration `supabase/migrations/20260409000000_add_notes_to_last_session_rpc.sql`: drop and recreate `get_last_session_exercises` adding `notes text` to `RETURNS TABLE` and `sse.notes` to the `sessions_with_date` CTE SELECT (copy the full function body from `20260404000002_fix_last_session_exercises_use_session_date.sql`, add only the `notes` column)
- [x] T003 Update `fetchLastSessionExercises` in `app/lib/queries/strength-variants.ts`: replace the hardcoded `notes: null` in the `toStrengthSessionExercise` call with `notes: r.notes as string | null` — depends on T002 deploying the updated RPC schema

**Checkpoint**: T001 complete → US1 implementation can begin. T002 + T003 complete → US2 implementation can begin.

---

## Phase 2: User Story 1 — Athlete writes and saves a note (Priority: P1) 🎯 MVP

**Goal**: An athlete can type a free-text note on any exercise card during a strength session. The note persists on blur and is restored when the session is reopened.

**Independent Test**: Open a strength session form, type a note on one exercise card, tab away (blur), save the session, reload the page — confirm the note is still shown in the notes field.

### Implementation for User Story 1

- [x] T004 [US1] Add `notes` local state to `ExerciseCard` in `app/components/strength/SessionExerciseLogger.tsx`: `const [notes, setNotes] = useState<string>(logged?.notes ?? '')` and in the existing `useEffect` that hydrates `logged` data, also apply `setNotes(logged.notes ?? '')`
- [x] T005 [US1] Update `serializeCommit` in `app/components/strength/SessionExerciseLogger.tsx` to include `notes` in its serialized string (prevents unnecessary saves when only unrelated fields change); update `commit()` to pass `notes` in the `onChange(LogRowChange)` payload
- [x] T006 [US1] Add `<Textarea>` notes input to `ExerciseCard` in `app/components/strength/SessionExerciseLogger.tsx`: place it below the set rows grid and above the progression footer; bind `value={notes}`, `onChange={e => setNotes(e.target.value)}`, `onBlur={() => commit()}`, `maxLength={1000}`, aria-label and placeholder from i18n; hide entirely when `readOnly` is true and `notes` is empty (`!notes && readOnly` → render nothing)
- [x] T007 [US1] Handle coach read-only display in `ExerciseCard` in `app/components/strength/SessionExerciseLogger.tsx`: when `readOnly` is true and `notes` is non-empty, render the `<Textarea>` with `disabled` prop so it appears as static text but is still selectable; do not render the textarea when `readOnly && !notes`
- [x] T008 [P] [US1] Add i18n keys to `app/i18n/resources/en/training.json` and `app/i18n/resources/pl/training.json` under `strength.logger`: `"notesPlaceholder"` and `"notesLabel"` — add to both files in the same edit

### Tests for User Story 1

- [x] T009 [US1] Add a `describe('SessionExerciseLogger — notes input')` block to `app/test/integration/SessionExerciseLogger.test.tsx` with these cases: (a) notes textarea is rendered in editable mode; (b) typing a note triggers `onChange` with `notes` value on blur; (c) textarea is absent when `readOnly=true` and no note exists; (d) textarea is rendered (disabled) when `readOnly=true` and a note exists; (e) pre-existing `loggedExercise.notes` value is shown on render

**Checkpoint**: User Story 1 is fully functional — athletes can write, persist, and restore exercise notes. Coaches see existing notes as read-only text.

---

## Phase 3: User Story 2 — Previous session note shown in PrevSummary (Priority: P2)

**Goal**: When prefill data for an exercise includes a note from the previous session, that note is visible inside the expanded PrevSummary collapsible.

**Independent Test**: Complete session A with a note on exercise "Bench Press". Open session B (same variant, later date). Expand the "Previous session" collapsible on Bench Press — the note from session A appears below the set rows.

**Prerequisite**: T002 + T003 complete (RPC returns notes, query maps them).

### Implementation for User Story 2

- [x] T010 [US2] Add `notes?: string | null` to `PrevSummaryProps` in `app/components/strength/SessionExerciseLogger.tsx`; when `expanded && notes`, render the note text below the set lines in the expanded section
- [x] T011 [US2] In `ExerciseCard`'s JSX in `app/components/strength/SessionExerciseLogger.tsx`, pass `notes={prefill.notes}` to the `<PrevSummary>` component (the `prefill` prop is `StrengthSessionExercise` which already has `notes`)
- [x] T012 [P] [US2] Add i18n key `"prevNotes"` under `strength.logger` to both `app/i18n/resources/en/training.json` and `app/i18n/resources/pl/training.json` — used as a label before the note text in PrevSummary

### Tests for User Story 2

- [x] T013 [US2] Add a `describe('SessionExerciseLogger — PrevSummary notes display')` block to `app/test/integration/SessionExerciseLogger.test.tsx` with these cases: (a) when `prefillData` carries a non-null `notes`, expanding PrevSummary shows the note text; (b) when `prefillData.notes` is null, no note section appears in PrevSummary; (c) long note text wraps without breaking the layout (use a 200-char string)

**Checkpoint**: Both user stories are complete — athletes write notes, and the next session surfaces them in the previous-session collapsible.

---

## Phase 4: Polish & Quality Gates

**Purpose**: Type safety verification, test run, and documentation check.

- [x] T014 Run `pnpm typecheck` from repo root; fix any TypeScript errors introduced by the new `notes` field on `LogRowChange`, `PrevSummaryProps`, or `serializeCommit` changes
- [x] T015 Confirm no docs update is needed: the notes textarea follows the existing blur-commit pattern already used for reps/load inputs; no new architectural decision, naming convention, or forbidden pattern is introduced — add this statement explicitly to the PR description

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies — start immediately
- **US1 (Phase 2)**: Requires T001 complete
- **US2 (Phase 3)**: Requires T002 + T003 complete; T010–T013 can start in parallel with US1 once T002+T003 are done
- **Polish (Phase 4)**: Requires all implementation complete

### Within Phase 1 (Foundational)

- T001, T002 are independent — run in parallel
- T003 depends on T002 (RPC must exist before the mapping makes sense)

### Within US1 (Phase 2)

- T004 and T008 are independent — run in parallel
- T005 depends on T004 (needs notes state before updating commit)
- T006 depends on T005 (needs updated commit before wiring blur)
- T007 depends on T006 (readOnly behaviour extends the textarea added in T006)
- T009 (tests) can be written after T006 completes

### Within US2 (Phase 3)

- T010 and T012 are independent — run in parallel
- T011 depends on T010 (PrevSummary must accept the prop before ExerciseCard can pass it)
- T013 (tests) can be written after T011 completes

---

## Parallel Execution Examples

### Foundational phase

```text
Parallel:
  T001 — Add notes to LogRowChange (SessionExerciseLogger.tsx)
  T002 — SQL migration for RPC (new .sql file)

Sequential after T002:
  T003 — Update fetchLastSessionExercises query mapping
```

### US1 phase

```text
Parallel:
  T004 — ExerciseCard notes state (SessionExerciseLogger.tsx)
  T008 — i18n keys (en + pl training.json)

Sequential:
  T005 → T006 → T007 → T009
```

### US2 phase (can overlap with US1 once T002+T003 done)

```text
Parallel:
  T010 — PrevSummary notes prop + display (SessionExerciseLogger.tsx)
  T012 — i18n prevNotes key (en + pl training.json)

Sequential:
  T011 → T013
```

---

## Implementation Strategy

### MVP (User Story 1 only)

1. Complete T001 (Foundational — LogRowChange)
2. Complete T004 → T005 → T006 → T007 (ExerciseCard notes UI)
3. Complete T008 (i18n)
4. **Validate**: Type a note, blur, save, reload — note persists
5. Complete T009 (tests)
6. Complete T014 (typecheck)

> T002/T003 can be deferred to US2 — they have no effect on US1.

### Full delivery

After MVP validation:

1. Complete T002 + T003 (RPC migration + query mapping)
2. Complete T010 + T011 + T012 (PrevSummary display)
3. Complete T013 (tests)
4. Complete T014 + T015 (typecheck + docs check)

---

## Notes

- All changes except T002 are in existing files — no new source files needed
- `app/components/ui/textarea.tsx` already exists (shadcn/ui) — import directly
- Mock data already has `notes: null` on all seed exercises; integration tests supply non-null notes via inline fixtures
- The optimistic update in `useUpsertSessionExercises` (hook) already maps `notes` — no hook changes needed
- T002 requires a Supabase migration apply (`supabase db push` or MCP `apply_migration`)
