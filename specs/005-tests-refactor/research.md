# Research: Test Suite, Refactor, Locale, Versioning

**Branch**: `005-tests-refactor` | **Date**: 2026-03-09

---

## 1. Vitest with React Router v7 + React 19

**Decision**: Vitest 3 + jsdom environment + separate `vitest.config.ts`

**Rationale**: The `reactRouter()` Vite plugin hooks into module resolution in ways that conflict with Vitest's test runner (specifically module pre-bundling and virtual module handling for routes). The solution is a dedicated `vitest.config.ts` that loads only the plugins safe for test execution: `tailwindcss()` and `tsconfigPaths()`.

**Packages needed**:
```
pnpm add -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
```

Expected versions (compatible with React 19):
- `vitest` ^3.x
- `@testing-library/react` ^16.x (React 19 support added in 16.0)
- `@testing-library/user-event` ^14.x
- `@testing-library/jest-dom` ^6.x
- `jsdom` ^25.x

**Environment choice (jsdom vs happy-dom)**:
- `jsdom` is the safe default: fuller spec compliance, required for some `@testing-library/react` queries
- `happy-dom` is ~2–3× faster but misses some DOM APIs; not worth the risk for integration tests involving form events and navigation

**Alternatives considered**: Jest — rejected. Jest requires babel transforms to handle ESM imports and does not integrate with Vite plugins (Tailwind CSS 4 uses a Vite plugin, not PostCSS; path aliases via `vite-tsconfig-paths` would need manual jest `moduleNameMapper` setup). Vitest has zero additional configuration cost for this stack.

---

## 2. Vitest Config (separate from vite.config.ts)

**Critical**: Use `@vitejs/plugin-react` (not `tailwindcss()` or `reactRouter()`).
- `reactRouter()` must be excluded — it breaks Vitest module resolution.
- `tailwindcss()` must be excluded — it's a no-op in jsdom and can cause transform errors.
- `@vitejs/plugin-react` handles JSX transform for tests (currently bundled inside `reactRouter()` in the app config, so it needs to be added as an explicit devDependency).

```bash
pnpm add -D @vitejs/plugin-react
```

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [
    react(),          // JSX transform — NOT reactRouter()
    tsconfigPaths(),  // keeps ~/ path alias working
    // Do NOT include tailwindcss() — no-op in jsdom, can cause transform errors
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./app/test/setup.ts'],
    include: ['app/test/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['app/lib/**', 'app/components/**'],
      exclude: ['app/components/ui/**', 'app/test/**'],
      reporter: ['text', 'html'],
      thresholds: { lines: 60, functions: 60 },
    },
  },
})
```

`globals: true` enables `describe`, `it`, `expect`, `vi` without imports in test files.

`setupFiles` runs before each test file to register `@testing-library/jest-dom` matchers.

**`app/test/setup.ts`:**
```typescript
import '@testing-library/jest-dom'

// Initialize i18n with empty resources for tests — avoids missing-key warnings
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  resources: { en: { common: {}, coach: {}, athlete: {}, training: {} } },
  interpolation: { escapeValue: false },
})
```

---

## 3. TanStack Query v5 Hook Testing Pattern

**Decision**: `createTestQueryClient()` + `renderWithProviders()` wrapper

Every test gets a fresh `QueryClient` instance (no shared state) with retries disabled.

```typescript
// app/test/utils/query-client.ts
import { QueryClient } from '@tanstack/react-query'

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0 },
      mutations: { retry: false },
    },
  })
}
```

```tsx
// app/test/utils/render.tsx
import { QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { RenderOptions } from '@testing-library/react'
import type { ReactNode } from 'react'
import { createTestQueryClient } from './query-client'

interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  mockUser?: { id: string; role: 'coach' | 'athlete'; name: string; email: string }
}

export function renderWithProviders(
  ui: ReactNode,
  options: RenderWithProvidersOptions = {}
) {
  const queryClient = createTestQueryClient()
  const { mockUser, ...renderOptions } = options

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {/* AuthProvider mock or real depending on test */}
        {children}
      </QueryClientProvider>
    )
  }

  return { ...render(ui, { wrapper: Wrapper, ...renderOptions }), queryClient }
}
```

---

## 4. Mocking Query Modules (Supabase-free tests)

**Decision**: `vi.mock('~/lib/queries/sessions')` substituting mock implementations directly.

Query files already export `mockFetchSessionsByWeekPlan`, etc. Tests import these and wire them via vi.mock:

```typescript
vi.mock('~/lib/queries/sessions', async () => {
  const mockData = await import('~/lib/mock-data')
  return {
    fetchSessionsByWeekPlan: mockData.mockFetchSessionsByWeekPlan,
    createSession: mockData.mockCreateSession,
    updateSession: mockData.mockUpdateSession,
    deleteSession: mockData.mockDeleteSession,
    updateAthleteSession: mockData.mockUpdateAthleteSession,
  }
})
```

This is explicit and test-intent is clear. It does not rely on `VITE_SUPABASE_URL` being absent.

**Important**: `vi.mock` calls are hoisted to the top of the file by Vitest (same as Jest). The async import inside the factory is needed to avoid circular reference issues with the mock-data module.

---

## 5. React Router v7 Component Testing

**Decision**: `createMemoryRouter` + `RouterProvider` for route-level integration tests.

```tsx
import { createMemoryRouter, RouterProvider } from 'react-router'
import { render } from '@testing-library/react'

