# Tasks: Strength Workout Module

**Input**: Design documents from `/specs/013-strength-workout-module/`
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/components.md ✅ quickstart.md ✅

**Tests**: Not explicitly requested — `pnpm typecheck` is the quality gate per constitution.
**React Best Practices applied**: 2026-03-21 — see plan.md "React Best Practices" section.

**Organization**: Tasks grouped by phase. User story label ([USN]) present on all story-phase tasks.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no unresolved dependencies)
- **[Story]**: User story ownership (US1–US4)
- Paths are repo-relative from the project root

---

## Phase 1: Setup (Types, Migration, Seed Data)

**Purpose**: DB schema + TypeScript types + mock seed data. ALL later phases depend on this.

- [X] T001 Write Supabase migration `supabase/migrations/022_strength_variants.sql` — create tables `strength_variants` (id, user_id FK→profiles CASCADE, name, description, created_at, updated_at), `strength_variant_exercises` (id, variant_id FK→strength_variants CASCADE, name, video_url, sets, reps_min, reps_max, sort_order, created_at), `strength_session_exercises` (id, session_id FK→training_sessions CASCADE, variant_exercise_id FK→strength_variant_exercises **SET NULL**, actual_reps, load_kg numeric(6,2), progression CHECK('up','maintain','down'), notes, sort_order, created_at); RLS: variants owner-only (`user_id = auth.uid()`), exercises readable/writable by variant owner via join, session exercises: athlete writes own + coach reads athlete's; `updated_at` trigger on `strength_variants`; RPC `get_last_session_exercises(p_athlete_id uuid, p_exercise_ids uuid[])` using `DISTINCT ON (variant_exercise_id)` also returning `last_session_date` (window `MAX(completed_at)`) per data-model.md

- [X] T002 [P] Extend `app/types/training.ts` — add `variantId?: string` to `StrengthData`; add types `StrengthVariantExercise`, `StrengthVariant`, `ProgressionIntent` (`'up' | 'maintain' | 'down'`), `StrengthSessionExercise`; add input types `CreateStrengthVariantInput`, `UpdateStrengthVariantInput`, `UpsertVariantExercisesInput`, `UpsertSessionExercisesInput`; add `ProgressLog` type for chart data per data-model.md

- [X] T003 [P] Add `strengthVariantKeys` factory to `app/lib/queries/keys.ts` — keys: `all`, `byId(id)`, `exercises(variantId)`, `sessionExercises(sessionId)`, `lastSession(athleteId, exerciseIds)`, `progressLogs(variantId, athleteId)`

- [X] T004 Create `app/lib/mock-data/strength-variants.ts` — 2 seed `StrengthVariant` objects ("Push Day A": Bench Press 3×8–12, OHP 3×6–10, Tricep Dips 3×10–15; "Pull Day B": Pull-ups 3×6–10, Barbell Row 3×8–12, Bicep Curl 3×10–15); `Map<string, StrengthVariant>` store; `resetMockStrengthVariants()` using `structuredClone` deep clone per CLAUDE.md anti-pattern rules; seed `StrengthSessionExercise` entries for one "completed" mock session per variant (provides data for pre-fill tests)

**Checkpoint**: Run `pnpm typecheck` — must pass before Phase 2.

---

## Phase 2: Foundational (Query & Hook Layer)

**Purpose**: Complete data layer from Supabase to React Query hooks. Every component depends on this layer.

**⚠️ CRITICAL**: No component work until this phase passes `pnpm typecheck`.

- [X] T005 Create `app/lib/queries/strength-variants.ts` — real Supabase query functions with explicit column lists (no `select('*')`): `fetchStrengthVariants(userId)`, `fetchStrengthVariant(id)` (with exercises via join); `createStrengthVariant`, `updateStrengthVariant`, `deleteStrengthVariant`; row mappers `toStrengthVariant(row)` and `toStrengthVariantExercise(row)` mapping snake_case → camelCase per CLAUDE.md; `isMockMode` guard at top of each function for early-exit to mock

- [X] T006 [P] Add mock implementations in `app/lib/queries/strength-variants.ts` — `mockFetchStrengthVariants`, `mockFetchStrengthVariant`, `mockCreateStrengthVariant`, `mockUpdateStrengthVariant`, `mockDeleteStrengthVariant`; all use `delay()` from `_shared.ts`

