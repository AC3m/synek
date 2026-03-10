# Tasks: Athlete Self-Planning & Coach Personal Profile

**Branch**: `007-athlete-planning`
**Input**: `specs/007-athlete-planning/` (plan.md, spec.md, research.md, data-model.md)
**Tests**: Vitest — scoped per plan.md (unit: profiles query; integration: hook, picker, athlete week view)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (independent files, no blocking dependencies)
- **[Story]**: User story label (US1 / US2 / US3)

---

## Phase 1: Setup

No project-level setup required — feature adds to an existing SPA. Branch is already checked out.

---

## Phase 2: Foundational (Data Layer)

**Purpose**: The query, hook, and mock infrastructure that ALL three user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until T001–T005 are complete.

- [ ] T001 Create migration `supabase/migrations/008_self_plan_permission.sql` — `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS can_self_plan boolean NOT NULL DEFAULT true` with RLS: athlete updates own row; coach updates rows for their athletes in `coach_athletes`
- [ ] T002 [P] Create mock store `app/lib/mock-data/profiles.ts` — `MOCK_SELF_PLAN: Map<string, boolean>` seeded `true` for `athlete-1` and `athlete-2`; export `resetMockProfiles()` (deep-resets to all-true for test `beforeEach`)
- [ ] T003 [P] Add `selfPlan` query key to `app/lib/queries/keys.ts` — `selfPlan: { byAthlete: (id: string) => ['selfPlan', id] as const }`
- [ ] T004 Create query file `app/lib/queries/profiles.ts` — `fetchSelfPlanPermission(athleteId)` and `updateSelfPlanPermission(athleteId, value)`, each with real Supabase implementation (`select('id, can_self_plan')`, no wildcards) and mock implementation using `MOCK_SELF_PLAN`; export both mock functions for tests (depends on T002, T003)
- [ ] T005 Create hooks file `app/lib/hooks/useProfile.ts` — `useSelfPlanPermission(athleteId: string)` (`useQuery`, `enabled: !!athleteId`) and `useUpdateSelfPlanPermission()` (`useMutation` with full optimistic cycle: cancel + snapshot in `onMutate`, rollback in `onError`, invalidate in `onSettled`) (depends on T004)

**Checkpoint**: Data layer complete — all three user story phases can now begin.

---

## Phase 3: User Story 1 — Coach Enables Athlete Self-Planning (Priority: P1) 🎯 MVP

**Goal**: Coach can flip a self-planning toggle for any athlete directly in the athlete context banner, changing the shared state immediately.

**Independent Test**: Log in as coach → select an athlete → toggle self-planning off → log in as that athlete → confirm no session creation controls visible in week view. Toggle back on → controls reappear.

### Tests for User Story 1

- [ ] T006 [P] [US1] Create unit test `app/test/unit/profiles.test.ts` — `fetchSelfPlanPermission` returns `true` for default athlete; `updateSelfPlanPermission` persists value; subsequent fetch returns updated value; `resetMockProfiles` resets to all-true (depends on T002, T004)
- [ ] T007 [P] [US1] Create integration test `app/test/integration/useSelfPlanPermission.test.ts` — hook returns `true` for default athlete; mutation updates cache optimistically; rolls back on simulated error; invalidates on settled (depends on T005)

### Implementation for User Story 1

- [ ] T008 [P] [US1] Add `selfPlan.label` and `selfPlan.hint` keys to `app/i18n/resources/en/coach.json`
- [ ] T009 [P] [US1] Add same keys (Polish translations) to `app/i18n/resources/pl/coach.json` (parallel with T008 — different file)
- [ ] T010 [US1] Add self-plan `Switch` toggle to the athlete context banner in `app/routes/coach/layout.tsx` — call `useSelfPlanPermission(selectedAthleteId)` and `useUpdateSelfPlanPermission()`; render shadcn `Switch` with `t('selfPlan.label')` inline in the banner only when `selectedAthleteId !== null && selectedAthleteId !== user?.id` (depends on T005, T008, T009)

**Checkpoint**: US1 complete — coach can enable/disable self-planning per athlete. Toggling reflects immediately in shared state.

