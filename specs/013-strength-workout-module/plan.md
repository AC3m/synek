# Implementation Plan: Strength Workout Module

**Branch**: `013-strength-workout-module` | **Date**: 2026-03-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/013-strength-workout-module/spec.md`

## Summary

Add a Strength Workout Module that lets coaches and athletes define reusable strength workout variants (named templates of ordered exercises with sets × reps ranges), link variants to strength training sessions, auto-fill sessions from the athlete's most recent performance (with provenance date label and delta indicators), log actual reps/load/progression intent per exercise, and view per-variant load progression dashboards (stat cards + chart + history table). Requires 3 new DB tables + 1 RPC (returning `last_session_date` for provenance), a new `app/components/strength/` directory with 5 new components, extensions to the existing `StrengthFields` and `SessionDetailModal`, 4 new routes, and a recharts-backed shadcn chart component (lazy-loaded on the Progress tab).

**UX review applied 2026-03-21**: Spec updated with progressive disclosure patterns, provenance labels on pre-fill, delta indicators in the session logger, stat cards above chart, exercise filter pills, sticky table headers, contextual empty states, touch-target minimums, and keyboard navigation guarantees. See spec.md UX Design Principles section.

## Technical Context

**Language/Version**: TypeScript 5 (strict)
**Primary Dependencies**: React 19, React Router 7 (SPA), TanStack Query 5, Supabase JS 2, shadcn/ui (New York), i18next, Zod 4, date-fns 4; + `recharts` via `shadcn add chart` (~50 KB gzipped, lazy-loaded in progress tab)
**Storage**: PostgreSQL via Supabase — 3 new tables (`strength_variants`, `strength_variant_exercises`, `strength_session_exercises`) + 1 RPC (`get_last_session_exercises`) in migration 022
**Testing**: Vitest 4, @testing-library/react 16 (existing)
**Target Platform**: Web SPA, desktop-primary (same as rest of app)
**Project Type**: Web SPA (React, `ssr: false`)
**Performance Goals**: Variant list loads < 500ms; pre-fill populates within one query round-trip; progress chart lazy-loaded (no TTI impact)
**Constraints**: `recharts` bundle ~50 KB gzipped — at constitutional limit, justified and documented; lazy-loaded so initial load unaffected. No other new dependencies.
**Scale/Scope**: Typical coach manages ≤ 20 variants; each variant has ≤ 10 exercises; progress chart spans ≤ 52 data points per exercise per year

## Constitution Check

*GATE: Must pass before implementation. Re-checked after Phase 1 design.*

| Principle | Gate | Status |
|-----------|------|--------|
| **I. Code Quality** | Named exports, `cn()`, `~/` imports, row mappers (snake→camel), no inline queries, props interfaces with `className?` | ✅ All new query functions go in `lib/queries/strength-variants.ts`; row mappers `toStrengthVariant`, `toStrengthVariantExercise`, `toStrengthSessionExercise`; all components follow conventions |
| **II. Testing Standards** | Mock implementations for all query functions; full optimistic-update cycle on all mutations; `pnpm typecheck` gate | ✅ `app/lib/mock-data/strength-variants.ts` with `resetMockStrengthVariants()`; all 5+ mutations implement `onMutate/onError/onSettled`; typecheck run at each phase |
| **III. UX Consistency** | Sport colors from `training-types.ts`, all strings via i18next (EN+PL), shadcn components via CLI | ✅ Strength uses existing `orange-700/bg-orange-100` token; all new strings in both locales; `pnpm dlx shadcn@latest add chart` for recharts wrapper |
| **IV. Performance** | New bundle impact documented; optimistic updates; lazy-loaded chart | ✅ `recharts` ~50 KB gzipped documented here; chart component lazy-loaded via `React.lazy` on the Progress tab; all mutations use optimistic updates |
| **V. Simplicity** | No `useEffect` for data; no premature abstractions; YAGNI | ✅ All data fetching via React Query hooks; exercise reorder uses up/down buttons (not DnD library) to avoid extra dependency; no shared route complexity |

**Post-design re-check**: All gates confirmed. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/013-strength-workout-module/
├── plan.md              ← this file
├── spec.md              ← feature specification
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/
│   └── components.md    ← component + hook + route API contracts
└── tasks.md             ← Phase 2 output (/speckit.tasks — not yet created)
```

### Source Code (repository root)