- [X] T007 [P] Add variant exercise + session exercise query functions to `app/lib/queries/strength-variants.ts`: `upsertVariantExercises(input)` (batch: delete removed IDs, upsert remainder in sort_order); `fetchStrengthSessionExercises(sessionId)`; `upsertSessionExercises(input)`; `fetchLastSessionExercises(athleteId, exerciseIds)` calling the `get_last_session_exercises` RPC — returns `{ data: Record<string, StrengthSessionExercise>; date: string | null }` (the `last_session_date` from RPC); `fetchVariantProgressLogs(variantId, athleteId)`; mock variants for all four; row mapper `toStrengthSessionExercise(row)`

- [X] T008 Create `app/lib/hooks/useStrengthVariants.ts` — all React Query hooks with full optimistic-update cycle per CLAUDE.md pattern (`onMutate` cancel+snapshot → `onError` rollback → `onSettled` invalidate):
  - `useStrengthVariants(userId)`, `useStrengthVariant(id)` — read hooks
  - `useCreateStrengthVariant()`, `useUpdateStrengthVariant()`, `useDeleteStrengthVariant()` — optimistic variants list updates
  - `useUpsertVariantExercises()` — optimistic exercises update on `byId` cache
  - `useStrengthSessionExercises(sessionId)`, `useUpsertSessionExercises()` — session logging
  - `useLastSessionExercises(athleteId, exerciseIds)` → `UseQueryResult<{ data: Record<string, StrengthSessionExercise>; date: string | null }>` — `enabled: athleteId.length > 0 && exerciseIds.length > 0`
  - `useVariantProgressLogs(variantId, athleteId)` — for chart; `enabled: !!variantId && !!athleteId`

**Checkpoint**: Run `pnpm typecheck` — must pass. All hooks work in mock mode without UI.

---

## Phase 3: Shared UI Primitives

**Purpose**: Small, focused, reusable components that multiple feature components depend on. Build before the feature components that consume them. All are `memo()`-wrapped leaf nodes.

- [X] T009 [P] Create `app/components/strength/ProgressionToggle.tsx` — named `memo()` export; props: `value: ProgressionIntent | null`, `onChange: (v: ProgressionIntent | null) => void`, `readOnly?: boolean`, `className?: string`; renders 3 buttons (⬆/↔/⬇), each ≥ 48×44 px; active state: `bg-orange-600 text-white`; inactive: `variant="outline"`; in `readOnly` mode renders as static badges (no `<button>`); `aria-label` per button: `t('strength.logger.progressionUp/Maintain/Down')`; toggle behaviour: clicking an already-active button deselects (value → null); direct lucide imports (`ArrowUp`, `Minus`, `ArrowDown` from `lucide-react/dist/esm/icons/...`)

- [X] T010 [P] Create `app/components/strength/DeltaIndicator.tsx` — named `memo()` export; props: `current: number | null`, `baseline: number | null`, `unit?: string`, `className?: string`; computes delta inside the component (not passed in — keeps call sites clean); renders: if both null → nothing; if delta > 0 → `+{delta} {unit}` in `text-green-600 text-xs`; if delta < 0 → `−{|delta|} {unit}` in `text-amber-600 text-xs`; if delta === 0 → `=` in `text-muted-foreground text-xs`; `unit` defaults to `"kg"`; no state, no effects — pure derivation from props

- [X] T011 [P] Create `app/components/strength/StatCard.tsx` — named `memo()` export; props: `label: string`, `value: React.ReactNode`, `trend?: 'up' | 'flat' | 'down'`, `className?: string`; purely presentational card: label in `text-xs uppercase tracking-widest text-muted-foreground`, value in `text-2xl font-semibold`, optional trend badge (▲ green / — muted / ▼ amber); no state; hoisted empty trend element: `const NO_TREND = null`

- [X] T012 [P] Create `app/components/strength/StrengthEmptyState.tsx` — named `memo()` export; props: `heading: string`, `body: string`, `actionLabel?: string`, `onAction?: () => void`, `className?: string`; hoisted `DUMBBELL_ICON = <Dumbbell className="size-16 text-orange-400" />` at module level (renders-hoist-jsx rule); centered layout: icon + heading (`text-lg font-semibold`) + body (`text-sm text-muted-foreground`) + optional `<Button>` if `actionLabel` provided; `import Dumbbell from 'lucide-react/dist/esm/icons/dumbbell'`

**Checkpoint**: These 4 components are leaf nodes — verify they render in isolation before proceeding.

