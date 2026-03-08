<!--
SYNC IMPACT REPORT
==================
Version change: [template] → 1.0.0
Bump rationale: MINOR — first population of all placeholder tokens; principles added and governance defined.

Modified principles:
  - [PRINCIPLE_1_NAME] → I. Code Quality & Maintainability (new)
  - [PRINCIPLE_2_NAME] → II. Testing Standards (new)
  - [PRINCIPLE_3_NAME] → III. User Experience Consistency (new)
  - [PRINCIPLE_4_NAME] → IV. Performance Requirements (new)
  - [PRINCIPLE_5_NAME] → V. Simplicity & Anti-Complexity (new)

Added sections:
  - "Technology & Stack Constraints" (replaces [SECTION_2_NAME])
  - "Development Workflow & Quality Gates" (replaces [SECTION_3_NAME])
  - Governance (populated)

Removed sections: none

Templates requiring updates:
  ✅ .specify/templates/plan-template.md — "Constitution Check" section already generic; gates should reference the five principles by name when filling out for Synek features.
  ✅ .specify/templates/spec-template.md — "Success Criteria" section aligns with Principle IV performance targets; no structural change needed.
  ✅ .specify/templates/tasks-template.md — Task categories (setup, foundational, user-story, polish) remain unchanged; testing tasks MUST follow Principle II when included.
  ⚠  No command files found in .specify/templates/commands/ — nothing to update.

Deferred items: none
-->

# Synek Constitution

## Core Principles

### I. Code Quality & Maintainability

All code MUST follow the conventions defined in `CLAUDE.md` without exception:

- Components MUST use named exports only; no default exports.
- TypeScript strict mode MUST be satisfied — `any` is forbidden; use `unknown` and narrow explicitly.
- All conditional class merging MUST use `cn()` from `~/lib/utils`.
- Path alias `~/` MUST be used for all intra-app imports; relative paths only within the same directory.
- DB column names MUST be mapped snake_case → camelCase via explicit row-mapper functions in query files.
- No inline queries or direct `supabase.from()` calls outside `app/lib/queries/` — all DB access is mediated through the query layer.
- Component props interfaces MUST be declared in the same file, above the component, and MUST include `className?: string` for composability.

**Rationale**: Consistent, predictable structure reduces cognitive load and prevents regressions as the
codebase grows. Strict typing surfaces bugs at compile time before they reach users.

### II. Testing Standards

Every feature that touches data MUST include both a real and a mock implementation:

- Query files MUST export mock functions usable for isolated testing.
- Mock mode MUST activate automatically when Supabase credentials are absent/placeholder — no manual flag.
- All React Query mutations MUST implement the full optimistic-update cycle:
  `onMutate` (cancel + snapshot) → `onError` (rollback) → `onSettled` (invalidate).
- Acceptance scenarios in specs MUST follow Given/When/Then format and be independently testable.
- `pnpm typecheck` MUST pass before any feature is considered complete.

**Rationale**: Reliable mock coverage enables development and CI without live credentials. Optimistic
updates guarantee UI correctness under network failure. Type-checking is a first-class quality gate.

### III. User Experience Consistency

All UI MUST conform to the established design system without deviation:

- Sport color tokens MUST be taken from `app/lib/utils/training-types.ts` — inventing new colors is
  forbidden.
- All user-visible strings MUST be translated via `t('key')` using i18next; hardcoded English in JSX
  is a blocking defect.
- Translations MUST be added to both `en/` and `pl/` namespaces simultaneously — partial translation
  ships are not acceptable.
- shadcn/ui components MUST be added only via `pnpm dlx shadcn@latest add <name>`; files in
  `app/components/ui/` MUST NOT be edited manually.
- Date display MUST use utilities from `app/lib/utils/date.ts` and `date-fns` — raw `new Date()`
  arithmetic is forbidden.

**Rationale**: Visual and linguistic consistency builds user trust. A shared color system and i18n
discipline prevent fragmentation as the feature set expands.

### IV. Performance Requirements

The application MUST meet the following baseline targets:

