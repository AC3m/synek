# Tasks: Issue #74 — Wojtek Feedback (5 Stories)

**Spec**: `docs/superpowers/specs/2026-04-25-issue-74-wojtek-feedback-design.md`
**Branch**: `feat/wojtek-feedback-1`

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label (US3, US10, US2, US1, US4)

---

## Phase 1: Setup

**Purpose**: Confirm baseline before touching anything.

- [x] T001 Run `pnpm typecheck` and confirm it passes clean on rebased branch

---

## Phase 2: US-3 — Mobile Safari VariantPicker safe area fix (ship first)

**Goal**: iOS Safari bottom toolbar no longer overlaps Sheet content in VariantPicker.

**Independent Test**: Open variant picker on iOS Safari — full list scrollable, search input visible above toolbar.

- [x] T002 [US3] Add `pb-[env(safe-area-inset-bottom)]` to SheetContent in `app/components/strength/VariantPicker.tsx`

**Checkpoint**: Typecheck passes. Single-file change, ready for its own PR.

---

## Phase 3: US-10 — Training type search aliases

**Goal**: Typing "gym" in session type picker shows Strength. Typing "rower" shows Cycling.

**Independent Test**: Session form type picker — search "gym" → only Strength badge shown; clear → all types shown.

- [x] T003 [P] [US10] Add `TRAINING_TYPE_ALIASES: Record<TrainingType, string[]>` and `matchesTrainingType(query, type, label)` to `app/lib/utils/training-types.ts`
- [x] T004 [P] [US10] Add `session.searchTypePlaceholder` i18n key to `app/i18n/resources/en/coach.json` and `app/i18n/resources/pl/coach.json` (or `common.json` if coach namespace absent — check existing namespace files)
- [x] T005 [US10] Add search `Input` above training type badge list in `app/components/training/SessionFormFields.tsx`; filter `TRAINING_TYPES` via `matchesTrainingType()`; show muted "No matching type" when results empty (depends T003, T004)

**Checkpoint**: Typecheck passes. Frontend-only, no DB touch.

---

## Phase 4: US-2 — Terminology popovers

**Goal**: Athlete can tap ⓘ next to sets/reps target and next to "Next session" label to read a plain-language explanation.

**Independent Test**: Open strength session logger → two ⓘ icons visible → each opens correct popover copy → closes on outside click.

- [x] T006 [US2] Create `app/components/ui/InfoPopover.tsx` — wraps shadcn `Popover` with lucide `Info` icon (`size-3.5`, `text-muted-foreground`), 44×44px touch target, accepts `content: ReactNode`
- [x] T007 [P] [US2] Add popover copy i18n keys (`strength.logger.setsRepsInfo`, `strength.logger.nextSessionInfo`) to `app/i18n/resources/en/training.json`
- [x] T008 [P] [US2] Add same keys (Polish translation) to `app/i18n/resources/pl/training.json`
- [x] T009 [US2] Place `InfoPopover` next to sets/reps target line in `ExerciseCard` header inside `app/components/strength/SessionExerciseLogger.tsx` (depends T006, T007, T008)
- [x] T010 [US2] Place `InfoPopover` next to "Next session" label above `ProgressionToggle` in `app/components/strength/SessionExerciseLogger.tsx` (depends T006, T007, T008)

**Checkpoint**: Typecheck passes. New reusable component + two wiring points.

---

## Phase 5: US-1 — Variant → session mental model (3-layer guidance)

**Goal**: Athletes understand that templates must be attached to a Strength session on the week view before logging.

**Independent Test**: (1) Library page shows subtitle. (2) Save a variant → callout appears with "Go to this week" link. (3) Strength session with no variantId shows dashed CTA → tapping opens VariantPicker.

- [x] T011 [P] [US1] Add i18n keys for all 3 layers to `app/i18n/resources/en/training.json`:
  - `strength.library.subtitle`
  - `strength.variant.savedNudge`
  - `strength.variant.goToWeek`
  - `strength.session.noTemplateHint`
- [x] T012 [P] [US1] Add same keys (Polish) to `app/i18n/resources/pl/training.json`
- [x] T013 [P] [US1] Add persistent subtitle paragraph below `<h1>` in `app/components/strength/StrengthLibraryView.tsx` (Layer 1 — always visible, no state needed) (depends T011, T012)
- [x] T014 [US1] Add dismissible post-save callout (component state, resets on reopen) with "Go to this week →" link in `app/components/strength/VariantForm.tsx` or `VariantFormModal.tsx` — link to `/${locale}/athlete/week/${getCurrentWeekId()}` (Layer 2) (depends T011, T012)
- [x] T015 [US1] Add dashed-border CTA to strength session rendering in `app/components/calendar/SessionCard.tsx` when `!typeSpecificData?.variantId`; tap triggers existing VariantPicker open flow (Layer 3) (depends T011, T012)

**Checkpoint**: Typecheck passes. All 3 hints render and link correctly.

---

## Phase 6: US-4 — Inline set add/remove + training preferences

**Goal**: Athletes can add/remove sets mid-session without editing the template. Toggle is in Settings → Training tab, ON by default.