---

## Phase 4: User Story 1 — Strength Variant Library (Priority: P1) 🎯 MVP

**Goal**: Full variant CRUD (create, edit, delete) accessible at `/pl/coach/strength`.

**Independent Test**: `/pl/coach/strength` → create "Push A" (3 exercises) → edit reps range → delete one exercise → delete variant. All persists in mock mode.

- [X] T013 [US1] Add i18n keys to **both** `app/i18n/resources/en/training.json` and `app/i18n/resources/pl/training.json` in one commit — EN keys: `strength.variant.{library,new,edit,delete,deleteConfirm,name,description,exerciseCount,exerciseCount_other,detachVariant,selectVariant,noVariants,tabExercises,tabProgress,backToLibrary,editVariant,deleteVariant}`; `strength.empty.noVariants.{heading,body}`; `strength.exercise.{videoUrl,sets,repsMin,repsMax,addVideo}`; `strength.logger.{progressionUp,progressionMaintain,progressionDown}`

- [X] T014 [P] [US1] Create `app/components/strength/VariantCard.tsx` — `export const VariantCard = memo(function VariantCard(...) {...})`; direct lucide imports (`Pencil`, `Trash2` from `lucide-react/dist/esm/icons/...`); **peek expansion** is pure CSS — parent div has `group` class, exercise preview div has `max-h-0 group-hover:max-h-24 overflow-hidden transition-[max-height] duration-200` (no JS state, no `useState`); delete: if `variant.sessionCount === 0` → call `onDelete` directly (caller handles Undo toast); if `> 0` → shadcn `<AlertDialog>` showing session count; `aria-label` on edit and delete buttons; uses `cn()`, all strings via `t('training:...')`

- [X] T015 [US1] Create `app/components/strength/VariantForm.tsx` — internal `const ExerciseRow = memo(function ExerciseRow(...) {...})` — isolated so editing one row doesn't re-render siblings; parent form uses `useState<FormExercise[]>(() => convertToFormExercises(initial?.exercises ?? []))` (lazy init — js-lazy-state-init rule); hoisted `const VIDEO_URL_REGEX = /^https?:\/\/.+/` at module level; sets field: segmented button group (1–6, "6+" reveals `<Input type="number">`); reps: two adjacent `<Input type="number">` styled as "[ 8 ] – [ 12 ]" (shared `<label>` above, inline max≥min validation); "Add exercise" button focuses new row's name input via `useRef` + `requestAnimationFrame`; `Enter` on exercise name adds next row; Zod 4 validation on save; direct lucide imports (`Plus`, `Trash2`, `ChevronUp`, `ChevronDown`, `ExternalLink`)

- [X] T016 [US1] Create coach strength library route `app/routes/coach/strength.tsx` — default export; page title + "New Variant" `<Button variant="default">`; search input (rendered only when `variants.length >= 4`, client-side filter using `useMemo(() => variants.filter(...), [variants, query])`); variant grid via `<VariantCard>`; empty state uses `<StrengthEmptyState>` with navigation handler; delete with 5 s Undo toast (`toast(msg, { action: { label: t('common.undo'), onClick: restoreFn } })`); navigates to `/:locale/coach/strength/new` for create, `/:locale/coach/strength/:variantId` for edit; uses `useAuth()`, `useStrengthVariants(user.id)`, `useDeleteStrengthVariant()`, `useLocalePath()`

- [X] T017 [P] [US1] Create athlete strength library route `app/routes/athlete/strength.tsx` — identical to T016; mutations (create/edit/delete) only shown when `profile.can_self_plan === true`; without permission: read-only grid + muted subtitle via `useProfile()`

- [X] T018 [US1] Register all 4 routes in `app/routes.ts` — inside `coach` prefix layout: `route('strength', 'routes/coach/strength.tsx')`, `route('strength/:variantId', 'routes/coach/strength.$variantId.tsx')`; inside `athlete` prefix layout: same; run `pnpm typecheck` to generate route types

- [X] T019 [US1] Run `pnpm typecheck` and fix TypeScript errors in Phase 4 files

---

## Phase 5: User Story 2 — Pre-fill from Last Session (Priority: P2)

**Goal**: Session form auto-populates exercises from the athlete's most recent session with the same variant, with provenance label and "Accept all" shortcut.

**Independent Test**: Log a mock strength session with "Push A" at 80 kg × 10 reps. Open a new strength session, select "Push A". Verify: pre-fill values show, "From [date]" label visible, "Accept all" available.

