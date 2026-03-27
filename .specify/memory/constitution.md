<!--
SYNC IMPACT REPORT
==================
Version change: 1.0.0 → 2.0.0
Bump rationale: MAJOR — all five principles renamed and redefined (backward-incompatible
  replacement of principle set); Development Workflow expanded with feature-branch,
  CI, commit-convention, and breaking-change requirements; Technology & Constraints
  expanded with security rules and secret-handling policy.

Modified principles:
  - I. Code Quality & Maintainability → I. Lean & Purposeful
  - II. Testing Standards → II. Configuration Over Hardcoding
  - III. User Experience Consistency → III. Type Safety & Boundary Validation
  - IV. Performance Requirements → IV. Modularity & Testability
  - V. Simplicity & Anti-Complexity → V. Performance & Operational Discipline

Added sections / subsections:
  - "Security & Secret Handling" subsection under Technology & Constraints
  - Feature-branch and CI requirements under Development Workflow
  - Commit conventions and breaking-change documentation requirements

Removed sections: none

Templates requiring updates:
  ✅ .specify/templates/plan-template.md — "Constitution Check" section is generic;
     gates should reference the five new principle names when filling out for Synek features.
  ✅ .specify/templates/spec-template.md — no structural changes required; Success Criteria
     section aligns with Principle V performance targets.
  ✅ .specify/templates/tasks-template.md — task categories unchanged; Polish phase tasks
     MUST include a quality-gate verification step per Principle V.
  ⚠  No command files found in .specify/templates/commands/ — nothing to update.

Deferred items: none
-->

# Synek Constitution

## Core Principles

### I. Lean & Purposeful

Every feature MUST map to a concrete user, business, or operational need before work begins:

- Features without a documented user, business, or operational justification MUST NOT be
  implemented.
- Speculative abstractions are forbidden — code is written for today's requirement, not
  imagined future ones (YAGNI).
- Any added complexity MUST be explicitly justified in the feature plan before implementation.
  "Nice to have" is not a justification.
- Helpers, utilities, and abstractions created for a single call site are forbidden — inline
  the logic instead.
- Backwards-compatibility shims, dead code, and unused exports MUST be removed completely
  rather than retained for hypothetical callers.

**Rationale**: Synek is a focused training planning tool. Keeping scope tight reduces maintenance
burden, accelerates delivery, and prevents the codebase from accumulating weight that slows
future changes.

### II. Configuration Over Hardcoding

Behavior that is expected to vary across environments, use cases, or supported variants MUST be
driven by configuration rather than embedded in core logic:

- Sport colors, labels, and metadata MUST live in `app/lib/utils/training-types.ts` — inventing
  inline color literals is forbidden.
- Environment-specific behavior (mock mode, Supabase credentials, feature URLs) MUST be
  controlled via `import.meta.env.VITE_*` variables, not compile-time conditionals in logic.
- Mock mode MUST activate automatically when Supabase credentials are absent/placeholder —
  no manual flag or code branch needed.
- Adding a new training type (sport) MUST require changes only to the configuration layer
  (`training-types.ts`, `training.ts`, type-fields, i18n) — no changes to rendering or
  routing scaffolding.
- i18n keys MUST be added to both `en/` and `pl/` namespaces simultaneously; partial
  translation ships are not acceptable.

**Rationale**: Configuration-driven extension keeps the core logic stable as the supported
feature set grows. It also makes the system testable in isolation (mock mode) without
environment dependencies.

### III. Type Safety & Boundary Validation

Strict typing MUST be enabled and preserved throughout the codebase:

- TypeScript strict mode MUST be satisfied at all times — `any` is forbidden; use `unknown`
  and narrow explicitly.
- Unsafe escape hatches (`as any`, `@ts-ignore`) are forbidden unless accompanied by an
  explicit comment explaining why the type system cannot be satisfied and reviewed in PR.
  The only accepted exception pattern is `as never` for dynamic i18n template-literal keys
  that TypeScript cannot verify.