const router = createMemoryRouter([
  {
    path: '/coach/week/:weekId',
    element: <CoachWeekPage />,
  },
], {
  initialEntries: ['/coach/week/2026-W10'],
})

render(
  <QueryClientProvider client={createTestQueryClient()}>
    <RouterProvider router={router} />
  </QueryClientProvider>
)
```

For hooks that only use `useNavigate` or `useParams`, wrap the component in `RouterProvider`. For hooks with no routing dependency, skip the router wrapper entirely.

**Alternatives considered**: `MemoryRouter` — the v6/legacy API, still works in v7 but not idiomatic. The `createMemoryRouter` API is the v7-native approach and better aligns with future test evolution.

---

## 6. Changelog/Versioning: release-it vs semantic-release

### release-it (chosen)

- **npm downloads**: ~10M/week
- **pnpm compatible**: yes — runs as a CLI tool in devDependencies
- **Conventional commits**: via `@release-it/conventional-changelog` plugin (wraps `conventional-changelog-core`)
- **CHANGELOG behaviour**: append-only prepend — never overwrites existing content (satisfies FR-029)
- **GitHub integration**: creates GitHub releases via `GITHUB_TOKEN`; optional PR/issue links in changelog
- **Config**: single `.release-it.json` file

```json
{
  "plugins": {
    "@release-it/conventional-changelog": {
      "preset": "angular",
      "infile": "CHANGELOG.md"
    }
  },
  "git": {
    "commitMessage": "chore: release v${version}",
    "tagName": "v${version}"
  },
  "github": {
    "release": true,
    "releaseName": "v${version}"
  },
  "npm": {
    "publish": false
  }
}
```

### semantic-release (rejected)

- More opinionated, designed for library publishing workflows
- Requires multiple plugins (`@semantic-release/commit-analyzer`, `@semantic-release/changelog`, `@semantic-release/git`, `@semantic-release/github`) to achieve the same result
- The `prepare` phase runs locally in CI and can conflict with lock-file-frozen installs
- Overkill for a single SPA with no npm publishing requirement

---

## 7. GitHub Actions Release Workflow

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0   # full history needed for changelog generation

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Release
        run: pnpm release-it --ci
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

`--ci` flag skips interactive prompts and uses the version bump inferred from commits since the last tag.

---

## 8. URL-Based Locale (React Router v7)

**Decision**: Top-level `/:locale` parameterised layout route

React Router v7 supports `layout()` with a path prefix. All authenticated routes nest under `/:locale`. A `LocaleLayout` component:
1. Reads `params.locale`
2. If unsupported → `<Navigate to="/pl/..." replace />`
3. Calls `i18n.changeLanguage(locale)` (synchronous in-memory operation)
4. Persists locale to `localStorage`
5. Renders `<Outlet />`

The home route (`/`) redirects to `/pl/` (or stored locale).

`routes.ts` structure:
```typescript
route(':locale', 'routes/locale-layout.tsx', [
  index('routes/home.tsx'),
  ...prefix('coach', [
    layout('routes/coach/layout.tsx', [
      index('routes/coach/week.tsx'),
      route('week/:weekId', 'routes/coach/week.$weekId.tsx'),
    ]),
  ]),
  ...prefix('athlete', [...]),
  route('settings', 'routes/settings.tsx'),
])
```

The `LanguageToggle` currently reads from localStorage. It will be updated to use `useNavigate` and construct the new URL by replacing the locale segment:

```typescript
const navigate = useNavigate()
const { locale } = useParams()

function handleSwitch(newLocale: string) {
  const newPath = location.pathname.replace(`/${locale}/`, `/${newLocale}/`)
  navigate(newPath)
  localStorage.setItem('locale', newLocale)
}
```

---

## 9. Refactor Scope — File Size Audit

Files currently exceeding 200 lines:

| File | Lines | Action |
|------|-------|--------|
| `app/lib/mock-data.ts` | 1012 | Split into `mock-data/sessions.ts`, `mock-data/weeks.ts`, `mock-data/profile.ts`, `mock-data/strava.ts` with barrel re-export |
| `app/components/training/SessionForm.tsx` | 398 | Extract field rendering to `SessionFormFields.tsx`; form keeps state + submit |
| `app/lib/context/AuthContext.tsx` | 270 | Extract `useAuthInit()` hook (session restoration + athlete loading logic) |

Files close to 200 lines (monitor, may not need splitting):

| File | Lines |
|------|-------|
| `app/routes/coach/week.$weekId.tsx` | 160 |
| `app/lib/queries/sessions.ts` | 180 |

All other files are well within limits.
