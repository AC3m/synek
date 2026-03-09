# Implementation Plan: Test Suite, Codebase Refactor, URL-Based Locale & Versioning

**Branch**: `005-tests-refactor` | **Date**: 2026-03-09 | **Spec**: `specs/005-tests-refactor/spec.md`

## Summary

Establish a Vitest-based test suite covering pure utilities, data-layer query functions (mock-mode), and React Query hook integration. Follow with a focused structural refactor to bring all files under 200 lines and route files to orchestration-only. Add URL-based locale (`/pl/`, `/en/`) with Polish as default. Automate changelog and versioning using `release-it` via GitHub Actions on merge to main.

---

## Technical Context

**Language/Version**: TypeScript 5 (strict), React 19
**Primary Dependencies**: React Router 7 (SPA, `ssr: false`), TanStack Query 5, Supabase JS 2, i18next + react-i18next, Zod 4, date-fns 4
**Storage**: Supabase (PostgreSQL) — mock mode used in all tests
**Testing**: Vitest 3 + `@testing-library/react` 16 + `@testing-library/user-event` 14 + `jsdom` environment + `@vitest/coverage-v8`
**Target Platform**: Browser SPA (Vite dev server, no SSR)
**Project Type**: Web application (SPA)
**Performance Goals**: Full test suite completes in < 60 s; zero regressions post-refactor
**Constraints**: No real Supabase credentials in tests; no new runtime beyond pnpm; bundle additions must stay within constitution Principle IV limits
**Scale/Scope**: ~75 source files; ~3500 LOC currently; 4 user stories across 3 technical layers

---

## Constitution Check

*GATE: Must pass before implementation. Re-checked after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality & Maintainability | ✅ PASS | Refactor enforces named exports, strict TS, `cn()`, path aliases — no new violations introduced |
| II. Testing Standards | ✅ PASS | Test suite specifically required by spec; mock implementations already exist in query files; optimistic-update cycle already implemented in hooks |
| III. UX Consistency | ✅ PASS | Locale change adds PL default; all strings already translated; language toggle updated, not replaced |
| IV. Performance Requirements | ✅ PASS | `vitest` + `@vitest/coverage-v8` are devDependencies only (zero bundle impact); `release-it` runs in CI only; React Router locale prefix adds no runtime overhead |
| V. Simplicity & Anti-Complexity | ✅ PASS | No new abstractions; tests use existing mock layer; `release-it` replaces a hand-rolled solution, not adding to one |

**Gate violations**: None. Implementation may proceed.

---

## Project Structure

### Documentation (this feature)

```text
specs/005-tests-refactor/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code Changes

```text
# New test infrastructure
app/
└── test/
    ├── setup.ts                     # Vitest global setup (jest-dom matchers)
    ├── utils/
    │   ├── render.tsx               # Custom render with QueryClient + AuthProvider wrapper
    │   └── query-client.ts          # createTestQueryClient() factory
    ├── unit/
    │   ├── date.test.ts             # date.ts utility functions
    │   ├── week-view.test.ts        # week-view.ts utility functions
    │   ├── query-keys.test.ts       # keys.ts factories
    │   ├── sessions-mapper.test.ts  # toSession row mapper
    │   └── weeks-mapper.test.ts     # toWeekPlan row mapper
    ├── integration/
    │   ├── useSessions.test.tsx     # Hook: fetch, create, update, delete
    │   ├── useWeekPlan.test.tsx     # Hook: fetch, getOrCreate, update
    │   ├── login.test.tsx           # Auth flow: valid/invalid credentials
    │   ├── coach-week-view.test.tsx # Coach: athlete select → sessions CRUD
    │   └── athlete-week-view.test.tsx # Athlete: read-only, completion toggle
    └── mocks/
        └── modules.ts               # vi.mock declarations for query modules

# Config files added at root
vitest.config.ts                     # Separate from vite.config.ts
.github/
└── workflows/
    └── release.yml                  # release-it on push to main

# Refactored source files (split, not deleted)
app/
├── lib/
│   ├── mock-data.ts                 # Split: mock-data/sessions.ts, mock-data/weeks.ts, mock-data/profile.ts
│   └── context/
│       └── AuthContext.tsx          # Extract useAuthInit.ts helper (init logic)
├── components/
│   └── training/
│       ├── SessionForm.tsx          # Split into SessionForm + SessionFormFields.tsx
│       └── type-fields/             # No change needed (already focused)
├── routes/
│   ├── coach/
│   │   └── week.$weekId.tsx         # Already 160 lines, may need minor extraction
│   └── athlete/
│       └── week.$weekId.tsx         # 91 lines, fine

# Locale routing
app/
├── routes.ts                        # All routes wrapped with /:locale prefix
├── i18n/
│   └── config.ts                   # Default lng → 'pl'; URL-driven locale detection
└── components/
    └── layout/
        └── LanguageToggle.tsx       # Updated to navigate to locale URL
