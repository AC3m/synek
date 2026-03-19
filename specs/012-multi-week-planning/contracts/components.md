# Component API Contracts: Multi-Week Planning

## New Components

### `MultiWeekView`

**File**: `app/components/calendar/MultiWeekView.tsx`

**Purpose**: Top-level container. Renders 4 collapsible history week rows above the current editable `WeekGrid`.

```typescript
interface MultiWeekViewProps {
  currentWeekId: string
  currentWeekPlan: WeekPlan | null
  currentSessions: TrainingSession[]
  // All current-week editing handlers (passed through to WeekGrid)
  onAddSession: (day: DayOfWeek) => void
  onEditSession: (session: TrainingSession) => void
  onDeleteSession: (sessionId: string) => void
  onUpdateCoachPostFeedback: (sessionId: string, feedback: string | null) => void
  onReorderSession: (input: ReorderSessionInput) => void  // new — DnD
  onCopyWeek: (sourceWeekPlanId: string) => void          // new — copy whole week
  onCopyDay: (input: CopyDayInput) => void                // new — copy one day
  onCopySession: (session: TrainingSession, targetDay: DayOfWeek) => void  // new — copy one session
  userRole?: UserRole
  showAthleteControls?: boolean
  className?: string
}
```

---

### `HistoryWeekRow`

**File**: `app/components/calendar/HistoryWeekRow.tsx`

**Purpose**: A single collapsible row for a previous week. Collapsed state shows summary; expanded state shows a read-only 7-column grid with copy actions.

```typescript
interface HistoryWeekRowProps {
  weekId: string
  weekPlan: WeekPlan | null
  sessions: TrainingSession[]
  isExpanded: boolean
  onToggleExpand: () => void
  onCopyWeek: (sourceWeekPlanId: string) => void
  onCopyDay: (input: CopyDayInput) => void
  onCopySession: (session: TrainingSession, targetDay: DayOfWeek) => void
  targetWeekPlanId: string   // current week plan id — passed to copy handlers
  className?: string
}
```

**Collapsed state renders**:
- Chevron icon + week label (e.g., "W10 — Mar 3–9, 2026")
- Session count badge
- "Copy week" button (only if weekPlan exists and has sessions)

**Expanded state renders**:
- Same header (with collapse chevron)
- Read-only `WeekGrid` with `readonly={true}` + per-day "Copy day ↓" buttons in each `DayColumn` header
- Per-session "Copy" icon button on each `SessionCard`

---

### Modified: `WeekGrid`

**File**: `app/components/calendar/WeekGrid.tsx` (modified)

**New props added**:
```typescript
onReorderSession?: (input: ReorderSessionInput) => void
// When provided AND readonly is false → wraps columns in DnD context
```

**Behaviour change**: When `onReorderSession` is provided and `readonly` is false, wraps the grid in `DndContext` from @dnd-kit and enables drag handles on `SessionCard`s.

---

### Modified: `DayColumn`

**File**: `app/components/calendar/DayColumn.tsx` (modified)

**New props added**:
```typescript
onCopyDay?: (targetDay: DayOfWeek) => void   // shows "Copy day ↓" button in header (readonly mode only)
onCopySession?: (session: TrainingSession) => void  // forwarded to SessionCard
droppable?: boolean    // true when DnD is active; makes column a drop zone
```

---

### Modified: `SessionCard`

**File**: `app/components/training/SessionCard.tsx` (modified)

**New props added**:
```typescript
draggable?: boolean    // true on current week when DnD enabled
onCopy?: (session: TrainingSession) => void  // shows copy icon in readonly mode (history weeks)
```

When `draggable={true}`: renders drag handle icon (GripVertical from lucide-react); card participates in `useSortable` from @dnd-kit.

When `onCopy` is provided: renders a small copy icon button in the card's action area (visible on hover in history rows).

---

## New Hooks

### `useWeekHistory`

**File**: `app/lib/hooks/useWeekHistory.ts`

```typescript
function useWeekHistory(
  currentWeekId: string,
  count: number = 4
): HistoryWeek[]
```

Returns `count` previous weeks in descending order (most recent first). Each entry: `{ weekId, weekPlan, sessions }`. Uses existing `useWeekPlan` + `useSessions` hooks internally via parallel queries.

---

### `useCopyWeekSessions`

**File**: `app/lib/hooks/useSessions.ts` (added to existing file)

```typescript
function useCopyWeekSessions(): UseMutationResult<number, Error, CopyWeekInput>
```

- Calls `copyWeekSessions` RPC
- `onSuccess`: invalidates `sessions.byWeek(targetWeekPlanId)` + shows toast with count
- `onError`: shows error toast

---

### `useCopyDaySessions`

**File**: `app/lib/hooks/useSessions.ts` (added to existing file)

```typescript
function useCopyDaySessions(): UseMutationResult<number, Error, CopyDayInput>
```

- Calls `copyDaySessions` RPC
- `onSuccess`: invalidates `sessions.byWeek(targetWeekPlanId)` + shows toast
- `onError`: shows error toast

---

### `useCopySession`

**File**: `app/lib/hooks/useSessions.ts` (added to existing file)

```typescript
function useCopySession(): UseMutationResult<TrainingSession, Error, { session: TrainingSession; targetWeekPlanId: string; targetDay: DayOfWeek }>
```

- Uses existing `createSession` query with source session's planned fields
- `onSuccess`: invalidates `sessions.byWeek(targetWeekPlanId)` + shows toast
- `onError`: shows error toast
