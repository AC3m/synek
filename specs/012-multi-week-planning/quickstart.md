# Quickstart: Multi-Week Planning View & Copy/Drag

## What this feature adds

- **4 collapsible history week rows** above the current editable week on the coach planning page
- **Copy actions** at three granularities: whole week, single day, individual session
- **Drag-and-drop** to reorder sessions within a day or move them between days

## New dependencies

```bash
pnpm add @dnd-kit/core @dnd-kit/sortable
```

## New migration

```bash
supabase migration new copy_sessions_rpc
# Edit supabase/migrations/021_copy_sessions_rpc.sql
supabase db push   # or supabase migration up
```

## Key files

| File | Change |
|------|--------|
| `supabase/migrations/021_copy_sessions_rpc.sql` | New — two stored procedures |
| `app/lib/queries/sessions.ts` | Add `copyWeekSessions`, `copyDaySessions` + mocks |
| `app/lib/hooks/useSessions.ts` | Add `useCopyWeekSessions`, `useCopyDaySessions`, `useCopySession` |
| `app/lib/hooks/useWeekHistory.ts` | New — `useWeekHistory(weekId, count)` hook |
| `app/components/calendar/MultiWeekView.tsx` | New — top-level multi-week container |
| `app/components/calendar/HistoryWeekRow.tsx` | New — collapsible read-only week row |
| `app/components/calendar/WeekGrid.tsx` | Add DnD context + `onReorderSession` prop |
| `app/components/calendar/DayColumn.tsx` | Add droppable zone + copy-day button |
| `app/components/training/SessionCard.tsx` | Add drag handle + `onCopy` prop |
| `app/routes/coach/week.$weekId.tsx` | Replace `WeekGrid` with `MultiWeekView` |
| `app/i18n/resources/en/coach.json` | New history/copy keys |
| `app/i18n/resources/pl/coach.json` | Polish translations |

## How history weeks are fetched

`useWeekHistory(currentWeekId, 4)` computes the 4 previous ISO week IDs, then uses existing
`useWeekPlan` + `useSessions` hooks for each. All 8 queries run in parallel and are cached by
React Query — repeat page visits are instant.

## How copy works

1. **Copy week** → calls `copy_week_sessions` RPC (one atomic DB call)
2. **Copy day** → calls `copy_day_sessions` RPC (one atomic DB call, appends to target day)
3. **Copy session** → calls existing `createSession` with source session's planned fields

All copies are **independent** — changes to the copy don't affect the original.
Only **planned fields** are copied; actual performance, Strava, and Garmin data are never copied.

## How drag-and-drop works

- Drag handle (⋮⋮ icon) appears on session cards in the current week
- Drop indicator (highlighted border) shows on target day column during drag
- On drop in **same day** → updates `sort_order` via `useUpdateSession`
- On drop in **different day** → updates `day_of_week` + `sort_order` via `useUpdateSession`
- Both use optimistic updates — UI responds instantly, rolls back on error
- Previous-week session cards have no drag handles (read-only)

## Verify it works

```bash
pnpm typecheck          # must exit 0
pnpm dev                # smoke test in browser
```

Manual checklist:
- [ ] History section shows 4 previous weeks (collapsed by default)
- [ ] Clicking chevron expands a history week to full read-only grid
- [ ] "Copy week ↓" button copies all sessions to current week
- [ ] "Copy day ↓" button in day header copies that day's sessions to current week (same day)
- [ ] Copy icon on a session card lets you pick a target day and copies one session
- [ ] Dragging a session card to another day moves it (persists on refresh)
- [ ] Dragging a session within the same day changes its order (persists on refresh)
- [ ] Drag cancelled mid-air restores original position
- [ ] All text is translated (toggle to PL locale to verify)
