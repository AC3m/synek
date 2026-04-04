# Tasks: Strength Session UX Redesign

**Input**: Design documents from `specs/015-strength-session-ux/`
**Branch**: `015-strength-session-ux`
**Tests**: Included — explicitly requested in `/speckit.plan` invocation ("Keep test coverage as high as possible")

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: User story this task belongs to (US1–US4)
- Tests are written **before** implementation (TDD) and must fail first

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Schema, type layer, and mock data — blocks all user story work.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T001 Create DB migration file `supabase/migrations/20260403000000_add_progression_increment.sql` — adds `progression_increment NUMERIC(6,2) NULL CHECK (progression_increment IS NULL OR progression_increment > 0)` column to `strength_variant_exercises` with a column comment
- [ ] T002 [P] Add `progressionIncrement: number | null` to `StrengthVariantExercise` interface and add `progressionIncrement?: number | null` to `exercises[n]` in both `CreateStrengthVariantInput` and `UpsertVariantExercisesInput` in `app/types/training.ts`
- [ ] T003 [P] Update `toVariantExercise(row)` mapper to include `progressionIncrement: row.progression_increment ?? null` and add `progression_increment: ex.progressionIncrement ?? null` to the upsert payload in `app/lib/queries/strength-variants.ts` (depends on T002)
- [ ] T004 [P] Add `progressionIncrement` field (Bench Press = `2.5`, others = `null`) to all seed `StrengthVariantExercise` objects; update `mockUpsertVariantExercises` to persist the field; ensure one seed `StrengthSessionExercise` has `progression: 'up'` on Bench Press in `app/lib/mock-data/strength-variants.ts` (depends on T002)

**Checkpoint**: `pnpm typecheck` exits 0. Mock data seed has `progressionIncrement` on all exercises.

---

## Phase 2: User Story 1 — Previous Session Reference in Logger (Priority: P1) 🎯 MVP

**Goal**: Persistent muted "prev" row visible below each active set row whenever prior session data exists. Zero additional taps — athletes see last session data while typing.

**Independent Test**: Open a mock strength session for "Push A" that has a prior completed session. Verify a "prev: 10 reps · 80 kg" row appears below Set 1's active inputs. Verify no prev rows appear when the variant has never been used before. Verify coach (read-only) mode shows prev rows identically.

### Tests for User Story 1 ⚠️ Write first — must FAIL before implementation

- [ ] T005 [P] [US1] Write failing prev-row integration tests (new `describe('previous session reference rows', ...)` block) covering: prev rows present when prefillData provided, "—" shown when prior session had fewer sets, no prev rows when no prefillData, "(top set)" shown when setsData is empty, "From [date]" provenance label in exercise header — in `app/test/integration/SessionExerciseLogger.test.tsx`

### Implementation for User Story 1

- [ ] T006 [P] [US1] Create `app/components/strength/PrevSetRow.tsx` — props: `reps: number | null`, `load: number | null`, `loadUnit: LoadUnit`, `isTopSetOnly?: boolean`; renders full-width muted row "prev: X reps · Y kg" or "prev: —"; uses `text-xs text-muted-foreground`; exports `SetState` interface (`{ reps: string; load: string; isPreFilled: boolean }`) from `app/lib/utils/strength.ts` so it can be shared with `computePrefillSets` in US3
- [ ] T007 [US1] Update `app/components/strength/SessionExerciseLogger.tsx`: (a) import `SetState` from `app/lib/utils/strength.ts` instead of defining locally; (b) add `isPreFilled: false` to all entries returned by `initSets`; (c) add `prefillDate?: string | null` to `SessionExerciseLoggerProps` and `ExerciseCardProps`; (d) render `<PrevSetRow>` after each active set row inside the `ExerciseCard` set loop when `prefill` is non-null; (e) guard: skip prev row when `prefill` is undefined (depends on T006)
- [ ] T008 [P] [US1] Update `app/components/training/SessionDetailModal.tsx` to pass `prefillResult?.date` as the new `prefillDate` prop to `<SessionExerciseLogger>`; update `app/components/training/SessionForm.tsx` to pass `prefillResult?.date` as `strengthPrefillDate` through the prop chain to `SessionExerciseLogger` (depends on T007 prop interface)
- [ ] T009 [P] [US1] Add i18n keys `strength.logger.prev`, `strength.logger.prevTopSet`, `strength.logger.prevNone`, and `strength.logger.prefillFrom` to **both** `app/i18n/resources/en/training.json` and `app/i18n/resources/pl/training.json` simultaneously

