# Component API Contracts: Strength Workout Module

*Updated 2026-03-21 — UX/UI review applied.*

---

## New Components (`app/components/strength/`)

---

### `VariantCard`

Displays a single strength variant in the library grid. Supports an inline "peek" expansion to show the first 3 exercises without navigation.

```typescript
interface VariantCardProps {
  variant: StrengthVariant;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onSelect?: (id: string) => void;   // present when used as a picker
  className?: string;
}
```

**Visual structure** (collapsed state):
- Top: variant name (semibold) + exercise count badge (orange pill) + optional "last used" chip (muted, e.g. "3 days ago")
- Middle: muscle group tags (up to 3 shown, e.g. "Chest · Shoulders · Triceps") — derived from exercise names or user-entered
- Bottom-right: Edit icon + Delete icon (both ≥ 44 × 44 px hit area); keyboard accessible

**Hover / focus state** (peek expansion — CSS `group-hover` / `focus-within`, no JS toggle needed):
- Beneath the base card content, 3 exercise names fade in with a smooth `max-height` transition
- Exercise names are truncated at 1 line each with ellipsis
- If exercises < 3, all are shown; if > 3, last entry reads "+N more"

**Delete behaviour**:
- If `variant.sessionCount === 0`: instant delete with 5 s Undo toast (no dialog)
- If `variant.sessionCount > 0`: shadcn `AlertDialog` with session count warning
- Pass `sessionCount` as part of `StrengthVariant` (computed field from query)

**Accessibility**:
- Entire card is not a link (avoids accidental navigation); click action on name opens detail page
- Edit and Delete buttons have `aria-label="Edit [name]"` / `aria-label="Delete [name]"`

---

### `VariantForm`

Full-featured form for creating or editing a variant and its exercises. Used on the variant detail page (not inside a dialog).

```typescript
interface VariantFormProps {
  initial?: StrengthVariant;         // undefined = create mode
  onSave: (input: CreateStrengthVariantInput | UpdateStrengthVariantInput) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  className?: string;
}
```

**Variant metadata section**:
- Name: `<Input>` — auto-focused on mount (create mode); validates min 1 char on blur
- Description: `<Textarea>` — collapsible; shown by default in edit mode, hidden behind "Add description" link in create mode (reduces visual noise)

**Exercise list**:
- Each row is an `ExerciseRow` internal sub-component with these fields:

  | Field | Control | Notes |
  |-------|---------|-------|
  | Order handle | Grab icon (≥ 44 px) | Simple up/down button pair (`↑`/`↓`); top item hides `↑`, bottom hides `↓` |
  | Name | `<Input>` — full-width | Auto-focused when row is added; `onKeyDown Enter` adds next row |
  | Video URL | `<Input>` — collapsed by default | Toggled by a "🎬 Add video" link; URL-format validated; shows YouTube/Vimeo favicon if domain matches |
  | Sets | Segmented button group | Buttons: 1 2 3 4 5 6+; selecting "6+" reveals a small `<Input type="number">`; default 3 |
  | Reps range | Two adjacent compact `<Input type="number">` styled as "[ 8 ] – [ 12 ]" | Inline validation: max ≥ min; labeled with a single `<label>` "Reps" above both inputs |
  | Remove | `<Button variant="ghost" size="icon">` Trash2 | Always visible; ≥ 44 px; tooltip "Remove exercise" |

- "Add exercise" button at bottom: `<Button variant="outline">` with `<Plus>` icon; adds a new row and focuses its name input
- Minimum 1 exercise required (form-level validation on save, not blocking during editing)

**Focus management**:
- Create mode: name input focused on mount
- After "Add exercise": new row's name input focused
- After pressing `Enter` on an exercise name: if next row exists, focus moves to it; if last row, a new row is added and focused

**Keyboard shortcuts** (documented in tooltips):
- `Enter` on exercise name → add/focus next row
- `Escape` on any field → blur only (no cancel of entire form)
- `Delete` key on focused exercise row (when name is empty and all fields blank) → removes the row

---

### `VariantPicker`

Variant selection control used inside the session form. Responsive: bottom Sheet on mobile, Popover/Command on desktop.

```typescript
interface VariantPickerProps {
  variants: StrengthVariant[];
  selectedVariantId?: string;
  onSelect: (variantId: string | undefined) => void;
  recentVariantIds?: string[];        // shown at top as "Recently used"
  isLoading?: boolean;
  className?: string;
}
```

**Desktop** (`useIsMobile() === false`): shadcn `<Popover>` containing a `<Command>` (search + list). Trigger button shows selected variant name or "Select template…" placeholder.