---

## Phase 4: User Story 2 — Athlete Enables Own Self-Planning (Priority: P2)

**Goal**: Athlete can toggle self-planning on/off in their own settings, and when enabled sees full session planning controls in their week view.

**Independent Test**: Log in as athlete → disable self-planning in Settings → navigate to week view → confirm no add/edit/delete controls. Re-enable → navigate to week view → confirm controls appear and a session can be created.

### Tests for User Story 2

- [ ] T011 [US2] Create integration test `app/test/integration/AthleteWeekView.selfplan.test.ts` — when `canSelfPlan = false` (mock returns false): no add-session button rendered; when `canSelfPlan = true` (mock returns true): add-session button visible and clicking it opens `SessionForm` (depends on T004, T005)

### Implementation for User Story 2

- [ ] T012 [P] [US2] Add `selfPlan.label` and `selfPlan.hint` keys to `app/i18n/resources/en/athlete.json`
- [ ] T013 [P] [US2] Add same keys (Polish translations) to `app/i18n/resources/pl/athlete.json` (parallel with T012)
- [ ] T014 [US2] Add self-planning toggle section to `app/components/settings/UserTab.tsx` — call `useSelfPlanPermission(user.id)` and `useUpdateSelfPlanPermission()`; render shadcn `Switch` with `t('selfPlan.label')` and hint text; only visible when `user.role === 'athlete'` (depends on T005, T012, T013)
- [ ] T015 [US2] Extend `app/routes/athlete/week.$weekId.tsx` to support planning controls when `canSelfPlan` — read `useSelfPlanPermission(user?.id ?? '').data ?? true`; when true: call `useGetOrCreateWeekPlan`, `useCreateSession`, `useUpdateSession`, `useDeleteSession`; manage `formOpen`/`formDay`/`editingSession` state; pass planning callbacks to `WeekGrid`; render `<SessionForm>` at bottom; auto-create week plan on first access via same `useRef` guard pattern as coach week view (depends on T005)

**Checkpoint**: US2 complete — athlete can self-manage the toggle AND create/edit/delete sessions when enabled.

---

## Phase 5: User Story 3 — Coach Manages Own Training Plan (Priority: P3)

**Goal**: Coach's own profile appears first in the athlete picker (visually distinct), and selecting it gives access to both planning and athlete controls in the same week view.

**Independent Test**: Log in as coach → open athlete picker → confirm "Myself" card appears first with distinct visual treatment → select it → confirm add/edit/delete session controls AND mark-complete + notes controls are all visible in the week view → data stays isolated from athlete weeks.

### Tests for User Story 3

- [ ] T016 [US3] Create integration test `app/test/integration/AthletePicker.test.ts` — "Myself" card renders before all athlete cards; clicking it calls `selectAthlete(user.id)`; card has visually distinct class (depends on T005)

### Implementation for User Story 3

- [ ] T017 [P] [US3] Add `showAthleteControls?: boolean` prop (default `false`) to `WeekGrid` in `app/components/calendar/WeekGrid.tsx` — pass it through to each `DayColumn`
- [ ] T018 [P] [US3] Thread `showAthleteControls` through `app/components/calendar/DayColumn.tsx` to `SessionCard` (parallel with T017 — different file)
- [ ] T019 [US3] In `app/components/calendar/SessionCard.tsx` render `CompletionToggle`, `AthleteFeedback`, and `PerformanceEntry` when `showAthleteControls` is true (currently gated on `athleteMode`); keep `athleteMode` as the gate for hiding edit/delete buttons — the two props are orthogonal (depends on T017, T018)
- [ ] T020 [P] [US3] Add `athletePicker.myself`, `athletePicker.myselfBadge`, and `myPlan` keys to `app/i18n/resources/en/coach.json`
- [ ] T021 [P] [US3] Add same keys (Polish translations) to `app/i18n/resources/pl/coach.json` (parallel with T020)
- [ ] T022 [US3] Add "Myself" card to `app/components/coach/AthletePicker.tsx` — render before the athletes list using `user` from `useAuth()`; distinct visual treatment (`border-primary bg-primary/5`); small badge with `t('athletePicker.myselfBadge')`; on click: `selectAthlete(user.id)`; card always renders regardless of whether `athletes` is empty (depends on T020, T021)
- [ ] T023 [US3] Update athlete context banner in `app/routes/coach/layout.tsx` — when `selectedAthleteId === user?.id`: show `t('myPlan')` label instead of "Managing [Name]", hide the "Switch athlete" button; the `showAthleteControls` toggle added in T010 should also be hidden for self-view (depends on T010, T020, T021)
- [ ] T024 [US3] Extend `app/routes/coach/week.$weekId.tsx` for dual controls — `const isViewingSelf = effectiveAthleteId === user?.id`; when true: call `useUpdateAthleteSession()`, define `handleToggleComplete`, `handleUpdateNotes`, `handleUpdatePerformance`; pass `showAthleteControls={isViewingSelf}` and athlete callbacks to `WeekGrid` (depends on T019, T023)