**Checkpoint**: US1 independently testable. T005 tests now pass. Athlete sees per-set previous values without any extra tap.

---

## Phase 3: User Story 2 — Per-Exercise Load Increment in Variant Config (Priority: P2)

**Goal**: Coach/athlete configures a numeric load increment per exercise inside a collapsible "Advanced" section. A chip shows the configured increment in the exercise list view.

**Independent Test**: Open the "Push A" variant detail page. Expand "Advanced" on Bench Press, enter 2.5 kg. Save. Verify: "+2.5 kg" chip appears next to Bench Press. Clear the field and save. Verify chip disappears and null is stored.

### Tests for User Story 2 ⚠️ Write first — must FAIL before implementation

- [ ] T010 [P] [US2] Write failing `IncrementField` integration tests covering: collapsed by default, expands on trigger click, `onChange(2.5)` on valid input, `onChange(null)` on clear or zero, "kg" suffix for kg unit, "s" suffix for sec unit, chip shown when value non-null, chip hidden when null, input disabled when `disabled` prop true — in `app/test/integration/IncrementField.test.tsx`

### Implementation for User Story 2

- [ ] T011 [P] [US2] Create `app/components/strength/IncrementField.tsx` — props: `value: number | null`, `loadUnit: LoadUnit`, `onChange: (v: number | null) => void`, `disabled?: boolean`; uses shadcn `Collapsible` primitive; shows "+X kg" `Badge` chip above trigger when `value` non-null; label from i18n (`incrementLabel` or `durationIncrement` based on unit); parse float on change, call `onChange(null)` if NaN or ≤ 0; touch target ≥ 44 px on collapsible trigger
- [ ] T012 [US2] Update `app/components/strength/VariantExerciseList.tsx`: add `progressionIncrement: number | null` to the local exercise edit state (alongside existing `loadUnit`, `sets` etc.); render `<IncrementField>` in edit mode after the load unit selector; render the "+X kg" chip in view/read mode when `ex.progressionIncrement != null` (depends on T011)
- [ ] T013 [P] [US2] Add i18n keys `strength.exercise.incrementLabel`, `strength.exercise.durationIncrement`, `strength.exercise.incrementChip`, and `strength.exercise.advancedToggle` to **both** `app/i18n/resources/en/training.json` and `app/i18n/resources/pl/training.json` simultaneously

**Checkpoint**: US2 independently testable. T010 tests now pass. Increment chip visible after saving a value.

---

## Phase 4: User Story 3 — Auto Pre-fill Next Session on Progression Intent (Priority: P3)

**Goal**: When opening a session for a variant with prior data, load inputs are pre-filled with computed values (previous ± increment based on intent) shown in a muted tint. Editing any row clears that row's tint. Pre-fill is never applied when saved data already exists for the exercise.

**Independent Test**: In mock mode, complete Bench Press at 80 kg × 10 with intent "up" and increment 2.5 kg. Open a new session with same variant. Verify: load fields show 82.5 kg (actual value, not placeholder) with muted tint. Type a different value in Set 1 — tint clears for Set 1 only, Set 2 stays tinted. Close and reopen session — Set 1 shows typed value, not 82.5 kg.

### Tests for User Story 3 ⚠️ Write first — must FAIL before implementation