- [X] T020 [US2] Add i18n keys to **both** locale files in one commit — EN: `strength.variant.{fromDate,acceptAll,acceptedAll,firstSession,detachConfirm,useTemplate,recentlyUsed,changeVariant}`; `strength.progression.{up,maintain,down,hint}`

- [X] T021 [US2] Create `app/components/strength/VariantPicker.tsx` — named export (not memo — it's a controlled input, memoisation not beneficial); uses `useIsMobile()` for derived boolean (rerender-derived-state rule — subscribes to boolean, not raw window width); **desktop**: shadcn `<Popover>` + `<Command>` with search filtering both variant name and exercise names (`useMemo` for filtered list, not inline filter); **mobile**: shadcn `<Sheet side="bottom">`; each list item: name (bold) + exercise count + first 2 exercise names (`text-xs text-muted-foreground`); "Recently used" section when `recentVariantIds` non-empty; "None/Detach" option at top when variant selected; keyboard: `↑↓` navigate, `Enter` select, `Escape` close; `role="listbox"` + `role="option"` + `aria-selected`

- [X] T022 [P] [US2] Create `app/components/strength/VariantExerciseList.tsx` — named export; provenance header: clock icon + `t('strength.variant.fromDate', {date})` + "Accept all" `<Button size="sm" variant="outline">` (local `accepted` state via `useState(false)` → button shows "Accepted ✓" after click); first-session header when `lastSessionData` undefined; each row: name + video link (`ExternalLink` icon if `videoUrl`, `target="_blank" rel="noopener noreferrer"`) + muted target range + last reps/load or em-dash; uses `<ProgressionToggle readOnly value={lastSessionData[ex.id]?.progression ?? null} onChange={() => {}} />` for badges (reuses shared component); pre-filled rows: `border-l-2 border-orange-300`; direct lucide imports

- [X] T023 [US2] Modify `app/components/training/type-fields/StrengthFields.tsx` — two-mode interface: **Mode A** (variant selected): `<VariantPicker>` showing current variant name + "Change" link; `<VariantExerciseList>` with `lastSessionData={prefillData}`, `lastSessionDate={prefillDate}`, `showProgressionHints`, `onAcceptAll`; "Detach variant" ghost link calls `onVariantChange(undefined)`; **Mode B** (no variant): `<VariantPicker>` trigger with placeholder; existing free-form builder unchanged below; new props: `variantId?`, `onVariantChange`, `prefillData?`, `prefillDate?`, `recentVariantIds?`; note: `useLastSessionExercises` is called in the **parent** (SessionForm), not here — keeps this component presentational and avoids query duplication

- [X] T024 [US2] Wire pre-fill in `app/components/training/SessionForm.tsx` — when `trainingType === 'strength'`, call `useLastSessionExercises(effectiveAthleteId, exerciseIds)` where `exerciseIds` is derived from the selected variant's exercise list; pass `prefillData`, `prefillDate` down to `<StrengthFields>`; store `variantId` in `typeSpecificData.variantId` on create/update mutation input; `exerciseIds` derived with `useMemo(() => variant?.exercises.map(e => e.id) ?? [], [variant?.exercises])`

- [X] T025 [US2] Run `pnpm typecheck` and fix TypeScript errors in Phase 5 files

---

## Phase 6: User Story 3 — Session Exercise Logging with Progression Intent (Priority: P3)

**Goal**: Athletes log actual reps/load/progression per exercise in SessionDetailModal; delta vs. last session is visible at a glance.

**Independent Test**: Open a completed mock session with "Push A" in SessionDetailModal. Enter 82.5 kg for Bench Press. Verify `+2.5 kg` delta indicator appears. Select "up". Persist and re-open — values remain. Next session shows ▲ indicator.

- [X] T026 [US3] Add i18n keys to **both** locale files in one commit — EN: `strength.logger.{sectionTitle,colExercise,colReps,colLoad,colNext,savedConfirm,sessionVolume,allLogged,deltaIncreased,deltaDecreased,deltaUnchanged}`; `strength.variant.{tabExercises,tabProgress,backToLibrary}` (if not added in T013)

- [X] T027 [US3] Create `app/components/strength/SessionExerciseLogger.tsx` — named export; hoisted **module-level JSX constant** `const TABLE_HEADERS = (<div className="grid grid-cols-[2fr_1fr_1fr_1fr] sticky top-0 bg-background text-xs uppercase tracking-widest text-muted-foreground px-2 py-1">...</div>)` (rendering-hoist-jsx rule — headers never change); each exercise rendered as `const ExerciseLogRow = memo(function ExerciseLogRow({ exercise, logged, prefill, onChange }: ...) {...})` — memoised so only the row where input is active re-renders; `DeltaIndicator` below load input; `ProgressionToggle` for Next column; on blur: calls `onChange` → parent fires mutation → on success: row-level `saved` state triggers `✓` CSS animation (`@keyframes saveConfirm { 0%,100%{opacity:0} 20%,80%{opacity:1} }`, 1.5 s); **footer** computed via `useMemo(() => computeVolume(exercises, logMap), [exercises, logMap])` — shown only when all rows have reps+load; `readOnly` mode: `<ProgressionToggle readOnly>`, inputs `disabled`; direct lucide imports

- [X] T028 [US3] Modify `app/components/training/SessionDetailModal.tsx` — add condition block: when `session.trainingType === 'strength' && session.typeSpecificData.variantId`, fetch `useStrengthVariant(variantId)` and `useStrengthSessionExercises(session.id)` (both gated on the condition so queries only fire when relevant); build `prefillData` from `useLastSessionExercises(athleteId, exerciseIds)`; render `<SessionExerciseLogger>` above existing performance chips with `readOnly={userRole === 'coach' && !showAthleteControls}`; mutation on `onChange` via `useUpsertSessionExercises()`; no new props needed on `SessionDetailModal` — all variant data derived internally from `session.typeSpecificData.variantId`

- [X] T029 [US3] Run `pnpm typecheck`; manually verify in mock mode: logging round-trip, delta indicator, progression toggle persist, pre-fill in next session shows ▲

---

## Phase 7: User Story 4 — Variant Progress Analysis View (Priority: P4)

**Goal**: Variant detail page shows a progress dashboard: stat cards + chart + history table.

**Independent Test**: Navigate to `/pl/coach/strength/[variantId]` → Progress tab → verify stat cards, chart renders, history table shows sessions in reverse order.

- [X] T030 [US4] Add i18n keys to **both** locale files in one commit — EN: `strength.analysis.{statSessions,statBestLoad,statLastSession,statVolumeTrend,trendIncreasing,trendStable,trendDecreasing,tableDate,tableExercise,tableSetsReps,tableLoad,tableVolume,tableNextIntent,emptyHeading,emptyBody,emptyAction}`

- [X] T031 [US4] Install shadcn chart — `pnpm dlx shadcn@latest add chart`; verify `app/components/ui/chart.tsx` exists; do NOT edit manually; recharts is now available as a dep

- [X] T032 [P] [US4] Create `app/components/strength/ExerciseFilterPills.tsx` — `export const ExerciseFilterPills = memo(function ...)` ; props: `exercises: StrengthVariantExercise[]`, `activeIds: Set<string>`, `onToggle: (id: string) => void`, `className?: string`; horizontal scrollable `flex gap-2 overflow-x-auto pb-1` row; each pill: `<button>` with `role="checkbox"`, `aria-checked`, active = `bg-orange-600 text-white`, inactive = `variant="outline"`; no internal state — fully controlled

- [X] T033 [P] [US4] Create `app/components/strength/StrengthStatCards.tsx` — `export const StrengthStatCards = memo(function ...)` ; props: `exercises: StrengthVariantExercise[]`, `logs: ProgressLog[]`, `className?: string`; all 4 stat values derived in ONE `useMemo` pass (js-combine-iterations rule): `const stats = useMemo(() => { let sessions=0, bestLoad=0, lastDate=''; const vols: number[]=[]; for (const log of logs) { sessions++; if (log.loadKg > bestLoad) bestLoad=log.loadKg; if (log.sessionDate > lastDate) lastDate=log.sessionDate; /* vol calc... */ } return {sessions, bestLoad, lastDate, trend: deriveTrend(vols)} }, [logs])`; renders 4 `<StatCard>`; "Best Load" shows a `<select>` to switch exercise

- [X] T034 [P] [US4] Create `app/components/strength/ProgressLineChart.tsx` — `export const ProgressLineChart = memo(function ...)` ; props: `exercises: StrengthVariantExercise[]`, `logs: ProgressLog[]`, `visibleExerciseIds: Set<string>`, `className?: string`; builds index map with `useMemo`: `const logsByExercise = useMemo(() => logs.reduce<Record<string,ProgressLog[]>>((acc,log) => { (acc[log.exerciseId] ??= []).push(log); return acc }, {}), [logs])` (js-index-maps rule); recharts `<LineChart>`: one `<Line>` per exercise in `visibleExerciseIds`; X-axis `format(parseISO(d), 'MMM d')` (direct import `from 'date-fns/format'`); Y-axis min at 80% of min value; `<ReferenceDot>` where `progression === 'up'` AND next session load increased; custom tooltip card; uses `chart-1`…`chart-N` CSS variables for line colours; direct date-fns imports

- [X] T035 [US4] Create `app/components/strength/SessionHistoryTable.tsx` — `export const SessionHistoryTable = memo(function ...)` ; props: `exercises: StrengthVariantExercise[]`, `logs: ProgressLog[]`, `className?: string`; local sort state `useState<{col: string; dir: 'asc'|'desc'}>(() => ({col:'date', dir:'desc'}))` (lazy init); groups rows by session date in `useMemo` using index map: `const bySession = useMemo(() => logs.reduce<Record<string,ProgressLog[]>>(...),[logs])`; sortable column headers (click to toggle); each session group: date row with `border-l-2 border-orange-300` + indented exercise rows (date/exercise/sets×reps/load/volume/next-intent); `formatDistanceToNow` for date display (direct import `from 'date-fns/formatDistanceToNow'`)

- [X] T036 [US4] Create `app/components/strength/ExerciseProgressChart.tsx` — lazy-loaded container (this file itself is the `React.lazy` target — imported as `const ExerciseProgressChart = lazy(() => import('./ExerciseProgressChart'))` at the route); manages `visibleExerciseIds` state with `useState<Set<string>>(() => new Set([exercises[0]?.id ?? '']))` (lazy init for Set); composes `<StrengthStatCards>` + `<ExerciseFilterPills>` + `<ProgressLineChart>` + `<SessionHistoryTable>`; renders `<StrengthEmptyState>` when `logs.length < 2`; props: `variant: StrengthVariant`, `logs: ProgressLog[]`, `athleteName?: string`, `className?: string`

- [X] T037 [US4] Create coach variant detail route `app/routes/coach/strength.$variantId.tsx` — default export; back link `← Strength Library` via `useLocalePath`; loads variant via `useStrengthVariant(variantId)`; shadcn `<Tabs>` with `t('strength.variant.tabExercises')` + `t('strength.variant.tabProgress')`; "Exercises" tab: `<VariantForm initial={variant}>` wired to `useUpdateStrengthVariant()` + `useUpsertVariantExercises()`; "Progress" tab: `<Suspense fallback={<AppLoader />}><ExerciseProgressChart /></Suspense>` — recharts never in initial bundle; `useVariantProgressLogs(variantId, effectiveAthleteId)`

- [X] T038 [P] [US4] Create athlete variant detail route `app/routes/athlete/strength.$variantId.tsx` — same as T037; "Exercises" tab read-only for athletes without `can_self_plan`; Progress tab uses `user.id` as athleteId

- [X] T039 [US4] Run `pnpm typecheck` and fix all TypeScript errors in Phase 7 files

---

## Phase 8: Polish & Quality Gates

**Purpose**: Final compliance checks, navigation wiring, and bundle discipline verification.

- [X] T040 Add navigation links — in `app/components/layout/Header.tsx` (or BottomNav), add "Strength" nav item linking to `/:locale/coach/strength` (coaches) and `/:locale/athlete/strength` (athletes); add `common.nav.strength` key to both `en/common.json` and `pl/common.json`

- [X] T041 [P] **Bundle audit** — grep all new files in `app/components/strength/` and new route files for barrel imports; every lucide-react icon MUST be `import X from 'lucide-react/dist/esm/icons/x'`; every date-fns function MUST be `import { fn } from 'date-fns/fn'`; fix any violations; run `pnpm build` and verify no new warnings about large chunks

- [X] T042 [P] **React best practices audit** — verify: (a) `VariantCard`, `StatCard`, `DeltaIndicator`, `ProgressionToggle`, `StrengthEmptyState`, `ExerciseFilterPills`, `StrengthStatCards`, `ProgressLineChart`, `SessionHistoryTable` all use `memo()`; (b) `VariantForm` uses lazy `useState` init; (c) `TABLE_HEADERS` and `DUMBBELL_ICON` are module-level constants; (d) `StrengthStatCards` and `ProgressLineChart` use single-pass `useMemo` derivation; fix any violations

- [X] T043 [P] **i18n completeness audit** — grep for hardcoded English strings in all new strength files; verify every string goes through `t()`; verify all EN keys have PL equivalents by checking both files in parallel

- [X] T044 [P] **Mutation optimistic-update audit** — in `useStrengthVariants.ts`, confirm each mutation has `onMutate` (cancelQueries + snapshot), `onError` (rollback), `onSettled` (invalidateQueries); fix any missing steps

- [X] T045 [P] **Supabase query audit** — grep `app/lib/queries/strength-variants.ts` for `select('*')` — must be zero; verify all column lists are explicit; verify `isMockMode` check appears as early-exit at the start of each function

- [X] T046 Run final `pnpm typecheck` — must exit 0; fix all remaining TypeScript errors

- [X] T047 Manual smoke test in mock mode (follow `quickstart.md` Phase G checklist): create variant → add 3 exercises → reorder → save; link to strength session; log actual reps/load/progression in SessionDetailModal; verify delta indicators and ✓ animation; open next session and verify pre-fill with provenance date; open Progress tab and verify stat cards + chart + table; switch EN↔PL and verify all strings

---

## Dependencies

```
Phase 1 (T001–T004)  ← types, migration, seed data
    ↓
Phase 2 (T005–T008)  ← query + hook layer
    ↓
Phase 3 (T009–T012)  ← shared primitives (parallel group)
    ↓
Phase 4 (T013–T019)  ← US1 library — 🎯 MVP delivery
    ↓
Phase 5 (T020–T025)  ← US2 pre-fill
    ↓
Phase 6 (T026–T029)  ← US3 session logging
    ↓
Phase 7 (T030–T039)  ← US4 progress chart (recharts added here)
    ↓
Phase 8 (T040–T047)  ← polish + audits
```

Phases 1–3 are strictly sequential. Within each phase, `[P]` tasks are independent.

---

## Parallel Execution Examples

**Phase 1**:
```
T001 (migration) → T002 + T003 + T004 in parallel → pnpm typecheck
```

**Phase 2**:
```
T005 (query scaffold) → T006 + T007 in parallel → T008 (hooks) → pnpm typecheck
```

**Phase 3 (all parallel — different files)**:
```
T009 + T010 + T011 + T012 in parallel → verify in isolation
```

**Phase 4**:
```
T013 (i18n) → T014 + T015 in parallel → T016 + T017 in parallel → T018 (routes.ts) → T019 (typecheck)
```

**Phase 7 (chart sub-components all parallel)**:
```
T031 (shadcn add chart) → T032 + T033 + T034 + T035 in parallel → T036 (container) → T037 + T038 in parallel → T039 (typecheck)
```

---

## Implementation Strategy

| Increment | Phases | What you get |
|-----------|--------|-------------|
| **MVP** | 1–4 | Full variant library CRUD — create templates, useful standalone |
| **+Pre-fill** | 5 | Session form remembers last session per variant |
| **+Logging** | 6 | Closing the progressive overload loop |
| **+Charts** | 7 | Data-driven training analysis |

---

## Summary

**Total tasks**: 47 (+5 vs. original 42)
**New tasks vs. original**: Phase 3 (shared primitives T009–T012), plus audit tasks T041–T042 in polish phase
**Per user story**: US1=7, US2=6, US3=4, US4=10
**Setup/Foundational/Primitives**: 12 (Phases 1–3)
**Polish**: 8 (Phase 8)
**Parallel opportunities**: 22 tasks marked `[P]`

**React best practices applied**:
- Barrel import elimination (T041 audit)
- `memo()` on all leaf + stable components
- Lazy `useState` init in `VariantForm` + `SessionHistoryTable` + `ExerciseProgressChart`
- Hoisted static JSX (`TABLE_HEADERS`, `DUMBBELL_ICON`)
- Single-pass `useMemo` stat derivation in `StrengthStatCards`
- Index map `useMemo` in `ProgressLineChart` + `SessionHistoryTable`
- Derived boolean state (`useIsMobile()`) in `VariantPicker`
- `ExerciseProgressChart` decomposed into 4 focused sub-components
- `ProgressionToggle` + `DeltaIndicator` extracted as reusable shared primitives
