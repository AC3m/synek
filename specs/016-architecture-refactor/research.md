# Research: Architecture Refactor

All decisions resolved through direct codebase analysis. No external unknowns.

---

## Decision 1: Module Topology

**Decision**: Feature + role module split.
- Feature modules (`calendar`, `training`, `goals`, `stats`, `strength`, `settings`) are pure libraries: components, hooks, queries, tests, i18n — no page-level orchestration.
- Role modules (`athlete`, `coach`) are page-composition layers that import from feature modules.

**Why**: Separates "what the feature can do" from "how a role experiences it". Athlete and coach views share the same feature components but compose them differently (permissions, layout). Keeping composition in role modules keeps feature modules clean and reusable.

**Alternatives considered**:
- Feature modules contain both athlete and coach pages → rejected: conflates feature capability with role-specific view composition
- Single flat structure with naming conventions only → rejected: the current state; doesn't enforce boundaries

---

## Decision 2: `createQueryKeys` Factory

**Decision**: Custom implementation, zero external dependencies.

API:
```ts
const calendarKeys = createQueryKeys('calendar', {
  weeks: null,                                                      // static key
  weekByDate: (id: string, start: string) => [id, start] as const, // dynamic key
})
// calendarKeys._root                        → ['calendar']
// calendarKeys.weeks.queryKey               → ['calendar', 'weeks']
// calendarKeys.weekByDate(id, s).queryKey   → ['calendar', 'weekByDate', id, s]
```

Static keys return `{ _root: [...], queryKey: [...] }`. Dynamic keys are callable functions with an additional `_root` property for broad invalidation.

**Why**: The existing `as const` array approach works but couples key strings to specific files with no structural enforcement. A factory: (a) scopes all keys to the module name, (b) makes broad invalidation explicit via `_root`, (c) is fully type-safe. Zero deps aligns with Principle V (bundle discipline).

**Alternatives considered**:
- `@lukemorales/query-key-factory` → rejected: adds a dependency; the library's full API surface is larger than needed
- Keep `as const` arrays, just enforce co-location → rejected: doesn't prevent cross-module key collisions or add type-level module scoping

---

## Decision 3: Route Files as Thin Wrappers

**Decision**: Route files (React Router 7 file convention) export the page default from the role module barrel. Routes with `meta` also re-export it.

```tsx
// app/routes/athlete/week.$weekId.tsx
export { AthleteWeekPage as default } from '~/modules/athlete'

// app/routes/landing.tsx (has meta)
export { LandingPage as default, meta } from '~/modules/landing'
```

**Confirmed**: No routes use `loader`, `action`, `clientLoader`, or `clientAction`. Only 5 routes have `meta` exports (home, login, register, landing, invite).

**Why**: React Router 7's file-based routing requires files to exist in `routes/`. Moving page logic to `modules/<feature>/pages/` keeps all feature code within the module boundary. Route files become mechanical wiring.

**Alternatives considered**:
- Keep route files with full page logic, update imports to module paths → rejected: route files retain feature logic outside the module boundary
- Programmatic routing config instead of file-based → rejected: significant RR7 config changes; breaks established conventions

---

## Decision 4: i18n Strategy

**Decision**: Move `app/i18n/` → `app/core/i18n/` (directory rename only). Keep existing namespace names (`athlete`, `coach`, `common`, `training`, `landing`). Each module gets an `i18n/` directory for future per-module additions; no namespace renames in this refactor.

**Why**: Renaming namespaces would require updating every `useTranslation()` call — high churn risk for zero behavioural benefit in a structural refactor. The i18n loader path update is minimal (1 line in config). Namespace restructuring is a follow-up task.

**Alternatives considered**:
- Full namespace rename per module → rejected: O(N) `useTranslation()` updates; silent runtime failures (returns key instead of translation); out of scope

---

## Decision 5: Test Co-location

**Decision**: Tests move to live next to the source file they test (`.spec.ts` / `.spec.tsx`). vitest `include` updated from `app/test/**/*.test.{ts,tsx}` to `app/**/*.{test,spec}.{ts,tsx}`. Test utilities (`setup.ts`, `render.tsx`, `query-client.ts`) move to `app/core/test/`.

**Why**: Co-location eliminates the "where is the test for X?" question. A deleted source file visibly orphans its test.

**Alternatives considered**:
- Keep tests in `app/test/` → rejected: incompatible with module structure goal; mirror structure creates implicit coupling
- `__tests__/` directories per module → rejected: still separated; not materially better than current layout

---

## Decision 6: ErrorBoundary Pattern

**Decision**: Class component `ErrorBoundary` with `ErrorBoundaryContext` and `useErrorBoundary()` hook. Mounted at root; sections call `resetError()` imperatively.

**Why**: Synek has no formal error boundary. Without one, rendering errors propagate and crash the full app. The pattern adds both declarative wrapping and imperative reset (needed for form/query-error recovery). Owned implementation, no dependency.

**Alternatives considered**:
- `react-error-boundary` library → rejected: adds a dependency; the pattern is simple enough to own
- Declarative-only boundary → rejected: doesn't support the imperative reset use case

---

## Decision 7: Regression Safety Protocol

**Decision**: `pnpm typecheck && pnpm test:run` must be green before advancing to the next module. Browser smoke test in mock mode after each role module phase. vitest `include` updated in Phase 1 before any file moves.

**Key gap identified**: No page-level render tests currently exist. Smoke render tests for all page components are added as part of the role module migrations (US4).

**Why this is sufficient**: This is a pure structural refactor — no logic changes. TypeScript strict mode catches all import breaks. Tests catch behavioural regressions. Browser smoke validates rendering. If types and tests pass, behaviour is preserved.
