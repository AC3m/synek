# Research: Multi-Week Planning View & Copy/Drag

## Decision 1: Drag-and-Drop Library

**Decision**: `@dnd-kit/core` + `@dnd-kit/sortable`

**Rationale**:
- React 19 compatible (no legacy context API, no findDOMNode)
- Accessible by default (keyboard navigation, ARIA announcements)
- Tree-shakeable; `@dnd-kit/core` ~12 KB + `@dnd-kit/sortable` ~8 KB gzipped = ~20 KB total — within the 50 KB budget from Principle IV
- First-class support for both same-container sorting (within-day sort_order) and cross-container moves (between days)
- No HTML5 drag API dependency — works on touch devices

**Alternatives considered**:
- `react-beautiful-dnd` — deprecated by Atlassian; not maintained for React 18+
- `react-dnd` — older API surface, relies on HTML5 drag which has poor mobile support
- Native HTML5 drag-and-drop — viable but requires manual accessibility implementation

**Bundle documentation** (required by Constitution Principle IV):
- `@dnd-kit/core@6.x` — ~12 KB gzipped
- `@dnd-kit/sortable@8.x` — ~8 KB gzipped
- **Total addition: ~20 KB gzipped** — below the 50 KB threshold; no tree-shaking concern as the entire package is used

---

## Decision 2: Multi-Week Layout

**Decision**: Compact collapsible history rows above the current (editable) week

**Rationale**:
- Previous weeks are read-only; showing them full-size by default wastes vertical space
- Collapsed rows show week header + session count badge + "Copy week" action — enough for comparison without expanding
- Coach expands only the week they want to copy from — focused workflow
- Current editable week remains full-size and visually prominent at the bottom
- Collapsible state is local UI state (not persisted) — simplest implementation

**Layout (top to bottom)**:
```
▶ W09 — Feb 24–Mar 2  · 3 sessions  [Copy week ↓]    ← collapsed (default)
▶ W10 — Mar 3–9       · 5 sessions  [Copy week ↓]    ← collapsed
▼ W11 — Mar 10–16     · 2 sessions  [Copy week ↓]    ← expanded by user
  Mon    Tue    Wed    Thu    Fri    Sat    Sun
  [🏃]   [—]   [💪]   [—]   [—]   [—]   [—]
  Copy↓  Copy↓         Copy↓
▶ W12 — Mar 17–23     · 4 sessions  [Copy week ↓]    ← collapsed
══════════════════════════════════════════════════
W13 — Mar 24–30  (current — editable, DnD enabled)
  Mon    Tue    Wed    Thu    Fri    Sat    Sun
  [🏃]   [—]   [💪]   [—]   [—]   [—]   [—]
```

**Alternatives considered**:
- Vertical stack (all full-size) — too much scrolling; poor spatial efficiency
- Horizontal carousel — loses side-by-side comparison, defeats the purpose of multi-week review

---

## Decision 3: Copy Operation Mechanism

**Decision**: Supabase RPC stored procedure (new migration 021, purely additive)

**Rationale**:
- A single RPC call copies N sessions atomically in one round-trip vs N `INSERT` calls
- If any session fails to copy, the entire operation rolls back — no partial copies
- No risk to existing data: the migration only `CREATE OR REPLACE FUNCTION`; no `ALTER TABLE`, no `DROP`, no `UPDATE`
- Server-side function handles `sort_order` conflict resolution (append offset) cleanly
- Two functions needed: `copy_week_sessions` (all days) and `copy_day_sessions` (one day → one day)
- Individual session copy (P3 story) uses the existing `createSession` query — no RPC needed for single sessions

**What the migration does NOT do**:
- Does not alter any existing tables
- Does not modify any existing rows
- Does not add columns or constraints
- Does not affect RLS policies

**Alternatives considered**:
- Client-side parallel `createSession` calls — N network round-trips, non-atomic, partial failure possible
- Single server-side Edge Function — overkill; Postgres function is simpler and has direct table access

---

## Decision 4: DnD Scope

**Decision**: Both within-day reordering (sort_order) and between-day moves (day_of_week)

**Implementation approach**:
- Each `DayColumn` is both a `SortableContext` (for within-day ordering) and a droppable zone (for cross-day moves)
- Each `SessionCard` in the current week uses `useSortable` from @dnd-kit/sortable
- `onDragEnd` handler inspects `active.data.current.day` vs `over.data.current.day`:
  - Same day → update sort_order via existing `useUpdateSession` mutation
  - Different day → update both `dayOfWeek` and `sortOrder` via same mutation
- Previous-week session cards do NOT get drag handles; read-only enforcement at component level

---

## Decision 5: History Data Fetching

**Decision**: Parallel React Query queries per previous week (reuse existing query keys)

**Rationale**:
- 4 weeks × 2 queries (week plan + sessions) = 8 queries total — all cached by React Query
- Reuses existing `useWeekPlan` and `useSessions` hooks — no new query logic needed
- React Query deduplicates and caches — subsequent views of the same history week are free
- A single compound "fetch 4 weeks of history" query would require a new Supabase query and schema changes; not worth the added complexity for 4 items

**New hook needed**: `useWeekHistory(currentWeekId, count)` — a thin coordinator that computes previous weekIds and composes existing hooks, returning `{ weekId, weekPlan, sessions }[]`.

---

## Decision 6: Session Reorder Persistence

**Decision**: Use existing `useUpdateSession` mutation with `dayOfWeek` + `sortOrder` fields

**Rationale**:
- `training_sessions.day_of_week` and `training_sessions.sort_order` already exist
- `updateSession()` query already accepts both fields
- `useUpdateSession()` hook already implements the full optimistic-update cycle
- No new query or migration needed for DnD persistence
