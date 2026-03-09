# Quickstart: Test Suite & New Conventions

**Branch**: `005-tests-refactor`

---

## Running Tests

```bash
# Run all tests (watch mode)
pnpm test

# Run once with coverage report
pnpm test:coverage

# Run a specific test file
pnpm test app/test/unit/date.test.ts

# Run only integration tests
pnpm test app/test/integration
```

Coverage report outputs to `coverage/` (HTML) and terminal (text). Target: ≥ 60% lines/functions on `app/lib/**` and `app/components/**` (excluding `app/components/ui/**`).

---

## Writing a New Test

### Unit test (pure function)

```typescript
// app/test/unit/my-utility.test.ts
import { describe, it, expect } from 'vitest'
import { myFunction } from '~/lib/utils/my-utility'

describe('myFunction', () => {
  it('returns expected value for standard input', () => {
    expect(myFunction('2026-W10')).toBe('2026-03-02')
  })

  it('throws on invalid input', () => {
    expect(() => myFunction('bad-input')).toThrow('Invalid')
  })
})
```

### Integration test (React Query hook)

```typescript
// app/test/integration/useMyHook.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { renderWithProviders } from '~/test/utils/render'
import { useMyHook } from '~/lib/hooks/useMyHook'
import { mockMyQuery } from '~/lib/mock-data'

vi.mock('~/lib/queries/my-query', () => ({
  fetchMyData: mockMyQuery,
}))

describe('useMyHook', () => {
  it('loads data successfully', async () => {
    const { result } = renderHook(() => useMyHook('some-id'), {
      wrapper: ({ children }) => renderWithProviders(children).container.parentElement!,
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toMatchObject({ id: 'some-id' })
  })
})
```

### Integration test (component + routing)

```typescript
// app/test/integration/my-page.test.tsx
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '~/test/utils/render'
import MyPage from '~/routes/my-page'

describe('MyPage', () => {
  it('renders correctly for authenticated user', async () => {
    renderWithProviders(<MyPage />, {
      mockUser: { id: 'user-1', role: 'athlete', name: 'Alice', email: 'alice@test.com' },
      initialRoute: '/pl/athlete/week/2026-W10',
    })
    await waitFor(() => expect(screen.getByText(/Week 10/i)).toBeInTheDocument())
  })
})
```

---

## What NOT to Test

Follow the spec's philosophy: **test valuable journeys, not coverage numbers**.

| ✅ Test | ❌ Skip |
|--------|--------|
| `toSession` row mapper transforms DB rows correctly | React component renders a button |
| `getCurrentWeekId()` returns correct ISO format | `trainingTypeConfig` object has expected keys |
| Login with valid credentials → session established | Every mutation's `onSuccess` toast message |
| Session delete removes item from cache | A shadcn `<Button>` renders with the right class |

---

## URL Locale Convention

All in-app navigation must include the locale segment. Use the `useLocaleNavigate()` helper (added in P3):

```typescript
// Instead of:
navigate('/coach/week/2026-W10')

// Use:
const { locale } = useParams()
navigate(`/${locale}/coach/week/2026-W10`)
```

Or use the `useLocaleNavigate()` hook which auto-prepends the current locale.

---

## Release Process

Releases are **fully automated** on push to `main`. There is nothing to run locally.

Commit messages must follow Conventional Commits for correct version bumps:

| Prefix | Version bump | Example |
|--------|-------------|---------|
| `feat:` | minor (0.x.0) | `feat: add athlete notes field` |
| `fix:` | patch (0.0.x) | `fix: session date off by one` |
| `refactor:` | patch | `refactor: split mock-data module` |
| `chore:` | none | `chore: update dependencies` |
| `docs:` | none | `docs: update README` |
| `BREAKING CHANGE` in footer | major (x.0.0) | any commit with `BREAKING CHANGE: ...` footer |

To preview what would be released without actually releasing:
```bash
pnpm release-it --dry-run
```

---

## Mock Data Structure (after refactor)

```typescript
// All existing imports still work unchanged:
import { mockFetchSessionsByWeekPlan } from '~/lib/mock-data'

// The barrel re-exports from sub-modules:
// ~/lib/mock-data → ~/lib/mock-data/sessions.ts
//                → ~/lib/mock-data/weeks.ts
//                → ~/lib/mock-data/profile.ts
//                → ~/lib/mock-data/strava.ts
```

Test fixtures available:
- `athlete-1` (Alice): weeks W09, W10, W11 with detailed sessions
- `athlete-2` (Bob): week W10 only, beginner plan
- `coach-1`: has access to both athletes