```text
app/
├── types/
│   └── training.ts                     MODIFIED — add StrengthVariant, StrengthVariantExercise,
│                                                   StrengthSessionExercise, ProgressionIntent,
│                                                   and Input types; extend StrengthData.variantId
├── components/
│   ├── strength/
│   │   │
│   │   │   ── Shared primitives (no dependencies between them) ──────────────────────────
│   │   ├── ProgressionToggle.tsx       NEW — ⬆/↔/⬇ 3-way toggle; used in Logger + ExerciseList
│   │   ├── DeltaIndicator.tsx          NEW — "+2.5 kg" / "−5 kg" / "=" display chip
│   │   ├── StatCard.tsx                NEW — label + value + optional trend chip; 4× in progress view
│   │   ├── StrengthEmptyState.tsx      NEW — Dumbbell icon + heading + body + action; used in library + chart
│   │   │
│   │   │   ── Feature components ───────────────────────────────────────────────────────
│   │   ├── VariantCard.tsx             NEW — memo(); peek expansion via CSS group-hover; no JS toggle
│   │   ├── VariantForm.tsx             NEW — internal memo(ExerciseRow); lazy useState init; hoisted URL_REGEX
│   │   ├── VariantPicker.tsx           NEW — responsive (Sheet mobile / Popover desktop); derived isMobile state
│   │   ├── VariantExerciseList.tsx     NEW — provenance header + Accept all; uses ProgressionToggle
│   │   ├── SessionExerciseLogger.tsx   NEW — sticky headers hoisted as const; uses DeltaIndicator + ProgressionToggle
│   │   │
│   │   │   ── Progress dashboard sub-components (composed by ExerciseProgressChart) ────
│   │   ├── StrengthStatCards.tsx       NEW — stat cards row (4× StatCard); single-pass useMemo derivation
│   │   ├── ExerciseFilterPills.tsx     NEW — horizontal scrollable pill filter row
│   │   ├── ProgressLineChart.tsx       NEW — recharts LineChart with ReferenceDots; index-map for chart data
│   │   ├── SessionHistoryTable.tsx     NEW — sortable history table; index-map for grouping by session
│   │   └── ExerciseProgressChart.tsx  NEW — lazy-loaded container; composes above 4 sub-components
│   └── training/
│       ├── type-fields/
│       │   └── StrengthFields.tsx      MODIFIED — add variant selector + conditional pre-fill
│       └── SessionDetailModal.tsx      MODIFIED — render SessionExerciseLogger for variant sessions
├── lib/
│   ├── queries/
│   │   ├── strength-variants.ts        NEW — all CRUD + pre-fill + progress queries (real + mock)
│   │   └── keys.ts                     MODIFIED — add strengthVariantKeys factory
│   ├── hooks/
│   │   └── useStrengthVariants.ts      NEW — all React Query hooks with optimistic updates
│   └── mock-data/
│       └── strength-variants.ts        NEW — seed data + resetMockStrengthVariants()
├── routes/
│   ├── coach/
│   │   ├── strength.tsx                NEW — coach variant library page
│   │   └── strength.$variantId.tsx    NEW — coach variant detail (Edit + Progress tabs)
│   └── athlete/
│       ├── strength.tsx                NEW — athlete variant library (CRUD if can_self_plan)
│       └── strength.$variantId.tsx    NEW — athlete variant detail (progress view)
└── i18n/
    └── resources/
        ├── en/training.json            MODIFIED — new strength.variant.*, strength.progression.*,
        │                                           strength.analysis.*, strength.empty.* keys
        └── pl/training.json            MODIFIED — Polish equivalents of all new keys

supabase/
└── migrations/
    └── 022_strength_variants.sql       NEW — 3 tables, RLS, RPC, trigger

app/routes.ts                           MODIFIED — register 4 new routes
```

**Structure Decision**: Single-project web app. New `app/components/strength/` directory isolates strength-specific components. Follows existing `app/components/calendar/` and `app/components/training/` pattern. No new package beyond recharts (Phase F, lazy-loaded).

## React Best Practices (applied throughout)

*Review applied 2026-03-21. All rules reference the `/react-best-practices` skill guidelines.*

### CRITICAL — Bundle Discipline