**Checkpoint**: US3 complete — coach can select "Myself", plan sessions, and mark them complete all from one view.

---

## Phase 6: Polish & Quality Gates

- [ ] T025 [P] Run `pnpm typecheck` and fix any TypeScript errors introduced by the new prop threading (`showAthleteControls`) and hook additions
- [ ] T026 Verify all seven constitution quality gates: i18n complete (en + pl), optimistic update cycle on `useUpdateSelfPlanPermission`, no hardcoded colors, no `supabase.from()` outside `lib/queries/`, mock parity on `profiles.ts`, no wildcard `select('*')`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 2)**: No dependencies — start immediately
- **US1 (Phase 3)**: Depends on T005 (hooks) — can start once foundational is done
- **US2 (Phase 4)**: Depends on T005 (hooks) — can start in parallel with US1
- **US3 (Phase 5)**: Depends on T010 (US1 banner, same file) — start after US1
- **Polish (Phase 6)**: Depends on all story phases complete

### User Story Dependencies

- **US1 (P1)**: Unblocked by T005 — no dependency on US2 or US3
- **US2 (P2)**: Unblocked by T005 — no dependency on US1 or US3; parallel with US1 (different files)
- **US3 (P3)**: Depends on T010 (US1) because `coach/layout.tsx` is touched by both; otherwise independent of US2

### Within Each Story

- i18n tasks [P] first (they have no code deps)
- Query/hook dependencies before UI tasks
- Prop threading (T017, T018) before consumer (T019)
- Banner changes before week view changes within US3

### Parallel Opportunities

```
Foundational:   T002 ‖ T003  →  T004  →  T005
US1 i18n:       T008 ‖ T009  (then T010)
US1 tests:      T006 ‖ T007  (parallel with i18n)
US2 i18n:       T012 ‖ T013  (then T014, T015)
US2 vs US1:     Phase 3 and Phase 4 can run in parallel (different files)
US3 grid:       T017 ‖ T018  →  T019
US3 i18n:       T020 ‖ T021  (then T022, T023)
```

---

## Implementation Strategy

### MVP (User Story 1 only — 8 tasks)

1. Complete Phase 2 (T001–T005) — data layer
2. Complete Phase 3 (T006–T010) — coach toggle in banner
3. **Validate**: coach can enable/disable self-planning; shared state visible to both
4. Ship — athletes now have a self-plan flag (default on); coaches control it

### Incremental Delivery

1. MVP → US1 → coach controls athlete's self-planning flag
2. Add US2 → athletes control their own flag + see planning controls when enabled
3. Add US3 → coaches have "Myself" entry with full dual-mode week view
4. Each phase independently verifiable and shippable

---

## Task Summary

| Phase | Tasks | Story |
|-------|-------|-------|
| Foundational | T001–T005 | — |
| US1 (P1) | T006–T010 | Coach enables athlete self-planning |
| US2 (P2) | T011–T015 | Athlete enables own self-planning |
| US3 (P3) | T016–T024 | Coach manages own plan |
| Polish | T025–T026 | — |
| **Total** | **26 tasks** | 3 user stories |
