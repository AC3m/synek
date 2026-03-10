# Implementation Plan: Athlete Self-Planning & Coach Personal Profile

**Branch**: `007-athlete-planning` | **Date**: 2026-03-10 | **Spec**: [spec.md](./spec.md)

## Summary

Adds two capabilities: (1) a shared `can_self_plan` toggle per athlete that either the coach or the athlete can flip — when on, the athlete week view gains full session CRUD; (2) a "Myself" entry at the top of the coach's athlete picker that lets coaches manage and experience their own training plan with both planning and athlete controls in a single view.

---

## Technical Context

**Language/Version**: TypeScript 5 (strict)
**Primary Dependencies**: React 19, React Router 7 (SPA), TanStack Query 5, Supabase JS 2, shadcn/ui, i18next
**Storage**: PostgreSQL via Supabase — one new column `profiles.can_self_plan boolean DEFAULT true`
**Testing**: Vitest 4 + @testing-library/react 16, jsdom
**Target Platform**: Web SPA (desktop + mobile)
**Project Type**: Web application (SPA, `ssr: false`)
**Performance Goals**: Optimistic updates reflect within one render frame per Constitution IV
**Constraints**: No new dependencies; reuse existing components and hooks patterns
**Scale/Scope**: Feature touches 7 existing files, adds 2 new files (query + hook), 1 migration

---

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality & Maintainability | PASS | Named exports, strict TS, `cn()`, `~/` paths, row mappers, no inline queries |
| II. Testing Standards | PASS | Mock + real impl for new query; full optimistic cycle on mutation; `pnpm typecheck` gate |
| III. UX Consistency | PASS | All strings via i18n (en + pl); no new colors invented; shadcn components via CLI only |
| IV. Performance Requirements | PASS | Optimistic update on `useUpdateSelfPlanPermission`; no new deps; no `select('*')` |
| V. Simplicity & Anti-Complexity | PASS | One column, two hooks, prop threading on existing components; no new abstractions |

**Quality Gates Pre-merge**:
1. `pnpm typecheck` exits 0
2. All new strings in both `en/` and `pl/` namespaces
3. `useUpdateSelfPlanPermission` implements full `onMutate`/`onError`/`onSettled` cycle
4. `profiles.ts` exports `mockFetchSelfPlanPermission` and `mockUpdateSelfPlanPermission`
5. No sport colors hardcoded
6. No `supabase.from()` outside `lib/queries/`

---

## Project Structure

### Documentation (this feature)

```text
specs/007-athlete-planning/
├── plan.md              ← this file
├── research.md          ← Phase 0 decisions
├── data-model.md        ← Phase 1 schema + contracts
└── tasks.md             ← Phase 2 output (/speckit.tasks)
```

### Source Code Changes

```text
app/
├── lib/
│   ├── mock-data/
│   │   └── profiles.ts            ← NEW: MOCK_SELF_PLAN map + resetMockProfiles()
│   ├── queries/
│   │   ├── keys.ts                ← ADD: queryKeys.selfPlan.byAthlete()
│   │   └── profiles.ts            ← NEW: fetchSelfPlanPermission + updateSelfPlanPermission
│   └── hooks/
│       └── useProfile.ts          ← NEW: useSelfPlanPermission + useUpdateSelfPlanPermission
├── components/
│   ├── calendar/
│   │   ├── WeekGrid.tsx           ← ADD: showAthleteControls prop (thread to DayColumn)
│   │   ├── DayColumn.tsx          ← ADD: showAthleteControls prop (thread to SessionCard)
│   │   └── SessionCard.tsx        ← ADD: render completion toggle when showAthleteControls
│   ├── coach/
│   │   └── AthletePicker.tsx      ← ADD: "Myself" card first, visually distinct
│   └── settings/
│       └── UserTab.tsx            ← ADD: self-planning toggle for athletes
├── routes/
│   ├── coach/
│   │   ├── layout.tsx             ← ADD: self-plan toggle in athlete banner
│   │   └── week.$weekId.tsx       ← ADD: athlete callbacks + showAthleteControls when viewing self
│   └── athlete/
│       └── week.$weekId.tsx       ← ADD: planning controls + SessionForm when canSelfPlan
└── i18n/
    ├── resources/en/
    │   ├── coach.json             ← ADD: selfPlan.* keys
    │   └── athlete.json           ← ADD: selfPlan.* keys (settings toggle)
    └── resources/pl/
        ├── coach.json             ← ADD: selfPlan.* keys (Polish)
        └── athlete.json           ← ADD: selfPlan.* keys (Polish)

supabase/
└── migrations/
    └── 008_self_plan_permission.sql ← NEW: ALTER TABLE profiles ADD COLUMN can_self_plan
```

---

## Implementation Phases

### Phase A — Data Layer (do first, unblocks everything)

**A1. Migration**
- `supabase/migrations/008_self_plan_permission.sql`
- `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS can_self_plan boolean NOT NULL DEFAULT true;`
- RLS policy: athlete updates own row; coach updates athlete rows in their `coach_athletes`

**A2. Mock data**
- `app/lib/mock-data/profiles.ts`
- `MOCK_SELF_PLAN = new Map<string, boolean>()` seeded with `true` for `athlete-1` and `athlete-2`
- `resetMockProfiles()` — clears and re-seeds; export for test `beforeEach`

**A3. Query file**
- `app/lib/queries/profiles.ts`
- `fetchSelfPlanPermission(athleteId)` — mock + real
- `updateSelfPlanPermission(athleteId, value)` — mock + real
- Row mapper: `toBoolean(row)` reading `row.can_self_plan`
- `select('id, can_self_plan')` — no wildcards