**Direct imports everywhere** (barrel-imports rule, 200–800 ms import cost):
```typescript
// ❌ Never — loads entire lucide-react barrel
import { Dumbbell, Plus, Trash2, ArrowUp } from 'lucide-react'

// ✅ Always — loads only what is needed
import Dumbbell from 'lucide-react/dist/esm/icons/dumbbell'
import Plus     from 'lucide-react/dist/esm/icons/plus'
import Trash2   from 'lucide-react/dist/esm/icons/trash-2'
import ArrowUp  from 'lucide-react/dist/esm/icons/arrow-up'

// ✅ date-fns — direct module imports
import { format }              from 'date-fns/format'
import { parseISO }            from 'date-fns/parseISO'
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow'
```

This rule applies to **every new file** in the strength module. Checked in the Polish phase (T043).

**Lazy-load chart on demand** (bundle-dynamic-imports rule): `ExerciseProgressChart` is the only consumer of recharts. It MUST be wrapped in `React.lazy` at the route level so recharts is never in the initial bundle.

### MEDIUM — Re-render Optimisation

**Memoize stable components:**
- `VariantCard` → `export const VariantCard = memo(function VariantCard(...) { ... })` — library can render 20+ cards; memoisation prevents all from re-rendering on parent state change
- `ExerciseRow` (internal to `VariantForm`) → `const ExerciseRow = memo(function ExerciseRow(...) { ... })` — editing one row must not re-render all other rows
- Shared primitives (`StatCard`, `DeltaIndicator`, `ProgressionToggle`) → all `memo()` — they are leaf nodes rendered many times

**Lazy state initialisation** (rerender-lazy-state-init rule): in `VariantForm`, the exercise list state MUST use the function form:
```typescript
// ❌ Runs convertToFormExercises() on every render
const [exercises, setExercises] = useState(convertToFormExercises(initial?.exercises ?? []))

// ✅ Runs only once
const [exercises, setExercises] = useState(() => convertToFormExercises(initial?.exercises ?? []))
```

**Hoist static JSX constants** (rendering-hoist-jsx rule): elements that never change must live outside the component function:
```typescript
// In SessionExerciseLogger.tsx — column headers never change
const TABLE_HEADERS = (
  <div className="grid grid-cols-[2fr_1fr_1fr_1fr] sticky top-0 bg-background ...">
    ...
  </div>
)

// In strength library route — empty state never changes structure
const LIBRARY_EMPTY_STATE = <StrengthEmptyState ... />
```

### MEDIUM — Data Processing

**Index maps for repeated lookups** (js-index-maps rule): in `StrengthStatCards` and `ProgressLineChart`, logs are a flat array that must be grouped/looked up by `exerciseId`. Use a single `useMemo` pass to build the index rather than `.find()` per render:
```typescript
const logsByExercise = useMemo(
  () => logs.reduce<Record<string, ProgressLog[]>>((acc, log) => {
    (acc[log.exerciseId] ??= []).push(log)
    return acc
  }, {}),
  [logs]
)
```

**Single-pass stat derivation** (js-combine-iterations rule): all 4 stat card values (session count, best load, last session date, volume trend) are derived from the same `logs` array. Compute them all in ONE `useMemo` call, not four separate `.reduce()` / `.filter()` chains:
```typescript
const stats = useMemo(() => {
  let sessionCount = 0, bestLoad = 0, lastDate = '', totalVols: number[] = []
  for (const log of logs) {
    sessionCount++
    if (log.loadKg > bestLoad) bestLoad = log.loadKg
    if (log.sessionDate > lastDate) lastDate = log.sessionDate
    // ...
  }
  return { sessionCount, bestLoad, lastDate, trend: deriveTrend(totalVols) }
}, [logs])
```

**Hoist module-level constants**: URL validation regex in `VariantForm` MUST be a module-level constant (js-hoist-regexp rule):
```typescript
// ✅ At module level, not inside component or render
const VIDEO_URL_REGEX = /^https?:\/\/.+/
```

### Architecture — Decomposition Rationale

`ExerciseProgressChart` in the original plan was a single 200+ line component. The React best practices decomposition into 4 sub-components (`StrengthStatCards`, `ExerciseFilterPills`, `ProgressLineChart`, `SessionHistoryTable`) achieves:
1. Each sub-component can be memoised independently — filtering pills don't cause stat cards to re-render
2. The heavy recharts code is isolated in `ProgressLineChart` — code-split boundary is cleaner
3. Each component has a single responsibility and is independently readable
4. The table sort state in `SessionHistoryTable` is local; toggling it doesn't re-render the chart