- [ ] T014 [P] [US3] Write failing `computePrefillSets` unit tests covering all branches: up+increment, up+null increment, down+increment, down floors at 0, maintain unchanged, null intent, falls back to topSet when setsData empty, marks all entries `isPreFilled: true`, empty string when reps/load null — in `app/test/unit/computePrefillSets.test.ts`
- [ ] T015 [P] [US3] Write failing pre-fill integration tests (new `describe('pre-fill applied to inputs', ...)` block) covering: computed values in load inputs when no logged data, no pre-fill when logged data exists, tint cleared when user edits a row, other rows unaffected on single-row edit, `PrefillBadge` renders with correct direction + date — in `app/test/integration/SessionExerciseLogger.test.tsx`

### Implementation for User Story 3

- [ ] T016 [P] [US3] Create `app/components/strength/PrefillBadge.tsx` — props: `direction: ProgressionIntent | null`, `incrementApplied: number | null`, `fromDate: string | null`, `loadUnit: LoadUnit`; renders `▲ +2.5 kg · From Mar 24` / `▼ −2.5 kg · From Mar 24` / `= From Mar 24`; green text for up, amber for down, muted for maintain; renders nothing when `fromDate` is null; uses `text-xs`
- [ ] T017 [US3] Implement `computePrefillSets(prefill: StrengthSessionExercise, exercise: StrengthVariantExercise): SetState[]` in `app/lib/utils/strength.ts` following the formula in `data-model.md`; also export the `SetState` interface (`{ reps: string; load: string; isPreFilled: boolean }`) from this file (depends on T014 tests passing)
- [ ] T018 [US3] Update `app/components/strength/SessionExerciseLogger.tsx`: (a) update `initSets` to call `computePrefillSets(prefill, exercise)` when `logged === undefined && prefill != null` — returning pre-filled sets; (b) update `updateSet` to set `isPreFilled: false` on the edited row index; (c) update `hydratedRef` guard to also skip re-hydration when pre-fill was already applied (check `sets[0].isPreFilled`); (d) apply `bg-muted/40` tint class to set row inputs when `set.isPreFilled === true`, remove on edit (depends on T017 and US1 ExerciseCard changes from T007)
- [ ] T019 [US3] Render `<PrefillBadge>` in `ExerciseCard` header in `app/components/strength/SessionExerciseLogger.tsx` — below the target reps line; pass `direction={prefill?.progression ?? null}`, `incrementApplied` derived from `exercise.progressionIncrement` and intent, `fromDate={prefillDate}`, `loadUnit={exercise.loadUnit}`; only renders when `prefillDate` is non-null (depends on T016 and T018)
- [ ] T020 [P] [US3] Add i18n keys `strength.logger.prefillUp`, `strength.logger.prefillDown`, `strength.logger.prefillMaintain`, `strength.logger.firstSession`, `strength.logger.setIncrementHint`, and `strength.logger.floorReached` to **both** `app/i18n/resources/en/training.json` and `app/i18n/resources/pl/training.json` simultaneously

**Checkpoint**: US3 independently testable. T014 + T015 tests now pass. Pre-filled values land in inputs with muted tint; closing and reopening preserves user edits.

---

## Phase 5: User Story 4 — Copy Set Values from Previous Set (Priority: P4)

**Goal**: A one-tap copy button on set rows 2+ copies reps + load from the set above. Button is disabled (muted) when the above set is empty. Auto-commits after copy. Absent in read-only mode.

**Independent Test**: Enter Set 1 — 80 kg × 10 reps. Tap the copy button on Set 2. Verify Set 2 immediately shows 80 kg × 10. Verify Set 1 has no copy button. Verify copy button on Set 2 is disabled/muted when Set 1 is empty.

### Tests for User Story 4 ⚠️ Write first — must FAIL before implementation

