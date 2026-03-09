# Contract: Test Utilities

**File**: `app/test/utils/render.tsx` + `app/test/utils/query-client.ts`

---

## createTestQueryClient()

```typescript
function createTestQueryClient(): QueryClient
```

Returns a fresh `QueryClient` configured for test isolation:
- `queries.retry: false` — no retry loops in tests
- `queries.staleTime: 0` — no stale-while-revalidate cache hiding
- `mutations.retry: false`
- `gcTime: Infinity` — cache entries persist for the test duration (prevents unexpected refetches)

**Usage**: Create one per `describe` block (or per test for full isolation). Never share a client across test files.

---

## renderWithProviders(ui, options?)

```typescript
interface RenderWithProvidersOptions {
  mockUser?: {
    id: string
    role: 'coach' | 'athlete'
    name: string
    email: string
    avatarUrl?: string | null
    selectedAthleteId?: string | null
  }
  initialRoute?: string           // default: '/'
  routerConfig?: Parameters<typeof createMemoryRouter>[0]  // override route config
}

function renderWithProviders(
  ui: ReactNode,
  options?: RenderWithProvidersOptions
): ReturnType<typeof render> & { queryClient: QueryClient }
```

Wraps `ui` in:
1. `QueryClientProvider` (fresh `createTestQueryClient()`)
2. `AuthContext` with `mockUser` pre-seeded (or null/unauthenticated if omitted)
3. `RouterProvider` with `createMemoryRouter` if `initialRoute` is provided

**Returns**: All standard `@testing-library/react` render result properties + `queryClient` for direct cache inspection in assertions.

**Examples**:

```tsx
// Unauthenticated — login page test
const { getByRole } = renderWithProviders(<LoginPage />)

// Authenticated athlete
const { getByText } = renderWithProviders(<AthleteWeekPage />, {
  mockUser: { id: 'athlete-1', role: 'athlete', name: 'Alice', email: 'alice@test.com' },
  initialRoute: '/pl/athlete/week/2026-W10',
})

// Authenticated coach with selected athlete
const { getByText, queryClient } = renderWithProviders(<CoachWeekPage />, {
  mockUser: { id: 'coach-1', role: 'coach', name: 'Coach', email: 'coach@test.com', selectedAthleteId: 'athlete-1' },
  initialRoute: '/pl/coach/week/2026-W10',
})
// Inspect cache after mutation:
const sessions = queryClient.getQueryData(['sessions', 'week', 'week-plan-1'])
```