**Mobile** (`useIsMobile() === true`): shadcn `<Sheet side="bottom">` with max-height 70 vh, scrollable list with 48 px row height for reliable touch targets.

**List structure**:
- If `recentVariantIds` provided and non-empty: "Recently used" heading + up to 3 variants; then a divider; then full list
- Each variant item: name (bold) + exercise count + first 2 exercise names in muted small text (preview)
- Search input: filters by variant name and exercise name (client-side, no debounce needed for typical library size < 50)
- "None / Detach" option at top if a variant is currently selected

**Accessibility**: `role="listbox"` on the list; each item has `role="option"` and `aria-selected`; keyboard: `↑↓` navigates items, `Enter` selects, `Escape` closes.

---

### `VariantExerciseList`

Read-only exercise list shown in the session form after variant selection. Communicates pre-fill provenance and progression intent visually.

```typescript
interface VariantExerciseListProps {
  exercises: StrengthVariantExercise[];
  lastSessionData?: Record<string, StrengthSessionExercise>;  // variantExerciseId → last log
  lastSessionDate?: string;           // ISO date string — shown as "From [date]"
  showProgressionHints?: boolean;
  className?: string;
}
```

**Provenance header** (shown only when `lastSessionData` is non-empty):
```
[ From Mar 3 ]  [Accept all ✓]
```
- "From [date]": formatted via `date-fns` `format(parseISO(date), 'MMM d')`, muted text, clock icon
- "Accept all" button: `<Button variant="outline" size="sm">` — calls parent `onAcceptAll` handler; disabled once accepted; label changes to "Accepted ✓" after click (reset on form unmount)

**First-session header** (shown only when `lastSessionData` is empty or undefined):
```
First session — establish your baseline
```
Muted italic text. No "Accept all" button.

**Each exercise row**:
- Left: exercise name + video link icon (if `videoUrl`) + target range label ("target: 8–12", muted)
- Middle: last reps value (e.g. "×10") or em-dash if no data
- Right: last load value (e.g. "80 kg") or em-dash; + progression badge if `showProgressionHints`:
  - `progression = 'up'`: `▲` in `text-green-600` with `aria-label="Consider increasing"`
  - `progression = 'down'`: `▼` in `text-amber-600` with `aria-label="Consider reducing"`
  - `progression = 'maintain'`: `→` in `text-muted-foreground`
- Pre-filled rows get a `border-l-2 border-orange-300` left accent to distinguish from user-entered

---

### `SessionExerciseLogger`

Interactive logging table inside `SessionDetailModal`. Core of the progression feedback loop.

```typescript
interface SessionExerciseLoggerProps {
  exercises: StrengthVariantExercise[];
  logged: StrengthSessionExercise[];              // existing logs for current session
  prefillData?: Record<string, StrengthSessionExercise>;  // last session's data for delta calc
  variantName?: string;                           // shown in section header
  onChange: (logs: UpsertSessionExercisesInput['exercises']) => void;
  readOnly?: boolean;
  className?: string;
}
```

**Section header**:
- "Strength Log" label (uppercase tracking, existing `SectionLabel` style)
- Variant name subtitle below (smaller, muted)

**Table structure**:
- Sticky column headers: `Exercise | Reps | Load (kg) | Next` — `position: sticky; top: 0` within the modal's scroll container; `bg-background` to not bleed through
- Column widths: Exercise ~40%, Reps ~15%, Load ~25%, Next ~20%

**Each exercise row**:
- **Exercise cell**: name (semibold); incomplete rows (both reps and load empty) get `border-l-2 border-orange-400` left accent as a non-blocking nudge
- **Reps cell**: `<Input type="number" min="0" max="999">`, width 64 px; placeholder = last reps or variant target range
- **Load cell**: `<Input type="number" min="0" step="0.5">`, width 80 px; placeholder = last load; **delta indicator** shown below the input — when value differs from `prefillData`:
  - Increased: `+2.5 kg` in `text-green-600 text-xs`
  - Decreased: `−5 kg` in `text-amber-600 text-xs`
  - Unchanged: `= ` in `text-muted-foreground text-xs`
- **Next cell**: Three-button toggle group (`⬆ / ↔ / ⬇`); each button ≥ 48 × 44 px; active state: filled orange background (`bg-orange-600 text-white`); `aria-label="Progress up / Maintain / Progress down"`
- **Save confirmation**: On blur of any input, the mutation fires; on success, a `✓` icon animates in beside the load input (opacity 0 → 1 → 0, 1.5 s total) using a CSS keyframe animation

**Footer row** (shown when all exercises have reps + load entered):
- "Session volume: X kg" where X = Σ (sets × reps × load) across all exercises
- `text-sm font-medium` right-aligned in the table footer