Similarly, `ProgressionToggle`, `DeltaIndicator`, and `StatCard` are extracted as shared primitives because they appear in multiple components and are stable enough to memoize reliably.

---

## Implementation Phases

### Phase A — Database (migration 022)

1. Write `supabase/migrations/022_strength_variants.sql`:
   - Create `strength_variants`, `strength_variant_exercises`, `strength_session_exercises` tables
   - RLS policies: variant owner full access; athlete reads/writes their own session exercises; coach reads athlete session exercises
   - `updated_at` trigger on `strength_variants`
   - `get_last_session_exercises(p_athlete_id, p_exercise_ids)` RPC using `DISTINCT ON`
2. Apply: `supabase db push` or `supabase migration up`

### Phase B — Types & Query Layer

1. Extend `app/types/training.ts` — all new types and input types per data-model.md; add `variantId?: string` to `StrengthData`
2. Add `strengthVariantKeys` to `app/lib/queries/keys.ts`
3. Create `app/lib/mock-data/strength-variants.ts` with 2 seed variants (3–4 exercises each) + `resetMockStrengthVariants()`
4. Create `app/lib/queries/strength-variants.ts` — real + mock implementations for:
   - `fetchStrengthVariants(userId)`, `fetchStrengthVariant(id)`
   - `createStrengthVariant`, `updateStrengthVariant`, `deleteStrengthVariant`
   - `upsertVariantExercises` (batch insert/update/delete for exercise list)
   - `fetchLastSessionExercises(athleteId, exerciseIds)` — calls RPC
   - `fetchStrengthSessionExercises(sessionId)`, `upsertSessionExercises`
   - `fetchVariantProgressLogs(variantId, athleteId)` — for chart data
5. Create `app/lib/hooks/useStrengthVariants.ts` with all hooks

```bash
pnpm typecheck   # gate: must pass
```

### Phase C — i18n Keys

Add to both `en/training.json` and `pl/training.json` (simultaneously):

```json
{
  "strength": {
    "variant": {
      "library": "Strength Library",
      "new": "New Variant",
      "edit": "Edit Variant",
      "delete": "Delete Variant",
      "deleteConfirm": "Delete this variant? Historical session data will be preserved.",
      "name": "Variant Name",
      "description": "Description",
      "exerciseCount": "{{count}} exercise",
      "exerciseCount_other": "{{count}} exercises",
      "detachVariant": "Detach variant",
      "selectVariant": "Select a variant",
      "noVariants": "No variants yet"
    },
    "progression": {
      "up": "Increase",
      "maintain": "Maintain",
      "down": "Reduce",
      "hint": "Next session intent"
    },
    "analysis": {
      "progress": "Progress",
      "loadOverTime": "Load over time",
      "date": "Date",
      "load": "Load (kg)",
      "reps": "Reps",
      "noData": "Log at least 2 sessions to track progress"
    },
    "empty": {
      "noVariants": "No strength variants yet. Create one to start tracking your lifts.",
      "noHistory": "No completed sessions for this variant yet."
    }
  }
}
```

### Phase D — Shared Primitives (build first — no dependencies)

1. `app/components/strength/ProgressionToggle.tsx` — `memo()`; ⬆/↔/⬇ 3-button toggle; `value: ProgressionIntent | null`, `onChange`, `readOnly`, `className?`; all aria-labels; used in Logger and ExerciseList
2. `app/components/strength/DeltaIndicator.tsx` — `memo()`; receives `current: number | null`, `baseline: number | null`; renders "+X kg" green / "−X kg" amber / "=" muted; no state
3. `app/components/strength/StatCard.tsx` — `memo()`; receives `label`, `value: ReactNode`, `trend?: 'up'|'flat'|'down'`; purely presentational
4. `app/components/strength/StrengthEmptyState.tsx` — `memo()`; receives `heading`, `body`, `actionLabel`, `onAction`; Dumbbell icon + text; used in library page and progress chart

### Phase E — Feature Components

