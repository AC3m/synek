# Data Model: Athlete Self-Planning & Coach Personal Profile

**Branch**: `007-athlete-planning` | **Phase**: 1

---

## Schema Change

### `profiles` table — new column

| Column | Type | Default | Nullable | Notes |
|--------|------|---------|----------|-------|
| `can_self_plan` | `boolean` | `true` | no | Shared self-planning toggle; writable by the athlete themselves and by their coach |

No new tables. One migration: `supabase/migrations/008_self_plan_permission.sql`.

**RLS rules to add**:
- Athlete can `SELECT` and `UPDATE` their own row's `can_self_plan`.
- Coach can `SELECT` and `UPDATE` `can_self_plan` for any athlete in their `coach_athletes` relationship.

---

## Domain Type Change

### `AuthUser` (no change needed)

The `can_self_plan` flag is **not** embedded in `AuthUser`. It is a per-athlete setting fetched on demand via its own query — not bundled into auth context to keep auth scope minimal.

### `MockAthlete` (no change)

The "Myself" coach card in `AthletePicker` is composed directly from the `AuthUser` object already available in context. No new field needed.

---

## Mock Data

**File**: `app/lib/mock-data/profiles.ts`

```
MOCK_SELF_PLAN: Map<athleteId: string, canSelfPlan: boolean>
  Default: all athletes → true
  Reset: resetMockProfiles() — clears map and re-seeds to all true
```

---

## Query Layer

**File**: `app/lib/queries/profiles.ts`

| Function | Signature | Notes |
|----------|-----------|-------|
| `fetchSelfPlanPermission` | `(athleteId: string) => Promise<boolean>` | Reads `can_self_plan` from `profiles`; falls back to mock store |
| `updateSelfPlanPermission` | `(athleteId: string, value: boolean) => Promise<void>` | Updates `can_self_plan`; writes to mock store in mock mode |

**Query key** (in `app/lib/queries/keys.ts`):
```
queryKeys.selfPlan.byAthlete(athleteId) → ['selfPlan', athleteId]
```

---

## Hook Layer

**File**: `app/lib/hooks/useProfile.ts`

| Hook | Returns | Notes |
|------|---------|-------|
| `useSelfPlanPermission(athleteId)` | `UseQueryResult<boolean>` | `enabled: !!athleteId` |
| `useUpdateSelfPlanPermission()` | `UseMutationResult` | Full optimistic cycle: snapshot → update cache → rollback on error → invalidate on settled |

---

## Component Changes (no new data entities)

| Component | Change | Reason |
|-----------|--------|--------|
| `WeekGrid` | Add `showAthleteControls?: boolean` prop | Enable completion + notes in non-athleteMode contexts (coach viewing self) |
| `DayColumn` | Thread `showAthleteControls` to `SessionCard` | Prop threading |
| `AthletePicker` | Render coach's own card first (from auth context `user`) | "Myself" entry |
| `coach/layout.tsx` | Add self-plan toggle in athlete banner | Coach-side toggle (FR-005) |
| `athlete/week.$weekId.tsx` | Conditionally add planning controls when `canSelfPlan` | Athlete-side planning |
| `settings/UserTab.tsx` | Add self-plan toggle for athletes | Athlete-side toggle (FR-006) |
| `coach/week.$weekId.tsx` | Pass `showAthleteControls` + athlete callbacks when `effectiveAthleteId === user.id` | Coach self-view dual controls |
