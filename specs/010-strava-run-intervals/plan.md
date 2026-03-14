# Implementation Plan: Strava Run Interval Data

**Branch**: `010-strava-run-intervals` | **Date**: 2026-03-14 | **Spec**: [spec.md](spec.md)

## Summary

Add lazy-loaded interval lap data to run session cards that originated from a structured Strava workout (`workout_type = 3`). The session card stays clean — an "Intervals" button appears once laps are loaded. Tapping it opens a modal with a CSS bar chart and a lap-by-lap table (WU / Interval / Recovery / CD) showing duration, distance, pace, and heart rate (or pace zone fallback). Lap data is fetched once via a new `strava-fetch-laps` edge function and persisted in a new `strava_laps` table for instant subsequent loads.

---

## Technical Context

**Language/Version**: TypeScript 5 (strict)
**Primary Dependencies**: React 19, React Router 7 (SPA), TanStack Query 5, Supabase JS 2, shadcn/ui (New York), i18next, Zod 4, date-fns 4
**Storage**: PostgreSQL via Supabase — new `strava_laps` table; `workout_type` column added to `strava_activities`; `secure_training_sessions` view updated
**Testing**: Vitest 4, @testing-library/react 16, jsdom — unit + integration layers
**Target Platform**: Web SPA (desktop + mobile, 375px minimum width)
**Project Type**: Web application (SPA)
**Performance Goals**: Interval button renders with no layout shift; modal opens in <1s for cached data; no new dependencies >50 KB gzipped
**Constraints**: Strava API rate limit (100 req/15 min, 1,000/day); no charting library — custom CSS bar chart only; `pnpm typecheck` must pass; EN + PL translations required
**Scale/Scope**: Per-session feature; one DB row per lap (typically 5–25 rows per interval session)

---

## Constitution Check

*GATE: Must pass before implementation. Re-checked after design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality & Maintainability | ✅ PASS | Named exports, strict TS, `cn()`, `~/` paths, snake→camel mapper (`toLap()`), no direct `supabase.from()` in components |
| II. Testing Standards | ✅ PASS | `mockFetchSessionLaps()` exported; mock auto-activates; `useSessionLaps` mutation follows optimistic pattern where applicable; `pnpm typecheck` gate enforced |
| III. UX Consistency | ✅ PASS | Existing `Dialog` component for modal; existing `Skeleton` component for loading; sport colour tokens for chart; all strings via i18next in both `en/` and `pl/` |
| IV. Performance Requirements | ✅ PASS | No new charting library (custom CSS — 0 KB); optimistic query cache; `Skeleton` prevents layout shift; explicit column selects only |
| V. Simplicity & Anti-Complexity | ✅ PASS | No `useEffect` for data fetching; no premature abstraction; edge function is single-purpose; chart is flex divs, not a library |

**No violations. Complexity tracking table omitted.**

---

## Project Structure

### Documentation (this feature)

```text
specs/010-strava-run-intervals/
├── plan.md              ← this file
├── research.md          ← Phase 0 complete
├── data-model.md        ← Phase 1 complete
├── contracts/
│   └── strava-fetch-laps.md   ← Phase 1 complete
└── tasks.md             ← Phase 2 (/speckit.tasks — not yet created)
```

### Source Code Changes

```text
supabase/
├── migrations/
│   └── 018_strava_laps.sql           ← NEW: strava_laps table + workout_type column + view update
└── functions/
    └── strava-fetch-laps/
        └── index.ts                  ← NEW: edge function

app/
├── types/
│   ├── strava.ts                     ← ADD: StravaLap, StravaLapSegmentType
│   └── training.ts                   ← UPDATE: TrainingSession.stravaWorkoutType
├── lib/
│   ├── queries/
│   │   ├── keys.ts                   ← ADD: sessionLaps key factory
│   │   └── strava-laps.ts            ← NEW: fetchSessionLaps + mockFetchSessionLaps + toLap
│   ├── hooks/
│   │   └── useSessionLaps.ts         ← NEW: useSessionLaps hook
│   └── mock-data/
│       └── strava-laps.ts            ← NEW: mock lap seed data + resetMockLaps()
├── components/
│   ├── calendar/
│   │   └── SessionCard.tsx           ← UPDATE: skeleton + intervals button + confirmation gate
│   └── training/
│       ├── IntervalDetailsModal.tsx  ← NEW: Dialog wrapper
│       ├── IntervalChart.tsx         ← NEW: CSS bar chart
│       └── LapTable.tsx              ← NEW: lap-by-lap table
└── i18n/resources/
    ├── en/training.json              ← ADD: interval keys
    └── pl/training.json              ← ADD: interval keys (Polish)
```

---

## Implementation Phases

### Phase A — Database & Backend