- **Initial load**: Time-to-interactive on a modern desktop MUST be under 3 seconds on a standard
  broadband connection (measured with production build).
- **Interaction latency**: Optimistic updates MUST reflect user actions within one render frame
  (~16 ms) — no waiting on network for UI feedback.
- **Bundle discipline**: New dependencies MUST be justified; tree-shakeable packages are strongly
  preferred. Adding a package that increases the production bundle by more than 50 KB (gzipped)
  requires explicit documentation in the feature plan.
- **Query efficiency**: Supabase queries MUST select only required columns; wildcard `select('*')`
  is acceptable only in prototypes and MUST be removed before merge.
- **Mock parity**: Mock implementations MUST replicate the timing characteristics of real queries
  (use realistic delays if needed) so performance regressions are detectable in mock mode.

**Rationale**: Athletes and coaches often use the platform on mobile or variable connections. Fast,
snappy UI directly affects training adherence and platform adoption.

### V. Simplicity & Anti-Complexity

The minimum amount of code and abstraction necessary for the current requirement MUST be used:

- No `useEffect` for data fetching — React Query hooks in `lib/hooks/` MUST be used instead.
- No premature abstractions: three similar lines of code are preferred over an abstraction used
  once.
- No helpers or utilities created for single-use operations — inline the logic.
- No backwards-compatibility shims or dead code — remove unused code completely.
- No feature flags or configuration knobs for functionality that can simply be changed in code.
- YAGNI (You Aren't Gonna Need It) applies to all design decisions.

**Rationale**: Over-engineering increases maintenance burden without delivering user value. Synek is
a focused planning tool; keeping the codebase lean accelerates future feature delivery.

## Technology & Stack Constraints

The following stack versions are locked and MUST NOT be changed without a constitution amendment:

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

New dependencies MUST be evaluated against bundle impact (Principle IV) and simplicity (Principle V)
before adoption. Any addition of a major new framework or library requires updating this section.

## Development Workflow & Quality Gates

The following gates MUST be satisfied before a feature branch is merged:

1. **Type check passes**: `pnpm typecheck` exits with code 0 — no TypeScript errors.
2. **Mock parity**: Every new Supabase query has a corresponding mock implementation.
3. **i18n complete**: All new user-facing strings appear in both `en/` and `pl/` translation files.
4. **Optimistic updates**: Every mutation implements `onMutate`/`onError`/`onSettled`.
5. **No hardcoded colors**: All sport colors reference `training-types.ts` tokens.
6. **No direct DB access in components**: All data fetching goes through `lib/hooks/` → `lib/queries/`.
7. **Constitution check passed**: The plan.md for the feature documents how each relevant principle
   is satisfied or explicitly justified if violated.

Code review MUST verify all seven gates. A PR that fails any gate MUST NOT be merged regardless of
feature completeness.

## Governance

This constitution is the highest-authority document for Synek engineering decisions. It supersedes
any conflicting practice described elsewhere unless that practice is explicitly referenced here.

**Amendment procedure**:
1. Propose the change in a PR with a clear rationale.
2. Bump the version according to semantic versioning rules:
   - MAJOR: principle removed, redefined in a backward-incompatible way, or governance restructured.
   - MINOR: new principle added, new section added, or existing principle materially expanded.
   - PATCH: clarifications, wording improvements, typo fixes.
3. Update `LAST_AMENDED_DATE` to the date the amendment is merged.
4. Run the consistency propagation checklist: verify plan-template.md, spec-template.md,
   tasks-template.md, and CLAUDE.md for conflicts.
5. Include a Sync Impact Report (HTML comment at top of this file) summarising all changes.

**Compliance review**: Every feature plan (`plan.md`) MUST contain a "Constitution Check" section
that gates implementation. Reviewers are responsible for verifying compliance at PR time.

**Runtime guidance**: For day-to-day development patterns, refer to `CLAUDE.md`. For feature
planning, follow the `/speckit.*` workflow. This constitution defines the non-negotiable rules
that both documents must respect.

**Version**: 1.0.0 | **Ratified**: 2026-03-08 | **Last Amended**: 2026-03-08