- All external inputs (user forms, Supabase responses, Edge Function payloads, URL params)
  MUST be validated with Zod 4 at the system boundary before entering core logic.
- DB responses MUST pass through explicit row-mapper functions (`toMyType(row)`) that
  perform snake_case → camelCase mapping and type narrowing — raw DB rows MUST NOT flow
  into domain types.
- `pnpm typecheck` MUST pass with exit code 0 before any feature is considered complete.

**Rationale**: Type errors caught at compile time are orders of magnitude cheaper than bugs
caught in production. Strict boundary validation prevents malformed external data from
corrupting application state.

### IV. Modularity & Testability

Code units MUST be small, focused, and independently testable:

- Side effects (data fetching, mutations, subscriptions) MUST be isolated from presentation
  logic — all server state goes through `lib/hooks/` → `lib/queries/` → Supabase; no
  `useEffect` fetching and no `supabase.from()` calls in components.
- Every query file MUST export both a real Supabase implementation and a mock implementation
  usable for isolated testing — the mock MUST be the first implementation written.
- All React Query mutations MUST implement the full optimistic-update cycle:
  `onMutate` (cancel + snapshot) → `onError` (rollback) → `onSettled` (invalidate).
- State and responsibility MUST live at the lowest sensible scope — lift state only when
  genuinely shared across siblings; do not hoist to global context prematurely.
- Mock stores MUST use deep clones on reset (`SEED.map(i => ({ ...i }))`) to prevent
  mutation bleed between test cases.

**Rationale**: Decoupled, independently testable units allow parallel development, reliable
CI, and confident refactoring. Optimistic updates guarantee UI correctness under network
failure without coupling UI state to network timing.

### V. Performance & Operational Discipline

Performance MUST be considered at design time, not retrofitted after delivery:

- **Bundle discipline**: New dependencies MUST be evaluated for bundle impact before
  adoption; adding a package that increases the production bundle by more than 50 KB
  (gzipped) requires explicit documentation in the feature plan.
- **Query efficiency**: Supabase queries MUST select only required columns;
  `select('*')` is acceptable only in prototypes and MUST be removed before merge.
- **Interaction latency**: Optimistic updates MUST reflect user actions within one render
  frame (~16 ms) — no waiting on network for UI feedback.
- **Build and delivery gates**: `pnpm typecheck` and all tests MUST pass before merge;
  a PR that fails any quality gate MUST NOT be merged regardless of feature completeness.
- **Dependency policy**: Tree-shakeable packages are strongly preferred. Any major new
  framework or library requires a constitution amendment updating the Technology section.

**Rationale**: Athletes and coaches often use the platform on mobile or variable connections.
Fast, disciplined delivery directly affects training adherence. Enforcing gates at merge time
prevents regressions from accumulating.

## Technology & Constraints

The following stack versions are locked and MUST NOT be changed without a constitution
amendment:

| Layer | Technology | Version |
|---|---|---|
| UI Framework | React | 19 |
| Routing | React Router | 7 (SPA, `ssr: false`) |
| Language | TypeScript | 5 (strict) |
| Styling | Tailwind CSS | 4 (Vite plugin, not PostCSS) |
| Server State | TanStack Query | 5 |
| Backend | Supabase JS | 2 |
| Component Library | shadcn/ui | New York style |
| Internationalisation | i18next + react-i18next | current |
| Validation | Zod | 4 |
| Package Manager | pnpm | always — npm and yarn are forbidden |
| Date Operations | date-fns | 4 |

New dependencies MUST be evaluated against bundle impact (Principle V) and lean scope
(Principle I) before adoption. Any addition of a major new framework or library requires
updating this table via a constitution amendment.

### Security & Secret Handling

- Supabase credentials and all `VITE_*` secrets MUST NOT be committed to the repository.
  Use `.env.local` (gitignored) for local development.
- Public-facing registration and action forms MUST include a honeypot field to silently
  reject bot submissions (see `CLAUDE.md` security conventions).