**A4. Query key**
- `app/lib/queries/keys.ts`
- Add `selfPlan: { byAthlete: (id: string) => ['selfPlan', id] as const }`

**A5. Hooks**
- `app/lib/hooks/useProfile.ts`
- `useSelfPlanPermission(athleteId: string)` — `useQuery`, `enabled: !!athleteId`
- `useUpdateSelfPlanPermission()` — `useMutation` with full optimistic cycle

---

### Phase B — Coach "Myself" Entry (self-contained, no data layer deps)

**B1. AthletePicker — "Myself" card**
- Read `user` from `useAuth()` in addition to `athletes`
- Render a distinct card at the very top before the athletes list:
  - Label: `t('athletePicker.myself')` (new i18n key)
  - Visual treatment: `border-primary bg-primary/5` or equivalent using existing tokens
  - Badge: small "You" pill using `text-primary` — no new colors
  - On click: `selectAthlete(user.id)`
- The card renders regardless of whether `athletes` is empty (coach always sees themselves)

**B2. Coach layout banner — self indicator**
- When `selectedAthleteId === user.id`, the banner shows "My plan" (or `t('myPlan')`) instead of "Managing [Name]"
- No switch button shown (they're already viewing themselves)
- Add `t('coach.myPlan')` key to both locales

**B3. i18n additions for coach**
```json
// en/coach.json
"athletePicker.myself": "Myself",
"athletePicker.myselfBadge": "You",
"myPlan": "My training plan",
"selfPlan.label": "Allow self-planning",
"selfPlan.hint": "Athlete can add and edit their own sessions"
```

---

### Phase C — Self-Plan Toggle Surfaces

**C1. Coach toggle in athlete banner (`coach/layout.tsx`)**
- When `selectedAthleteId !== null && selectedAthleteId !== user.id`:
  - Call `useSelfPlanPermission(selectedAthleteId)` and `useUpdateSelfPlanPermission()`
  - Add a compact toggle (shadcn `Switch`) with label `t('selfPlan.label')` inline in the banner
  - On change: call `updateSelfPlan.mutate({ athleteId: selectedAthleteId, value: !current })`

**C2. Athlete toggle in UserTab (`settings/UserTab.tsx`)**
- When `user.role === 'athlete'`:
  - Call `useSelfPlanPermission(user.id)` and `useUpdateSelfPlanPermission()`
  - Add a section below profile fields: toggle with label + hint text
  - `t('athlete.selfPlan.label')` and `t('athlete.selfPlan.hint')` keys

**C3. i18n additions for athlete**
```json
// en/athlete.json (and pl equivalent)
"selfPlan.label": "Self-planning",
"selfPlan.hint": "Plan your own training sessions"
```

---

### Phase D — Athlete Week View with Planning Controls

**D1. `athlete/week.$weekId.tsx`**
- Add `const canSelfPlan = useSelfPlanPermission(user?.id ?? '').data ?? false`
- When `canSelfPlan`:
  - Import and call `useGetOrCreateWeekPlan`, `useCreateSession`, `useUpdateSession`, `useDeleteSession`
  - Manage `formOpen`, `formDay`, `editingSession` state (same pattern as coach week view)
  - Pass planning callbacks to `WeekGrid`
  - Render `<SessionForm>` at the bottom
- When `!weekPlan && canSelfPlan`: auto-create the week plan on first access (same `useEffect` guard as coach)
- When `!weekPlan && !canSelfPlan`: existing "no plan" empty state unchanged

**D2. `WeekGrid`, `DayColumn`, `SessionCard` — `showAthleteControls` prop**
- `WeekGrid`: add `showAthleteControls?: boolean = false`, thread to `DayColumn`
- `DayColumn`: thread to `SessionCard`
- `SessionCard`: when `showAthleteControls`, render `CompletionToggle` + `AthleteFeedback` + `PerformanceEntry` (currently only rendered when `athleteMode`)
- This replaces the `athleteMode` check for athlete controls in `SessionCard` — keep `athleteMode` for hiding edit/delete; use `showAthleteControls` for showing completion/notes

---

### Phase E — Coach Self-View (Dual Controls)

**E1. `coach/week.$weekId.tsx`**
- Add `const { user } = useAuth()`
- Add `const isViewingSelf = effectiveAthleteId === user?.id`
- When `isViewingSelf`:
  - Call `useUpdateAthleteSession()` (already exists)
  - Define `handleToggleComplete`, `handleUpdateNotes`, `handleUpdatePerformance` (same pattern as athlete week view)
  - Pass `showAthleteControls={isViewingSelf}` + athlete callbacks to `WeekGrid`

---

## Vitest Coverage Scope

### New tests to write

**Unit** (`app/test/unit/`):
- `profiles.test.ts`
  - `fetchSelfPlanPermission` returns `true` for unseeded athlete (default)
  - `updateSelfPlanPermission` persists value; subsequent fetch returns updated value
  - `resetMockProfiles` resets to all-false

**Integration** (`app/test/integration/`):
- `useSelfPlanPermission.test.ts`
  - Hook returns `false` for new athlete
  - Mutation updates cache optimistically; rolls back on error; invalidates on settled
- `AthletePicker.test.ts`
  - Renders "Myself" card before athlete cards
  - Clicking "Myself" calls `selectAthlete(user.id)`
- `AthleteWeekView.selfplan.test.ts`
  - When `canSelfPlan = false`: no add-session button visible
  - When `canSelfPlan = true`: add-session button visible; SessionForm renders on click

### Existing tests — no changes expected
`useSessions`, `useWeekPlan`, `SessionForm`, invite tests — no modifications to those paths.

---

## Complexity Tracking

No constitution violations. All additions are minimal extensions of existing patterns.