- [ ] T021 [P] [US4] Write failing copy button integration tests (new `describe('copy from set above', ...)` block) covering: no copy button on Set 1, copy button on Set 2+, copies live values from N-1 to N, button disabled/muted when set N-1 empty, no copy buttons in read-only mode, commit fires after copy — in `app/test/integration/SessionExerciseLogger.test.tsx`

### Implementation for User Story 4

- [ ] T022 [P] [US4] Create `app/components/strength/CopySetButton.tsx` — props: `onCopy: () => void`, `disabled: boolean`, `exerciseName: string`, `setIndex: number`; renders lucide `Copy` icon inside a `<button>` with `min-w-[44px] min-h-[44px] p-2`; `aria-label` uses `t('strength.logger.copyFromAbove')` interpolated with exercise name and set number; disabled state uses `opacity-40 cursor-not-allowed`; named export only
- [ ] T023 [US4] Update `ExerciseCard` in `app/components/strength/SessionExerciseLogger.tsx`: (a) add `handleCopyFromAbove(index: number)` — copies `sets[index-1]` reps+load to `sets[index]` with `isPreFilled: false`, then calls `commit()`; (b) render `<CopySetButton>` to the right of the load input on rows where `i > 0` and `!readOnly`; (c) set `disabled` when `sets[i-1].reps === '' && sets[i-1].load === ''` (depends on T022)
- [ ] T024 [P] [US4] Add i18n key `strength.logger.copyFromAbove` to **both** `app/i18n/resources/en/training.json` and `app/i18n/resources/pl/training.json` simultaneously

**Checkpoint**: US4 independently testable. T021 tests now pass. All four user stories functional together.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T025 Run `pnpm typecheck` from repo root — fix every TypeScript error in all modified files (`training.ts`, `strength-variants.ts`, `strength-variants` mock, `strength.ts`, `PrevSetRow.tsx`, `CopySetButton.tsx`, `PrefillBadge.tsx`, `IncrementField.tsx`, `SessionExerciseLogger.tsx`, `VariantExerciseList.tsx`, `SessionDetailModal.tsx`, `SessionForm.tsx`); must exit code 0
- [ ] T026 Run `pnpm test:run` — all existing tests must still pass, all new tests (T005, T010, T014, T015, T021) must pass; fix any failures before marking complete
- [ ] T027 [P] Create `docs/how-to/strength-prefill-pattern.md` documenting: (a) the `computePrefillSets` function, its inputs, and where it's called; (b) the "user-owned" guard (`logged === undefined`) that prevents overwriting saved data; (c) the `isPreFilled` state lifecycle (applied on mount → cleared on first edit → never restored on re-open); (d) how `progressionIncrement` flows from variant config to session pre-fill — satisfies Merge Gate 8 (docs updated for new reusable pattern)

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Foundational) ──────────────────────────────────┐
  T001 (migration)                                        │
  T002 (types) → T003 (queries), T004 (mock data)        │
                                                          ▼
Phase 2 US1 (P1) ← blocks MVP delivery                  Phase 3 US2 (P2)
  T005 (tests) [P]                                        T010 (tests) [P]
  T006 (PrevSetRow) [P]                                   T011 (IncrementField) [P]
  T007 (ExerciseCard wiring) ← T006                       T012 (VariantExerciseList) ← T011
  T008 (SessionDetailModal) [P] ← T007 interface          T013 (i18n) [P]
  T009 (i18n) [P]
         │
         ▼
Phase 4 US3 (P3) ← needs US1 ExerciseCard + Phase 1 types
  T014 (unit tests) [P]
  T015 (integration tests) [P]
  T016 (PrefillBadge) [P]
  T017 (computePrefillSets) ← T014
  T018 (initSets + tint) ← T017, T007
  T019 (render badge) ← T016, T018
  T020 (i18n) [P]
         │
         ▼
Phase 5 US4 (P4) ← needs US1 ExerciseCard (T007)
  T021 (tests) [P]
  T022 (CopySetButton) [P]
  T023 (ExerciseCard wiring) ← T022
  T024 (i18n) [P]
         │
         ▼