**Keyboard tab order**: reps₁ → load₁ → next₁ → reps₂ → load₂ → next₂ → … sequential by `tabIndex`

**Read-only mode**: all inputs `disabled`; delta indicators still visible; progression badges shown as static icons not toggles; volume footer still shown

---

### `ExerciseProgressChart`

Lazy-loaded progress dashboard. Shown on the "Progress" tab of the variant detail page.

```typescript
interface ExerciseProgressChartProps {
  variant: StrengthVariant;
  logs: Array<{
    exerciseId: string;
    loadKg: number;
    actualReps: number;
    progression: ProgressionIntent | null;
    sessionDate: string;                 // ISO date from completed_at
  }>;
  athleteName?: string;                  // shown in tab subtitle when coach views athlete data
  className?: string;
}
```

**Layout** (top to bottom):

1. **Stat cards row** — 4 cards in a `grid-cols-2 sm:grid-cols-4` layout:
   - "Sessions" — total count of logged sessions
   - "Best Load" — max `load_kg` across all logged sessions, with exercise selector dropdown below (default: first exercise in variant)
   - "Last Session" — relative date, e.g. "3 days ago" (via `date-fns` `formatDistanceToNow`)
   - "Volume Trend" — `▲ Increasing` / `— Stable` / `▼ Decreasing` based on last 3 sessions' total volume; colour-coded green/muted/amber

2. **Exercise filter pills** — horizontal scrollable row of pill buttons; one per exercise; "All" pill not present (too noisy with many exercises); default: first exercise active; clicking a pill toggles that exercise's line on/off in the chart; active pills use the orange sport accent fill

3. **Chart** — `<ChartContainer>` (shadcn) wrapping a recharts `<LineChart>`:
   - X-axis: session date, formatted `MMM d` (date-fns); auto-rotated at ≤ 6 visible ticks to avoid crowding
   - Y-axis: load_kg; starts at 80% of min value to avoid lines hugging the bottom
   - One `<Line>` per exercise; only visible lines (per pill filter) are rendered
   - Line color: use the `chart-1` through `chart-N` CSS variables from shadcn's chart theme (orange-family for strength module)
   - **Progression markers**: `<ReferenceDot>` on data points where `progression === 'up'` AND next session's load actually increased — shows a small ▲ marker in `text-green-600`
   - Custom `<Tooltip>`: card showing date (bold), exercise name, actual reps + load, progression intent icon

4. **Session history table** — below the chart; reverse-chronological:

   | Date | Exercise | Sets × Reps | Load (kg) | Volume | Next Intent |
   |------|----------|-------------|-----------|--------|-------------|
   | Mar 15 | Bench Press | 3 × 10 | 82.5 | 2,475 | ▲ |

   - Sortable by clicking headers (date, load, volume)
   - Exercises within a single session are grouped with a left-border accent and indented

**Empty state** (< 2 sessions): Centered layout — Dumbbell icon (64 px, `text-orange-400`), heading "Track your progress", body text "Log at least 2 sessions with this variant to see your progression chart.", primary button "Go to this week" linking to `/:locale/coach/week` (or athlete equivalent).

---

## Modified Components

### `SessionDetailModal` (`app/components/training/SessionDetailModal.tsx`)

**Change**: When `session.trainingType === 'strength'` and `session.typeSpecificData.variantId` is present, render a `<SessionExerciseLogger>` block in the "Actual" section **above** the existing performance chips (RPE, HR, duration). The logger and performance chips coexist.

**New data requirements**: The modal needs to fetch `useStrengthSessionExercises(session.id)` and `useLastSessionExercises(athleteId, exerciseIds)` internally when the variant condition is met — these queries are gated on the condition so they only fire when relevant.

**New props**:
```typescript
// No new props needed — modal derives variant data from session.typeSpecificData.variantId
// and fetches internally using existing useAuth() for athleteId
```

---

### `StrengthFields` (`app/components/training/type-fields/StrengthFields.tsx`)

**Change**: Replace the raw exercise list builder with a two-mode interface:

**Mode A — Variant mode** (when `variantId` is set):
- `<VariantPicker>` at top (shows current selection with a "Change" link)
- `<VariantExerciseList>` below with pre-fill data + provenance label
- "Detach variant" link (ghost, small, destructive color) below the list

**Mode B — Free-form mode** (when `variantId` is undefined):
- `<VariantPicker>` trigger at top with placeholder "Use a template…" (promotes discovery without forcing it)
- Existing free-form exercise builder below (unchanged)

**New props**:
```typescript
variantId?: string;
onVariantChange: (id: string | undefined) => void;
prefillData?: Record<string, StrengthSessionExercise>;
prefillDate?: string;    // ISO date for provenance label
recentVariantIds?: string[];
```