```

---

## Complexity Tracking

No constitution violations requiring justification.

---

## Phase 0: Research

See `research.md` for full findings. Decisions summarised:

### Test Runner: Vitest 3

**Decision**: Vitest 3 + `@testing-library/react` 16 + `jsdom`
**Rationale**: Native Vite integration; no separate build pipeline; `vi.mock` syntax mirrors jest; `@vitest/coverage-v8` uses V8's built-in instrumentation (fast, no Babel). Happy-dom is faster but jsdom is more complete for React Testing Library's DOM interactions.
**Alternatives considered**: Jest — rejected because it requires a separate babel transform for ESM and Vite's plugin system (Tailwind CSS 4 plugin, path aliases) does not integrate.

### Vitest Config Strategy

**Decision**: Separate `vitest.config.ts` using `@vitejs/plugin-react` (NOT `reactRouter()` or `tailwindcss()`).
**Rationale**: The `reactRouter()` Vite plugin must be excluded — it intercepts module resolution in ways incompatible with Vitest's test runner. `tailwindcss()` must also be excluded — it is a no-op in jsdom and can cause transform errors. `@vitejs/plugin-react` handles JSX and is the correct plugin for tests. It is currently bundled inside `reactRouter()` in the production config, so it must be added as an explicit devDependency: `pnpm add -D @vitejs/plugin-react`.

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./app/test/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['app/lib/**', 'app/components/**'],
      exclude: ['app/components/ui/**', 'app/test/**'],
      thresholds: { lines: 60, functions: 60 },
    },
  },
})
```

### TanStack Query v5 Hook Testing

**Decision**: `createTestQueryClient()` factory that creates a new `QueryClient` per test with `retry: false` and `gcTime: 0`. Wrap each render in a `QueryClientProvider`.
**Rationale**: Each test gets an isolated cache; no state bleed between tests. The `renderWithProviders()` wrapper in `app/test/utils/render.tsx` accepts optional pre-seeded auth state so integration tests can fake an authenticated coach or athlete.

```typescript
// app/test/utils/query-client.ts
import { QueryClient } from '@tanstack/react-query'
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
}
```

### Mocking Supabase-Dependent Query Functions

**Decision**: `vi.mock('~/lib/queries/sessions')` at the top of each integration test, returning the already-exported mock functions from `mock-data.ts`.
**Rationale**: The query files already branch on `isMockMode`. Rather than relying on environment detection, tests vi.mock the entire query module and substitute mock implementations directly. This makes test intent explicit and removes dependency on `VITE_SUPABASE_URL` being unset.

```typescript
vi.mock('~/lib/queries/sessions', async () => {
  const { mockFetchSessionsByWeekPlan, mockCreateSession } = await import('~/lib/mock-data')
  return { fetchSessionsByWeekPlan: mockFetchSessionsByWeekPlan, createSession: mockCreateSession, /* … */ }
})
```

### React Router v7 Component Testing

**Decision**: Use `createMemoryRouter` + `RouterProvider` from `react-router` for route-level integration tests. For hook-only tests (no routing), skip the router wrapper.
**Rationale**: `MemoryRouter` is the legacy API; `createMemoryRouter` is the v7-native way and supports loaders/actions if needed later. Route components that call `useParams` or `useNavigate` need this wrapper.

### Changelog / Versioning: release-it

**Decision**: `release-it` with `@release-it/conventional-changelog` plugin
**Rationale**: release-it is a well-established (10M+ weekly npm downloads), zero-Ruby, zero-Python tool that works natively with pnpm. The `@release-it/conventional-changelog` plugin handles conventional-commit parsing, CHANGELOG.md generation (append-only, no overwrite), and semantic version bumping. It integrates cleanly with GitHub Actions via `GITHUB_TOKEN`. `semantic-release` was considered but is heavier (monorepo of plugins, requires more CI boilerplate) and the opinionated release pipeline is overkill for a single-package SPA.

**Bundle impact**: `release-it` is a `devDependency` only; zero production bundle impact.