**Independent Test**: (1) Settings → Training tab visible for athletes; toggle persists to DB. (2) ExerciseCard shows +/− buttons when preference ON; hidden when OFF or readOnly. (3) "Remove set" disabled at 1 set.

- [x] T016 [US4] Create `app/types/preferences.ts` — export `TrainingPreferences` interface (`allowSetAdjustment: boolean`) and `DEFAULT_TRAINING_PREFERENCES`
- [x] T017 [P] [US4] Write Supabase migration `supabase/migrations/$(date +%Y%m%d%H%M%S)_add_training_preferences_to_profiles.sql` — `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS training_preferences JSONB NOT NULL DEFAULT '{"allowSetAdjustment": true}'::jsonb`
- [x] T018 [US4] Extend `app/lib/queries/profile.ts` — include `training_preferences` in profile select; add `updateTrainingPreferences(input: Partial<TrainingPreferences>)` mutation with JSONB merge update (depends T016)
- [x] T019 [P] [US4] Add i18n keys to `app/i18n/resources/en/training.json` and `app/i18n/resources/en/common.json`:
  - `strength.logger.addSet`, `strength.logger.removeSet` (training.json)
  - `settings.tabs.training`, `settings.training.adjustSets`, `settings.training.adjustSetsSub` (common.json)
- [x] T020 [P] [US4] Add same keys (Polish) to `app/i18n/resources/pl/training.json` and `app/i18n/resources/pl/common.json`
- [x] T021 [US4] Create `app/lib/hooks/useTrainingPreferences.ts` — reads `profile.data?.trainingPreferences ?? DEFAULT_TRAINING_PREFERENCES`; exposes `preferences` and `update` mutation (depends T016, T018)
- [x] T022 [US4] Create `app/components/settings/TrainingTab.tsx` — "Strength training" section header; single toggle row for `allowSetAdjustment` bound to `useTrainingPreferences` (depends T021, T019, T020)
- [x] T023 [US4] Register Training tab in `app/routes/settings.tsx` — `TabsTrigger value="training"` and `TabsContent` (athlete only); import `TrainingTab` (depends T022)
- [x] T024 [US4] Wire `useTrainingPreferences` in `SessionExerciseLogger` in `app/components/strength/SessionExerciseLogger.tsx`; pass `allowSetAdjustment` prop to `ExerciseCard`; add `+ Add set` / `− Remove set` buttons below set grid — state-only (`sets[]` push/pop), disabled at length 1 (depends T021, T019, T020)

**Checkpoint**: Migration runs; existing rows get default. Toggle round-trips through Supabase. Buttons show/hide per preference and readOnly flag. Typecheck passes.

---

## Phase 7: Polish

- [x] T025 Run `pnpm typecheck` — fix any remaining type errors across all changed files
- [x] T026 [P] Docs update check — new `InfoPopover` reusable pattern → consider adding to `docs/how-to/`; no ADR needed (no architectural decision); no convention change needed → state in PR description

---

## Dependencies & Execution Order

### Story Dependencies

Each story is **fully independent** — no story blocks another:

| Story | Depends on      | Blocks  |
| ----- | --------------- | ------- |
| US-3  | T001 (baseline) | nothing |
| US-10 | T001            | nothing |
| US-2  | T001            | nothing |
| US-1  | T001            | nothing |
| US-4  | T001            | nothing |

### Within US-4 (internal ordering)

```
T016 (types) → T018 (queries) → T021 (hook) → T022 (TrainingTab) → T023 (settings route)
                                              → T024 (ExerciseCard buttons)
T017 (migration) — independent, run any time
T019/T020 (i18n) — independent, needed by T022 + T024
```

### Parallel Opportunities

```bash
# US-10: run in parallel
T003 (aliases map)  +  T004 (i18n placeholder key)

# US-2: run in parallel after T006 is done
T007 (en i18n)  +  T008 (pl i18n)
# Then T009 + T010 in parallel (same file but different JSX locations — review carefully)

# US-1: run in parallel
T011 (en i18n)  +  T012 (pl i18n)
# Then T013 + T014 + T015 in parallel (different files)

# US-4: run in parallel
T016 (types)  +  T017 (migration)  +  T019 (en i18n)  +  T020 (pl i18n)
```

---

## Implementation Strategy

### Ship order (per spec recommendation)

1. **US-3** (T001–T002) → tiny PR, ships immediately
2. **US-10** (T003–T005) → frontend-only, own PR
3. **US-2** (T006–T010) → new component + 2 wiring points, own PR
4. **US-1** (T011–T015) → 3 layers grouped in one PR
5. **US-4** (T016–T024) → largest; run migration, then UI, own PR

### MVP Scope

US-3 alone is a shippable MVP — fixes a real usability bug with one line of code.

---

## Summary

| Story     | Tasks  | Parallel tasks                                   |
| --------- | ------ | ------------------------------------------------ |
| US-3      | 1      | 0                                                |
| US-10     | 3      | 2 (T003, T004)                                   |
| US-2      | 5      | 3 (T007, T008; T009+T010 same file)              |
| US-1      | 5      | 4 (T011, T012, T013, T014, T015)                 |
| US-4      | 9      | 5 (T016, T017, T019, T020; T022+T024 after T021) |
| Polish    | 2      | 1 (T026)                                         |
| **Total** | **25** |                                                  |
