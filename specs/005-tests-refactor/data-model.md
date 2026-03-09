# Data Model: Test Suite, Refactor, Locale & Versioning

**Branch**: `005-tests-refactor` | **Date**: 2026-03-09

---

## Overview

This feature introduces no new database tables or columns. The data model changes are:

1. **Route params**: `locale` added as a URL segment
2. **Version field**: `package.json#version` promoted from `0.0.0` to `0.1.0`
3. **Mock data re-organisation**: no new fixture data; existing mock-data.ts is split into focused modules

---

## Route Param: `locale`

| Property | Value |
|----------|-------|
| Source | URL path segment (`:locale`) |
| Valid values | `'pl'`, `'en'` |
| Default | `'pl'` |
| Persistence | `localStorage.getItem('locale')` for returning users |
| Invalid value behaviour | Redirect to `/pl/<rest-of-path>` |

**Not stored in database.** The locale is a session/URL concern only.

---

## Test Fixture Shape

Tests reuse the existing mock-data layer. No new fixture objects are introduced. The mock data contract (unchanged):

### MockWeekPlan

Already defined in `app/lib/mock-data.ts` (to be split to `app/lib/mock-data/weeks.ts`):

```typescript
{
  id: string,                // e.g. 'week-plan-1'
  weekStart: string,         // e.g. '2026-02-23'
  year: number,
  weekNumber: number,
  athleteId: string,
  loadType: LoadType | null,
  totalPlannedKm: number | null,
  description: string | null,
  coachComments: string | null,
  createdAt: string,
  updatedAt: string,
}
```

### MockTrainingSession

Already defined (to be split to `app/lib/mock-data/sessions.ts`):

```typescript
{
  id: string,
  weekPlanId: string,
  dayOfWeek: DayOfWeek,
  sortOrder: number,
  trainingType: TrainingType,
  description: string | null,
  coachComments: string | null,
  plannedDurationMinutes: number | null,
  plannedDistanceKm: number | null,
  typeSpecificData: TypeSpecificData,
  isCompleted: boolean,
  completedAt: string | null,
  // ... actual performance fields
}
```

---

## Mock Data Module Split

Current: `app/lib/mock-data.ts` (1012 lines, one file)

Target structure:

```
app/lib/mock-data/
├── index.ts          # Re-exports everything; all existing import sites continue to work
├── sessions.ts       # mockFetchSessionsByWeekPlan, mockCreateSession, mockUpdateSession,
│                     # mockDeleteSession, mockUpdateAthleteSession + session fixtures
├── weeks.ts          # mockFetchWeekPlan, mockGetOrCreateWeekPlan, mockUpdateWeekPlan
│                     # + week plan fixtures (keyed by athleteId)
├── profile.ts        # mockFetchProfile, mockUpdateProfile + profile fixtures
└── strava.ts         # mockFetchStravaConnection, mockUpdateStravaToken + strava fixtures
```

**Barrel re-export** in `index.ts` is justified here: it avoids updating every import site (currently all query files import from `~/lib/mock-data`). The barrel is purely a compatibility shim — no new abstraction.

---

## Version Lifecycle

| Event | `package.json` version | `CHANGELOG.md` |
|-------|----------------------|----------------|
| Initial seed (this feature) | `0.1.0` | v0.1.0 entry created manually |
| `fix:` or `refactor:` commit merged to main | patch bump (e.g. `0.1.1`) | Appended by release-it |
| `feat:` commit merged to main | minor bump (e.g. `0.2.0`) | Appended by release-it |
| `BREAKING CHANGE` in commit footer | major bump (e.g. `1.0.0`) | Appended by release-it |

**Git tags** mark each release: `v0.1.0`, `v0.1.1`, etc. Tags are the anchor points for changelog diff ranges.

---

## Row Mapper Exports (for unit tests)

To enable unit testing of row mappers without calling full query functions, the mapper functions must be exported:

| File | Current | Change |
|------|---------|--------|
| `app/lib/queries/sessions.ts` | `function toSession(row)` (unexported) | `export function toSession(row)` |
| `app/lib/queries/weeks.ts` | `function toWeekPlan(row)` (unexported) | `export function toWeekPlan(row)` |

This is the minimal change needed. Exporting the mapper does not change runtime behaviour; it only enables test isolation.
