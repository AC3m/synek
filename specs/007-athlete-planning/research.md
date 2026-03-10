# Research: Athlete Self-Planning & Coach Personal Profile

**Branch**: `007-athlete-planning` | **Phase**: 0

---

## Decision 1: Self-Planning Permission Storage

**Decision**: Add a `can_self_plan: boolean` column to the existing `profiles` table (DEFAULT true).

**Rationale**: The permission is a single shared flag per athlete — no relationship table needed. Profiles already carries per-user settings (`avatar_url`, `role`). One column addition via migration is the minimal change.

**Alternatives considered**:
- Separate `athlete_settings` table: unnecessary indirection for one boolean.
- Field on `coach_athletes` (per-relationship): rejected because athletes can also set it themselves — it's not scoped to a coach-athlete pair.
- LocalStorage: rejected because the spec requires it to persist across devices and be visible to both coach and athlete.

---

## Decision 2: Coach "Myself" Entry in Athlete Picker

**Decision**: Render the coach's own card at the top of `AthletePicker` directly from the `user` object in auth context — no changes to `MockAthlete` type or `getAthletesForCoach()`. The coach's own ID is passed to `selectAthlete()` like any athlete.

**Rationale**: `getAthletesForCoach` intentionally doesn't include the coach themselves — that's correct. The picker can compose this from the `user` object already available in context. Zero changes to data layer.

**Alternatives considered**:
- Add `isSelf` flag to `MockAthlete` and include coach in `getAthletesForCoach` return value: adds complexity and forces callers to filter the self-entry out in other places.
- Separate route/entrypoint for coach's own plan: over-engineering; the picker already handles navigation.

---

## Decision 3: Coach Week View When Viewing Self (Dual Controls)

**Decision**: Add a `showAthleteControls?: boolean` prop to `WeekGrid` (and down through `DayColumn`). When true, renders completion toggle + athlete notes + performance entry alongside planning controls. In coach week view, pass `showAthleteControls={effectiveAthleteId === user.id}`.

**Rationale**: `WeekGrid` already accepts all callbacks for both modes. The `athleteMode` prop was never intended as the sole gate for athlete controls — it was a shortcut. A dedicated prop cleanly separates the concern. No new components needed.

**Alternatives considered**:
- Create a separate `CoachSelfWeekView` route: duplicates nearly all of coach week view logic — YAGNI.
- Reuse `athleteMode` to mean "also show athlete controls": changes existing semantics; `athleteMode` currently also hides edit/delete buttons, which we do NOT want when coach is viewing self.

---

## Decision 4: Athlete Week View with Self-Planning

**Decision**: When `canSelfPlan` is true, the athlete week view renders planning controls (add/edit/delete via `SessionForm`) and uses `useGetOrCreateWeekPlan` to auto-create the plan on first access — identical behaviour to the coach week view.

**Rationale**: Reusing the same hooks and `SessionForm` component avoids duplicating planning logic. The flag is read from `useSelfPlanPermission(user.id)`.

**Alternatives considered**:
- Merge athlete and coach week views into one component: too large a refactor, not required by this feature.
- Show a "Request planning access" CTA instead of a toggle in settings: adds friction; the spec says the athlete should be able to enable it themselves directly.

---

## Decision 5: Coach Toggle Location

**Decision**: Place the self-plan toggle in the athlete context banner in `coach/layout.tsx` — inline with "Managing [Name]".

**Rationale**: Most contextual; the coach is already scoped to the athlete. No navigation required. Matches FR-005 ("without navigating to a separate settings area").

**Alternatives considered**:
- AthletesTab in settings: requires navigating away; violates FR-005.
- Inside coach week view header: hidden when on non-week pages.

---

## Decision 6: Mock Data for Self-Planning

**Decision**: Use an in-memory `Map<string, boolean>` keyed by `athleteId` in `app/lib/mock-data/profiles.ts` with a `resetMockProfiles()` function. Default `false` for all athletes.

**Rationale**: Follows the existing pattern in `sessions.ts` and `weeks.ts`. `resetMockProfiles()` called in `beforeEach` in tests prevents state bleed.

---

## Decision 7: Vitest Coverage Scope

**Decision**: Cover the following with unit/integration tests:
- `fetchSelfPlanPermission` and `updateSelfPlanPermission` (unit, mock mode)
- `useSelfPlanPermission` + `useUpdateSelfPlanPermission` hooks (integration, React Query wrapper)
- `AthletePicker` — renders "Myself" card first (integration)
- Athlete week view — shows/hides planning controls based on `canSelfPlan` (integration)

**Out of scope for tests** (covered by existing test patterns):
- `WeekGrid`/`DayColumn`/`SessionCard` prop threading — these are already tested via snapshot/render tests.
- Coach week view athlete controls — thin wiring change, tested via manual flow.