5. `app/components/strength/VariantCard.tsx` — `memo()`; peek expansion via CSS `group-hover/max-height` (no JS); direct lucide imports; smart delete based on `sessionCount`
6. `app/components/strength/VariantForm.tsx` — internal `memo(ExerciseRow)`; lazy `useState(() => ...)` for exercise list; hoisted `VIDEO_URL_REGEX` module-level constant; direct lucide imports
7. `app/components/strength/VariantPicker.tsx` — responsive Sheet/Popover; uses `useIsMobile()` derived boolean
8. `app/components/strength/VariantExerciseList.tsx` — uses `<ProgressionToggle readOnly>` for badges
9. `app/components/strength/SessionExerciseLogger.tsx` — `TABLE_HEADERS` hoisted as module-level JSX constant; uses `<DeltaIndicator>` and `<ProgressionToggle>`; `tabIndex` sequential
10. Modify `app/components/training/type-fields/StrengthFields.tsx` — two-mode interface with `<VariantPicker>` + `<VariantExerciseList>`
11. Modify `app/components/training/SessionDetailModal.tsx` — renders `<SessionExerciseLogger>` for variant-linked strength sessions

### Phase F — Progress Dashboard Sub-components

12. `app/components/strength/StrengthStatCards.tsx` — uses `<StatCard>`; derives all 4 stats in ONE `useMemo` pass over logs (js-combine-iterations)
13. `app/components/strength/ExerciseFilterPills.tsx` — `memo()`; horizontal scrollable pill row; local state for active set
14. `app/components/strength/ProgressLineChart.tsx` — recharts `<LineChart>`; builds `logsByExercise` index map via `useMemo` (js-index-maps); `<ReferenceDot>` markers; custom tooltip
15. `app/components/strength/SessionHistoryTable.tsx` — sortable table; local sort state via `useState`; groups rows by session date via `useMemo` index map
16. `app/components/strength/ExerciseProgressChart.tsx` — lazy-loaded container composing sub-components above; `<StrengthEmptyState>` when < 2 sessions

```bash
pnpm typecheck
```

### Phase E — Routes

1. Create `app/routes/coach/strength.tsx` — variant library: list of `<VariantCard>`, "New Variant" button opening `<VariantForm>` in a Dialog
2. Create `app/routes/coach/strength.$variantId.tsx` — Tabs: "Edit" (VariantForm prefilled) + "Progress" (placeholder for Phase F)
3. Create `app/routes/athlete/strength.tsx` — same as coach but mutations gated on `user.role === 'athlete' && profile.can_self_plan`; read-only view for athletes without self-plan permission
4. Create `app/routes/athlete/strength.$variantId.tsx` — Progress tab (read-only) + exercise list
5. Register all 4 routes in `app/routes.ts` under existing coach/athlete layout wrappers

```bash
pnpm typecheck   # generates route types — must pass
```

### Phase F — Analysis Chart (recharts dependency)

1. `pnpm dlx shadcn@latest add chart` — installs shadcn chart component (adds recharts)
2. Create `app/components/strength/ExerciseProgressChart.tsx` — lazy-loaded; uses `ChartContainer`, `LineChart`, `Line`, `XAxis`, `YAxis`, `Tooltip` from shadcn chart; one line per exercise in orange color family; tooltip shows date + reps + load + progression icon
3. Add `React.lazy` + `<Suspense>` wrapper in the Progress tab routes

**Bundle note**: recharts ~50 KB gzipped. Lazy-loaded on Progress tab only — no TTI impact on initial app load. Justified per Principle IV.

### Phase G — Polish & Type Check

1. `pnpm typecheck` — must exit 0
2. Verify: all EN + PL i18n keys complete (no missing translations)
3. Manual smoke test in mock mode:
   - Create variant → add exercises → save → edit → delete exercise → save
   - Link variant to a strength session in coach week view
   - Log session exercises in SessionDetailModal
   - Open next week's session — verify pre-fill from prior session
   - Progress tab: verify chart with ≥ 2 data points
4. Verify no `select('*')` queries (grep check)

## Complexity Tracking

No constitution violations.

| New item | Justification |
|----------|---------------|
| `recharts` via shadcn chart (~50 KB gzipped) | No native browser API or CSS-only approach can deliver an interactive multi-line time-series chart with accessible tooltips and legend. Custom SVG implementation would be complex, fragile, and non-accessible. recharts is the shadcn-endorsed integration; bundle is lazy-loaded so TTI is unaffected. |
| `get_last_session_exercises` RPC | The `DISTINCT ON` query pattern (latest per-exercise in a single round trip) is not expressible via the Supabase JS client directly; an RPC avoids N+1 queries to fetch the last session per exercise. |
| `ON DELETE SET NULL` on `strength_session_exercises.variant_exercise_id` | Historical training data must not be destroyed when an exercise is removed from a variant template — matches constitution's preference for audit-safe FK behavior. |