---

## New Hooks (`app/lib/hooks/useStrengthVariants.ts`)

```typescript
// Read
useStrengthVariants(userId: string): UseQueryResult<StrengthVariant[]>
useStrengthVariant(id: string): UseQueryResult<StrengthVariant>

// Write — all with full optimistic-update cycle (onMutate / onError / onSettled)
useCreateStrengthVariant(): UseMutationResult
useUpdateStrengthVariant(): UseMutationResult
useDeleteStrengthVariant(): UseMutationResult
useUpsertVariantExercises(): UseMutationResult

// Session exercise logging
useStrengthSessionExercises(sessionId: string): UseQueryResult<StrengthSessionExercise[]>
useUpsertSessionExercises(): UseMutationResult

// Pre-fill
useLastSessionExercises(
  athleteId: string,
  exerciseIds: string[],
): UseQueryResult<{
  data: Record<string, StrengthSessionExercise>;
  date: string | null;   // most recent completedAt across returned exercises
}>

// Analysis
useVariantProgressLogs(
  variantId: string,
  athleteId: string,
): UseQueryResult<ProgressLog[]>
```

Note: `useLastSessionExercises` now also returns the `date` of the most recent session so `VariantExerciseList` can render the provenance label without an additional query.

---

## New Routes

| Path | File | Pattern |
|------|------|---------|
| `/:locale/coach/strength` | `routes/coach/strength.tsx` | Library grid + empty state |
| `/:locale/coach/strength/:variantId` | `routes/coach/strength.$variantId.tsx` | Tabs: "Exercises" (VariantForm) + "Progress" (ExerciseProgressChart, lazy) |
| `/:locale/athlete/strength` | `routes/athlete/strength.tsx` | Same as coach; mutations gated on `can_self_plan` |
| `/:locale/athlete/strength/:variantId` | `routes/athlete/strength.$variantId.tsx` | "Exercises" (read-only if not self-plan) + "Progress" tab |

**Tab naming**: Tabs on the variant detail page are labelled "Exercises" (not "Edit") and "Progress" — more descriptive, consistent with what the user will find.

**Back navigation**: Both detail pages have a breadcrumb / back link: `← Strength Library`.

---

## New Supabase RPC

```sql
-- Returns most recent completed session exercise data per exercise_id for a given athlete
-- Also returns the max completed_at across the result set as last_session_date
get_last_session_exercises(p_athlete_id uuid, p_exercise_ids uuid[])
RETURNS TABLE (
  variant_exercise_id uuid,
  actual_reps         integer,
  load_kg             numeric,
  progression         text,
  completed_at        timestamptz,
  last_session_date   timestamptz   -- max completed_at across all returned rows
)
```

`last_session_date` is a window function max computed in the RPC so the frontend receives the provenance date in the same round trip.

---

## i18n Key Additions (new keys vs. original plan)

The following keys are added to the original set to support the UX improvements:

```json
{
  "strength": {
    "variant": {
      "fromDate": "From {{date}}",
      "acceptAll": "Accept all",
      "acceptedAll": "Accepted ✓",
      "firstSession": "First session — establish your baseline",
      "detachConfirm": "Variant detached",
      "tabExercises": "Exercises",
      "tabProgress": "Progress",
      "backToLibrary": "← Strength Library",
      "recentlyUsed": "Recently used",
      "useTemplate": "Use a template…"
    },
    "logger": {
      "sectionTitle": "Strength Log",
      "colExercise": "Exercise",
      "colReps": "Reps",
      "colLoad": "Load (kg)",
      "colNext": "Next",
      "savedConfirm": "✓",
      "sessionVolume": "Session volume: {{volume}} kg",
      "allLogged": "All logged ✓",
      "deltaIncreased": "+{{delta}} kg",
      "deltaDecreased": "−{{delta}} kg",
      "deltaUnchanged": "="
    },
    "analysis": {
      "statSessions": "Sessions",
      "statBestLoad": "Best Load",
      "statLastSession": "Last Session",
      "statVolumeTrend": "Volume Trend",
      "trendIncreasing": "▲ Increasing",
      "trendStable": "— Stable",
      "trendDecreasing": "▼ Decreasing",
      "filterAll": "All",
      "tableDate": "Date",
      "tableExercise": "Exercise",
      "tableSetsReps": "Sets × Reps",
      "tableLoad": "Load (kg)",
      "tableVolume": "Volume",
      "tableNextIntent": "Next Intent",
      "emptyHeading": "Track your progress",
      "emptyBody": "Log at least 2 sessions with this variant to see your progression chart.",
      "emptyAction": "Go to this week"
    }
  }
}
```
