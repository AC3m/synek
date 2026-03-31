# ADR-002: TanStack Query as the Server-State Layer

**Status**: Accepted
**Date**: 2025-01-01

## Context

Components need access to async Supabase data. Two approaches were evaluated:

1. `useEffect` + `useState` — fetch directly in components or hooks
2. TanStack Query (React Query) — dedicated server-state library

## Decision

Use TanStack Query 5. All server state flows through:

```
routes/ → lib/hooks/ → lib/queries/ → Supabase
                ↕
        React Query cache (single source of truth)
```

No `useEffect` for data fetching. No `supabase.from()` calls outside `lib/queries/`.

## Rationale

- Automatic cache invalidation prevents stale data across route transitions
- Built-in background refetch keeps coach and athlete calendars fresh
- Optimistic updates (required by constitution Principle IV) are trivially expressible via `onMutate`/`onError`/`onSettled`
- Query key factory (`lib/queries/keys.ts`) gives a single, inspectable registry of all server state
- Devtools give instant visibility into cache state during development

## Consequences

- Every mutation requires the full optimistic-update cycle (`onMutate`, `onError`, `onSettled`) — this is a non-negotiable pattern, not optional
- `enabled: !!id` guard is required on any query that depends on a runtime value to prevent fetching with `undefined`
- `onSettled` (not `onSuccess`) is the correct place for cache invalidation — it fires on both success and error
- All new data-fetching logic goes in `lib/hooks/` + `lib/queries/`, never in components or route files directly
