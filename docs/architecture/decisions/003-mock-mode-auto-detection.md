# ADR-003: Mock Mode via Automatic Credential Detection

**Status**: Accepted
**Date**: 2025-01-01

## Context

The project needs to be runnable without real Supabase credentials — for local development without `.env.local`, for CI, and for component testing. Options evaluated:

1. Manual `VITE_MOCK_MODE=true` environment flag
2. Automatically detect missing/placeholder credentials at runtime
3. Separate mock server (MSW or similar)

## Decision

Mock mode activates automatically when Supabase credentials are absent or contain placeholder values. No manual flag needed.

```ts
// lib/supabase.ts
export const isMockMode =
  !import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.VITE_SUPABASE_URL === 'your-supabase-url'
```

Every query file exports both a real and a mock implementation, gated on `isMockMode`:

```ts
export async function fetchSessions(weekId: string) {
  if (isMockMode) return MOCK_SESSIONS.filter(s => s.weekId === weekId)
  // … real Supabase query
}
```

## Rationale

- Zero friction onboarding — clone and `pnpm dev` works immediately with no setup
- CI runs tests without secrets by omitting `VITE_SUPABASE_URL`
- Eliminates a whole class of test setup — no MSW config, no network interception
- Constitution Principle II: environment-specific behavior driven by configuration, not code branches

## Consequences

- Every new query file must export a mock implementation alongside the real one — this is a merge gate
- Mock data lives in `app/lib/mock-data/` split by domain
- Each mock module exports a `resetMockX()` function called in `beforeEach` to prevent state bleed between tests
- Mock resets must use deep clones (`SEED.map(i => ({ ...i }))`) — shallow copies cause inter-test pollution
- Real Supabase credentials go in `.env.local` (gitignored) — never committed
