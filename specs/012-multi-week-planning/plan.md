# Implementation Plan: Multi-Week Planning View & Copy/Drag

**Branch**: `012-multi-week-planning` | **Date**: 2026-03-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/012-multi-week-planning/spec.md`

## Summary

Add a multi-week planning view to the coach's week page: 4 collapsible history week rows above the current editable week, full copy support (week/day/session), and drag-and-drop session reordering both within days and across days. Copy operations use two new Supabase stored procedures. DnD is powered by @dnd-kit.

## Technical Context

**Language/Version**: TypeScript 5 (strict)
**Primary Dependencies**: React 19, React Router 7 (SPA), TanStack Query 5, Supabase JS 2, @dnd-kit/core + @dnd-kit/sortable (new, ~20 KB gzipped), date-fns 4, shadcn/ui (New York), i18next
**Storage**: PostgreSQL via Supabase — two new stored procedures in migration 021 (additive only; no schema changes)
**Testing**: Vitest 4, @testing-library/react 16
**Target Platform**: Desktop web (≥ 1024px primary); mobile remains single-week scrollable view
**Project Type**: Web SPA (React, `ssr: false`)
**Performance Goals**: Copy operation visible within 2s; DnD drop persists within 1s; no layout shift on expand/collapse of history rows
**Constraints**: Bundle addition ≤ 50 KB gzipped (actual: ~20 KB); optimistic updates required for all mutations
**Scale/Scope**: 4 history weeks × coach's current athlete selection; 8 parallel React Query requests on page load (acceptable, all cached)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Gate | Status |
|-----------|------|--------|
| **I. Code Quality** | Named exports, `cn()`, `~/` imports, row mappers, no inline queries | ✅ All new components follow conventions; copy queries go in `lib/queries/sessions.ts` |
| **II. Testing Standards** | Mock implementations for new query functions, full optimistic-update cycle on all mutations | ✅ `copyWeekSessions` and `copyDaySessions` will have mock variants; all 3 copy mutations + reorder mutation implement `onMutate/onError/onSettled` |
| **III. UX Consistency** | Sport colors from `training-types.ts`, all strings via i18next (EN+PL), shadcn components via CLI | ✅ History rows reuse existing sport badge colors; new i18n keys added to both locales |
| **IV. Performance** | New dependency bundle impact documented; optimistic updates within 1 render frame | ✅ @dnd-kit ~20 KB gzipped documented; DnD moves use optimistic updates |
| **V. Simplicity** | No useEffect for data, no premature abstractions, YAGNI | ✅ `useWeekHistory` composes existing hooks rather than creating new query logic; no new query keys needed |

**Post-design re-check**: All gates confirmed. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/012-multi-week-planning/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/
│   ├── rpc.md           ← RPC signatures
│   └── components.md    ← component API contracts
└── tasks.md             ← Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
app/
├── components/
│   ├── calendar/
│   │   ├── MultiWeekView.tsx          NEW — container for history rows + current week
│   │   ├── HistoryWeekRow.tsx         NEW — single collapsible read-only week row
│   │   ├── WeekGrid.tsx               MODIFIED — DnD context wrapper when onReorderSession provided
│   │   └── DayColumn.tsx              MODIFIED — droppable zone + copy-day button
│   └── training/
│       └── SessionCard.tsx            MODIFIED — draggable handle + onCopy prop
├── lib/
│   ├── queries/
│   │   └── sessions.ts                MODIFIED — copyWeekSessions(), copyDaySessions() + mocks
│   └── hooks/
│       ├── useSessions.ts             MODIFIED — useCopyWeekSessions, useCopyDaySessions, useCopySession
│       └── useWeekHistory.ts          NEW — composes existing hooks for N previous weeks
├── routes/
│   └── coach/
│       └── week.$weekId.tsx           MODIFIED — MultiWeekView replaces bare WeekGrid
└── i18n/
    └── resources/
        ├── en/coach.json              MODIFIED — new copy/history i18n keys
        └── pl/coach.json              MODIFIED — Polish translations

supabase/
└── migrations/
    └── 021_copy_sessions_rpc.sql      NEW — copy_week_sessions + copy_day_sessions functions
```

**Structure Decision**: Single-project web app; no new routes. The coach week view page (`week.$weekId.tsx`) is updated in-place to render `MultiWeekView` instead of `WeekGrid` directly. All DnD logic is encapsulated in the calendar layer components.

## Implementation Phases

### Phase A — Database (migration 021)
1. Write `supabase/migrations/021_copy_sessions_rpc.sql`
   - `copy_week_sessions(source_week_plan_id, target_week_plan_id)` → integer
   - `copy_day_sessions(source_week_plan_id, source_day, target_week_plan_id, target_day)` → integer
   - Both SECURITY DEFINER, planned-fields only
2. Apply locally via `supabase db push` or `supabase migration up`

### Phase B — Query & Hook Layer
1. Add `copyWeekSessions()` and `copyDaySessions()` to `app/lib/queries/sessions.ts` (real + mock)
2. Add `useCopyWeekSessions`, `useCopyDaySessions`, `useCopySession` to `app/lib/hooks/useSessions.ts`
3. Create `app/lib/hooks/useWeekHistory.ts`
4. Add i18n keys (EN + PL) for copy confirmation toasts and history labels

### Phase C — DnD Infrastructure
1. `pnpm add @dnd-kit/core @dnd-kit/sortable`
2. Modify `SessionCard.tsx` — add `draggable` prop + `useSortable` integration + drag handle
3. Modify `DayColumn.tsx` — add `droppable` prop + `useDroppable` integration + drop indicator
4. Modify `WeekGrid.tsx` — add `DndContext` + `onDragEnd` handler when `onReorderSession` provided

### Phase D — History UI
1. Create `HistoryWeekRow.tsx` — collapsible row, summary header, read-only grid with copy actions
2. Create `MultiWeekView.tsx` — orchestrates history rows + current WeekGrid + copy handlers
3. Modify `week.$weekId.tsx` — replace `<WeekGrid>` with `<MultiWeekView>`, wire copy mutations

### Phase E — Polish & Type Check
1. `pnpm typecheck` — resolve all TypeScript errors
2. Verify all i18n keys present in both `en/` and `pl/`
3. Test mock mode (history weeks with mock data)
4. Manual smoke test: copy week, copy day, copy session, drag within day, drag between days

## Complexity Tracking

No constitution violations. All patterns are extensions of existing conventions.

| New item | Justification |
|----------|---------------|
| `@dnd-kit` dependency | No HTML5 DnD alternative is accessible or React 19 compatible at comparable bundle size |
| `SECURITY DEFINER` on RPCs | Required for atomic multi-row INSERT; function executes with definer's privileges so RLS on target table is bypassed inside the function — acceptable because caller is verified by the app's auth middleware before the RPC is invoked |