**GitHub Actions workflow** (`release.yml`):
```yaml
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
        with: { fetch-depth: 0 }
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: pnpm install --frozen-lockfile
      - run: pnpm release-it --ci
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### URL-Based Locale Strategy

**Decision**: Add `/:locale` as a top-level layout route wrapping all authenticated routes. Redirect bare paths to `/pl/`. Language toggle navigates via `useNavigate`.
**Rationale**: React Router v7 supports parameterised layout routes. A single `LocaleLayout` component reads `:locale` from params, validates it (`pl` | `en`), calls `i18n.changeLanguage()`, and persists the choice. Unknown locale → redirect to `/pl/`.

---

## Phase 1: Design & Contracts

### Data Model

See `data-model.md`. No new database entities. This feature adds:
- Test fixtures (in-memory, derived from existing mock-data)
- A `locale` route param (derived from URL, validated against `['pl', 'en']`)
- A `version` field in `package.json` (already present, set to `0.0.0` → seeded to `0.1.0`)

### Interface Contracts

No external APIs added. Internal contracts documented in `contracts/`:
- `contracts/test-utilities.md` — shape of `renderWithProviders()` and `createTestQueryClient()`
- `contracts/locale-routing.md` — URL scheme and redirect rules

### Quickstart

See `quickstart.md` for developer onboarding to the new test setup.

---

## Implementation Order

Stories are sequenced strictly: P1 (tests) → P2 (refactor) → P3 (locale) → P4 (changelog). Each story has a gate: the full test suite must pass before the next story begins.

### P1 — Test Suite

1. Install devDependencies: `vitest`, `@vitest/coverage-v8`, `@vitejs/plugin-react`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `jsdom`
2. Create `vitest.config.ts` (separate from `vite.config.ts`, excludes `reactRouter()` plugin)
3. Add `"test": "vitest"` and `"test:coverage": "vitest --coverage"` scripts to `package.json`
4. Create `app/test/setup.ts` (extends jest-dom matchers)
5. Create `app/test/utils/query-client.ts` and `app/test/utils/render.tsx`
6. Write unit tests for `date.ts` (all 6 exported functions)
7. Write unit tests for `sessions.ts` `toSession` mapper (via extracted export)
8. Write unit tests for `weeks.ts` `toWeekPlan` mapper (via extracted export)
9. Write unit tests for `query keys.ts` factories
10. Write integration test: `useSessions` hook (fetch, create, update, delete states)
11. Write integration test: `useWeekPlan` hook (fetch, getOrCreate, update)
12. Write integration test: login flow (valid → redirect, invalid → error)
13. Write integration test: coach week view (athlete selection, session CRUD)
14. Write integration test: athlete week view (read-only display, completion toggle)
15. Run `pnpm test:coverage` → verify ≥ 60% coverage on target files

### P2 — Refactor

1. **Split `mock-data.ts`** (1012 lines): extract into `app/lib/mock-data/sessions.ts`, `weeks.ts`, `profile.ts`, `strava.ts`; keep `app/lib/mock-data/index.ts` as re-export barrel (barrel is justified: avoids touching every import site)
2. **Split `SessionForm.tsx`** (398 lines): extract form-field rendering into `SessionFormFields.tsx`; `SessionForm.tsx` keeps only state + submit logic
3. **Audit `AuthContext.tsx`** (270 lines): extract session-init logic into `useAuthInit.ts` if it brings the main file under 200 lines
4. **Audit route files**: `week.$weekId.tsx` (coach, 160 lines) — inline helpers may need extraction; athlete route (91 lines) is fine
5. Run `pnpm typecheck` → zero errors
6. Run `pnpm test` → all tests pass (no regressions)

### P3 — URL-Based Locale

1. Update `app/routes.ts`: wrap coach + athlete + settings routes under `/:locale` layout
2. Create `app/routes/locale-layout.tsx`: reads `:locale` param, validates, calls `i18n.changeLanguage()`, redirects unknown → `/pl/`
3. Update `app/i18n/config.ts`: set `lng: 'pl'` as default (remove localStorage fallback)
4. Update `LanguageToggle.tsx`: use `useNavigate` to switch locale segment in URL; persist to `localStorage` for returning users
5. Update `app/routes/home.tsx`: redirect `/` → `/pl/` or stored locale
6. Add i18n translation keys for any new UI text (added to both `en/` and `pl/`)
7. Run integration tests → verify locale preservation across navigation
8. Run `pnpm typecheck` → zero errors

### P4 — Changelog & Versioning

1. Install `release-it` + `@release-it/conventional-changelog` as devDependencies
2. Create `.release-it.json` config: conventional changelog plugin, GitHub releases, `package.json` version bump
3. Set `package.json` version to `0.1.0`
4. Create `CHANGELOG.md` with `v0.1.0` historical baseline entry (features 001–005)
5. Create `.github/workflows/release.yml` (as per research section above)
6. Add `"release": "release-it"` script to `package.json`
7. Verify with a dry run: `pnpm release-it --dry-run`

---

## Risks & Mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| `reactRouter()` Vite plugin conflicts with Vitest module resolution | Medium | Use separate `vitest.config.ts` that excludes the plugin; confirmed pattern in React Router v7 community |
| `toSession` / `toWeekPlan` mappers are not exported (private) | High | Export them from their query files so unit tests can import directly; no API contract change |
| URL locale prefix breaks existing Strava OAuth redirect URIs | Low | Strava redirect uses `VITE_APP_URL` env var (absolute URL); not affected by route structure changes |
| `release-it` CI token permissions | Low | Workflow requires `permissions: contents: write`; documented in quickstart |
| mock-data.ts split causes import path churn | Medium | Re-export barrel at `mock-data/index.ts` keeps all existing import sites working |