- After invite-based registration, `signInWithPassword` MUST be called to issue a fresh
  session and discard any invite-page state (prevents session fixation).
- Edge Function callers MUST be verified via `anonClient.auth.getUser(jwt)` before any
  mutation; service-role client is restricted to admin operations only.
- Two-step confirmation is REQUIRED for destructive actions (e.g. account deletion):
  step 1 explains consequences; step 2 requires typing an exact confirmation value.
- Prefer `ON DELETE SET NULL` over `ON DELETE CASCADE` for audit-sensitive foreign keys
  to preserve history after user deletion.

## Development Workflow & Quality Gates

All work MUST follow the feature-branch workflow:

1. **Feature branch**: All work happens on a named branch (`###-feature-name`); direct
   commits to `main` are forbidden.
2. **Passing CI**: `pnpm typecheck` MUST exit with code 0; all tests MUST pass.
3. **Review approval**: At least one review approval is required before merge.
4. **Releasable main**: The `main` branch MUST be in a releasable state at all times;
   incomplete features MUST be gated behind a flag or kept off `main` until ready.

### Merge Gates (all MUST be satisfied)

1. **Type check passes**: `pnpm typecheck` exits with code 0 — no TypeScript errors.
2. **Mock parity**: Every new Supabase query has a corresponding mock implementation.
3. **i18n complete**: All new user-facing strings appear in both `en/` and `pl/` translation
   files.
4. **Optimistic updates**: Every mutation implements `onMutate`/`onError`/`onSettled`.
5. **No hardcoded colors**: All sport colors reference `training-types.ts` tokens.
6. **No direct DB access in components**: All data fetching goes through `lib/hooks/` →
   `lib/queries/`.
7. **Constitution check passed**: The `plan.md` for the feature documents how each relevant
   principle is satisfied, or explicitly justifies any violation.

Code review MUST verify all seven gates. A PR that fails any gate MUST NOT be merged
regardless of feature completeness.

### Commit Conventions

Commits MUST follow the Conventional Commits format:

```
<type>(<scope>): <short summary>
```

Accepted types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `perf`, `ci`.
Scope is optional but encouraged (e.g., `strength`, `auth`, `i18n`).

### Breaking Changes

Breaking changes (DB schema changes, API contract changes, removed exports, behavior
changes visible to users) MUST be documented in the PR description with an explicit
`BREAKING CHANGE:` footer in the commit message. Releases containing breaking changes
MUST increment the `CONSTITUTION_VERSION` MAJOR digit when they affect governed constraints.

## Governance

This constitution is the highest-authority document for Synek engineering decisions. It
supersedes any conflicting practice described elsewhere unless that practice is explicitly
referenced here.

**Amendment procedure**:
1. Propose the change in a PR with a clear rationale.
2. Bump the version according to semantic versioning rules:
   - MAJOR: principle removed, redefined in a backward-incompatible way, governance
     restructured, or stack constraint changed.
   - MINOR: new principle added, new section added, or existing principle materially expanded.
   - PATCH: clarifications, wording improvements, typo fixes.
3. Update `LAST_AMENDED_DATE` to the date the amendment is merged.
4. Run the consistency propagation checklist: verify `plan-template.md`, `spec-template.md`,
   `tasks-template.md`, and `CLAUDE.md` for conflicts.
5. Include a Sync Impact Report (HTML comment at top of this file) summarising all changes.

**Compliance review**: Every feature plan (`plan.md`) MUST contain a "Constitution Check"
section that gates implementation. Reviewers are responsible for verifying compliance at
PR time. Constitution violations are blocking unless explicitly approved with documented
rationale.

**Runtime guidance**: For day-to-day development patterns, refer to `CLAUDE.md`. For feature
planning, follow the `/speckit.*` workflow. This constitution defines the non-negotiable rules
that both documents must respect.

**Version**: 2.0.0 | **Ratified**: 2026-03-08 | **Last Amended**: 2026-03-27