Phase 6 (Polish)
  T025 (typecheck)
  T026 (test:run) ← T025
  T027 (docs) [P]
```

### User Story Dependencies

- **US1 (P1)**: Needs Phase 1 complete — no dependency on US2, US3, or US4
- **US2 (P2)**: Needs Phase 1 complete — fully independent of US1, US3, US4 (different components)
- **US3 (P3)**: Needs Phase 1 + US1 ExerciseCard changes (T007 for `isPreFilled` in SetState and `initSets`)
- **US4 (P4)**: Needs Phase 1 + US1 ExerciseCard changes (T007 for `ExerciseCard` structure)

### Parallel Opportunities

```bash
# Phase 1 — run in parallel:
Task T001: "Create DB migration"
Task T002: "Update types in training.ts"
# After T002 completes:
Task T003: "Update row mapper + upsert in strength-variants.ts"
Task T004: "Update mock data in strength-variants mock"

# Phase 2 US1 — run in parallel:
Task T005: "Write failing prev-row integration tests"
Task T006: "Create PrevSetRow.tsx"
# After T006, T005 complete:
Task T007: "Update SessionExerciseLogger (ExerciseCard)"
# After T007:
Task T008: "Update SessionDetailModal + SessionForm"
Task T009: "Add EN + PL i18n prev keys"

# Phase 3 US2 — fully parallel with US1 (different files):
Task T010: "Write failing IncrementField tests"
Task T011: "Create IncrementField.tsx"

# Phase 4 US3 — after US1 complete:
Task T014: "Write failing computePrefillSets unit tests"
Task T015: "Write failing pre-fill integration tests"
Task T016: "Create PrefillBadge.tsx"
# After T014, T015, T016:
Task T017: "Implement computePrefillSets"
# After T017:
Task T018: "Update initSets + tint logic in SessionExerciseLogger"
Task T020: "Add EN + PL i18n prefill keys"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete **Phase 1** (Foundational — T001–T004)
2. Complete **Phase 2** (US1 — T005–T009)
3. **STOP and VALIDATE**: athletes can see previous session per-set values inline
4. Deploy / demo this increment independently

### Incremental Delivery

1. Phase 1 + Phase 2 (US1) → **MVP: previous session reference** visible to athletes
2. + Phase 3 (US2) → coaches can configure load increments per exercise
3. + Phase 4 (US3) → pre-fill with computed loads lands in inputs automatically
4. + Phase 5 (US4) → copy-from-above removes repetitive data entry
5. Phase 6 (Polish) → typecheck + all tests green + docs

### Parallel Team Strategy

With two developers after Phase 1 completes:
- **Dev A**: Phase 2 (US1) → Phase 4 (US3) → Phase 5 (US4)
- **Dev B**: Phase 3 (US2) — fully independent

---

## Summary

| Phase | Story | Tasks | Tests | Parallel Tasks |
|-------|-------|-------|-------|---------------|
| 1 — Foundational | — | T001–T004 | — | T001 ‖ T002; T003 ‖ T004 |
| 2 — US1 (P1) 🎯 | Previous session ref | T005–T009 | T005 | T005 ‖ T006; T008 ‖ T009 |
| 3 — US2 (P2) | Increment config | T010–T013 | T010 | T010 ‖ T011; T013 ‖ T012 |
| 4 — US3 (P3) | Auto pre-fill | T014–T020 | T014, T015 | T014 ‖ T015 ‖ T016; T018 ‖ T020 |
| 5 — US4 (P4) | Copy from above | T021–T024 | T021 | T021 ‖ T022; T024 ‖ T023 |
| 6 — Polish | — | T025–T027 | — | T027 ‖ T025 |

**Total tasks**: 27
**Test tasks**: 5 (T005, T010, T014, T015, T021)
**Suggested MVP**: Phases 1 + 2 (8 tasks, delivers US1 independently)