1. **Migration `018_strava_laps.sql`**:
   - Add `workout_type INTEGER` to `strava_activities`; backfill from `raw_data`
   - Create `strava_laps` table with RLS (athlete owns; coach reads confirmed only)
   - Update `secure_training_sessions` view to expose `sa.workout_type AS strava_workout_type`

2. **Update `strava-sync` edge function**:
   - Add `workout_type: activity.workout_type ?? null` to the upsert payload

3. **New `strava-fetch-laps` edge function**:
   - Auth → session ownership check → check `strava_laps` cache → Strava API call → classify → upsert → return
   - See `contracts/strava-fetch-laps.md` for full spec

### Phase B — Types & Data Layer

4. **`app/types/strava.ts`** — add `StravaLap`, `StravaLapSegmentType`

5. **`app/types/training.ts`** — add `stravaWorkoutType: number | null` to `TrainingSession`

6. **`app/lib/queries/sessions.ts`** — add `stravaWorkoutType: row.strava_workout_type as number | null` to `toSession()`

7. **`app/lib/queries/keys.ts`** — add `sessionLaps` key factory

8. **`app/lib/mock-data/strava-laps.ts`** — seed data (3 scenarios: full structured, no laps, auto-laps only) + `resetMockLaps()`

9. **`app/lib/queries/strava-laps.ts`** — `toLap()` mapper, `fetchSessionLaps()`, `mockFetchSessionLaps()`

10. **`app/lib/hooks/useSessionLaps.ts`** — `useSessionLaps(sessionId, enabled)` hook:
    - `enabled` = `!!sessionId && session.stravaWorkoutType === 3 && (isOwner || isConfirmed)`
    - On success: data cached — subsequent renders use cached value, no re-fetch
    - On error: expose `isError` / `refetch` for the retry CTA

### Phase C — UI Components

11. **`app/components/training/IntervalChart.tsx`**:
    - Accepts `laps: StravaLap[]`
    - Renders a flex row of bars, width proportional to `elapsedTimeSeconds`
    - Colours by `segmentType` using existing Tailwind tokens
    - Labels: segment type badge above, pace below

12. **`app/components/training/LapTable.tsx`**:
    - Accepts `laps: StravaLap[]`
    - Renders a table: # / Segment / Duration / Distance / Pace / HR or Zone
    - HR column: `averageHeartrate` if present, else `Z{paceZone}` fallback
    - Omits HR column entirely if no lap has HR or paceZone data
    - Scrollable when >10 laps

13. **`app/components/training/IntervalDetailsModal.tsx`**:
    - shadcn `Dialog` wrapping `IntervalChart` + `LapTable`
    - Accepts `open`, `onOpenChange`, `laps`, `sessionName`
    - All strings via i18next `training` namespace

14. **`app/components/calendar/SessionCard.tsx`** — update:
    - Import `useSessionLaps`; derive `isWorkoutRun = trainingType === 'run' && stravaWorkoutType === 3`
    - When `isWorkoutRun && (isOwner || isConfirmed)`:
      - Loading: render `<Skeleton className="h-6 w-20 rounded-full" />`
      - Error: render retry prompt
      - Success with rest laps: render "Intervals" button
      - Success without rest laps: render nothing
    - Interval button opens `IntervalDetailsModal`
    - Confirmation gate: `isWorkoutRun` affordances only visible after `isStravaConfirmed` for coaches

### Phase D — i18n & Tests

15. **Translation keys** (`training` namespace, EN + PL):
    ```json
    "intervals": {
      "viewButton": "Intervals",
      "modalTitle": "Interval Breakdown",
      "loadError": "Could not load intervals",
      "retry": "Retry",
      "columns": {
        "segment": "Segment",
        "duration": "Duration",
        "distance": "Distance",
        "pace": "Pace",
        "heartRate": "Heart Rate"
      },
      "segments": {
        "warmup": "WU",
        "interval": "Interval",
        "recovery": "Rec",
        "cooldown": "CD"
      }
    }
    ```

16. **Tests**:
    - Unit: `toLap()` mapper, `classifyLaps()` logic (name-based and heuristic paths)
    - Integration: `SessionCard` renders skeleton → button → modal open; retry prompt on error; no affordance on non-workout sessions

---

## Key Design Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Chart library | None — custom CSS | recharts ~70 KB gzipped > 50 KB constitution threshold; simple bars don't need a library |
| Fetch timing | Lazy (first view) | Preserves Strava API budget; avoids rate limit at sync time |
| Persistence | `strava_laps` table | Typed columns, clean RLS, standard query pattern — not JSONB |
| WU/CD detection | Name-first + position fallback | Device names are authoritative; heuristic covers unlabelled devices |
| `workout_type` exposure | New column on `strava_activities` + view | Indexed, clean SQL, no JSONB operators in the hot query path |
| Modal pattern | shadcn `Dialog` | Already used in codebase (DeleteAccountDialog, SessionForm) |
