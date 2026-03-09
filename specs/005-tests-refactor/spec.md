# Feature Specification: Test Suite, Codebase Refactor, URL-Based Locale & Versioning

**Feature Branch**: `005-tests-refactor`
**Created**: 2026-03-09
**Status**: Draft
**Input**: User description: "Add the Unit and Integration tests that will help to build further features and ensure no regression is caused. Following the test suite creation, plan a major refactor of the application so that the code is clean, written with the best industry standards in mind and well structured architecture. No visual regression at this stage as the app is about to be redesigned as well. Currently the code is messy, the styles are everywhere, it's hard to navigate, sizable files. I want to clean up and make it prepared for further development. As part of these changes, add a requirement to keep the locale (language) in the url and load PL as a default."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Developer Runs Tests to Verify Nothing is Broken (Priority: P1)

A developer makes a code change and runs the test suite to confirm no existing functionality has regressed. All utility functions, data transformation logic, and query helpers have unit tests. Core user flows — login, viewing a week plan, creating a session — are covered by integration tests that exercise the full component-to-data-layer path.

**Why this priority**: Tests are the foundation that makes everything else safe. Without them, the refactor (P2) cannot proceed with confidence, and future features carry regression risk. This story must be completed before any significant code changes.

**Independent Test**: Can be fully tested by running the test command and verifying all tests pass in a clean environment, without needing any UI changes or infrastructure.

**Acceptance Scenarios**:

1. **Given** the test suite is installed, **When** a developer runs the test command, **Then** all unit and integration tests complete and report a pass/fail result with coverage summary.
2. **Given** a utility function (e.g., date formatting, week-id calculation), **When** its unit test runs in isolation, **Then** the function's output matches expected values for standard and edge-case inputs.
3. **Given** a data query function (e.g., fetch week plan, create session), **When** its unit test runs with a mock data layer, **Then** it correctly maps DB-shaped data to typed application models and handles error states.
4. **Given** a React Query hook, **When** its integration test renders it inside a test provider, **Then** it loads data from the mock layer, exposes the correct state (loading → data → error), and updates the cache after a mutation.
5. **Given** the login integration test, **When** a user submits valid credentials, **Then** the session is established and the user is redirected to the correct role-based home route.
6. **Given** the coach week plan integration test, **When** a coach selects an athlete and navigates to a week, **Then** the correct sessions are rendered and athlete-switching triggers a fresh data load.
7. **Given** any test run, **When** a developer introduces a regression in a utility or query function, **Then** the relevant test fails with a clear, descriptive error message pointing to the affected assertion.

---

### User Story 2 - Developer Navigates and Modifies a Clean Codebase (Priority: P2)

A developer opening the project for the first time can understand the architecture in under 10 minutes. Files are small and focused (single responsibility), naming is consistent, logic is co-located with its feature area, and there are no god-files or scattered inline styles. Adding a new feature requires touching predictable, well-bounded locations.

**Why this priority**: The refactor cannot begin until P1 (tests) is in place, because tests provide the safety net. Once tests pass, the refactor ensures the codebase is ready for the planned redesign and future development without accumulating further technical debt.

**Independent Test**: Can be fully tested by reviewing the directory structure, checking that no file exceeds 200 lines (excluding generated/shadcn files), verifying all styles use the design system exclusively, and running the full test suite to confirm the refactor introduced no regressions.

**Acceptance Scenarios**:

1. **Given** the refactored codebase, **When** a developer looks for the logic handling athlete session creation, **Then** they find it in a single, clearly-named file under the appropriate feature directory with no duplicated logic elsewhere.
2. **Given** any non-UI, non-shadcn source file, **When** a developer opens it, **Then** it is under 200 lines, has a single clear purpose, and contains no inline style definitions outside of the design system's utility classes.
3. **Given** the component library, **When** a developer needs to reuse a UI element, **Then** shared components are co-located in a discoverable folder, not duplicated across route files.
4. **Given** a route file, **When** a developer opens it, **Then** it contains only orchestration logic (layout, data fetching hooks, event handler wiring) and delegates rendering to imported components.
5. **Given** the style system, **When** a developer applies styling, **Then** there is a single source of truth for design tokens (colors, spacing), with no raw hex values or magic numbers in component files.
6. **Given** the full test suite, **When** the refactor is complete, **Then** all tests that passed before the refactor continue to pass after it — no regressions introduced.

---

### User Story 3 - User Gets Polish as Default Language and Bookmarkable Locale URLs (Priority: P3)

When a user opens the application for the first time they see the interface in Polish. If they switch to English, the URL reflects the chosen locale (e.g., `/en/coach/week/2026-W10`). Sharing or bookmarking a URL preserves the locale for whoever opens the link. Users who previously chose English are remembered across sessions.

**Why this priority**: This is a self-contained UX change that does not depend on the refactor completing, but it is best implemented during the refactor because it touches routing and layout — areas already being restructured.

**Independent Test**: Can be fully tested by opening the application without any stored preference, verifying the default language is Polish, switching to English and verifying the URL changes to include `/en/`, then copying that URL to a new private browser tab and verifying English is still active.

**Acceptance Scenarios**:

1. **Given** a first-time visitor with no stored language preference, **When** they load the application, **Then** the interface is displayed in Polish and the URL reflects the `pl` locale segment.
2. **Given** a user on the Polish locale, **When** they switch the language to English via the language toggle, **Then** the URL updates to include the `en` locale segment and all interface text changes to English without a full page reload.
3. **Given** a URL containing a locale segment (e.g., `/en/coach/week/2026-W10`), **When** a user opens that URL directly, **Then** the interface is displayed in the locale specified in the URL, regardless of any stored preference.
4. **Given** a URL with no locale segment (e.g., `/coach/week`), **When** a user opens it, **Then** they are redirected to the equivalent Polish URL (`/pl/coach/week`) transparently.
5. **Given** a user who has previously selected English, **When** they return to the application, **Then** their stored preference is applied and they land on the English locale URL.
6. **Given** the locale in the URL, **When** the user navigates between pages within the app, **Then** the locale segment is preserved across all internal navigation.

---

### User Story 4 - Changelog Stays Current Without Any Developer Action (Priority: P4)

Every meaningful change to the codebase is automatically recorded in `CHANGELOG.md` as part of the normal merge flow — no developer needs to remember to run a command or edit a file. When a PR is merged to the main branch, the changelog and version number are updated automatically. The file can still be edited by hand if a correction or clarification is needed, but maintenance requires zero deliberate effort under normal circumstances.

**Why this priority**: Versioning and changelog automation layers on top of the working codebase. It has no dependencies on the other stories but is easiest to introduce after the refactor establishes a clean commit baseline.

**Independent Test**: Can be fully tested by merging a conventional commit to the main branch and verifying that `CHANGELOG.md` and `package.json` are updated automatically — with no developer intervention between the merge and the updated file appearing.

**Acceptance Scenarios**:

1. **Given** a developer merges a PR to main, **When** the merge completes, **Then** `CHANGELOG.md` and the version in `package.json` are updated automatically without any follow-up command.
2. **Given** a set of conventional commits since the last version, **When** the automatic update runs, **Then** a `CHANGELOG.md` entry is produced grouping changes under headings (e.g., Features, Bug Fixes, Refactor) with links to the relevant commits or PRs.
3. **Given** a breaking change commit, **When** the automatic update runs, **Then** the major version number is incremented and the changelog entry clearly flags the breaking change.
4. **Given** a patch-level fix commit, **When** the automatic update runs, **Then** only the patch version is incremented and the changelog reflects the fix.
5. **Given** the changelog, **When** a stakeholder reads it, **Then** each entry is written in plain language describing the user-visible impact, not raw technical implementation detail.
6. **Given** no meaningful commits since the last version tag, **When** the automatic update runs, **Then** it exits without creating a duplicate or empty changelog entry.
7. **Given** a developer needs to correct a changelog entry, **When** they manually edit `CHANGELOG.md`, **Then** the edit is preserved and the next automatic update appends below it without overwriting the correction.

---

### Edge Cases

- What happens when an unsupported locale segment appears in the URL (e.g., `/de/coach/week`)? → The application redirects to the Polish default and does not throw an unhandled error.
- What happens when a test runs in an environment without a real data backend? → All tests use the existing mock data layer; no real Supabase credentials are required.
- What happens when a refactored file is accidentally left with a circular import? → TypeScript compilation must fail loudly and the CI build must not pass.
- What happens when a user opens a locale URL while already authenticated in a different role? → The locale is preserved but route-level auth guards still apply.
- What happens when the stored locale preference is corrupted or unrecognised? → Fall back to Polish without a runtime error.
- What happens when commits do not follow the conventional commit format? → Non-conventional commits are included in the changelog under an "Other" category and do not block the release.
- What happens when changelog generation runs on a branch with no new commits since the last tag? → The tool exits gracefully without producing an empty entry.

## Requirements *(mandatory)*

### Functional Requirements

**Test Infrastructure**

- **FR-001**: The project MUST have a test runner configured that can execute unit and integration tests via a single command with human-readable output.
- **FR-002**: Unit tests MUST cover all pure utility functions: date helpers (`getCurrentWeekId`, `weekIdToMonday`, `getWeekDateRange`), training-type configuration, and query key factories.
- **FR-003**: Unit tests MUST cover all data query functions (fetch, create, update, delete for sessions and week plans) using a mock data layer — not real network calls.
- **FR-004**: Unit tests MUST cover typed row-mapper functions to verify correct snake_case → camelCase transformation and type narrowing.
- **FR-005**: Integration tests MUST cover React Query hooks by rendering them in a minimal test environment with mocked data dependencies and asserting loading, success, and error states.
- **FR-006**: Integration tests MUST cover the login flow: valid credentials → session established → redirect; invalid credentials → error shown → no redirect.
- **FR-007**: Integration tests MUST cover the coach week view: athlete selection → correct data loaded → session CRUD operations reflected in the cache.
- **FR-008**: Integration tests MUST cover the athlete week view: read-only session display, session completion toggle reflected in the cache.
- **FR-009**: The test suite MUST produce a code coverage report; initial coverage MUST reach at least 60% of non-UI, non-generated source files.
- **FR-010**: Tests MUST run without any real Supabase credentials or network access, relying entirely on the existing mock data layer.

**Codebase Refactor**

- **FR-011**: No non-shadcn, non-generated source file (`.ts`, `.tsx`) MAY exceed 200 lines — large files MUST be split into focused modules.
- **FR-012**: Route files MUST contain only page-level orchestration (hook calls, layout, event wiring) and delegate all rendering logic to named imported components.
- **FR-013**: All shared component logic that is currently duplicated across routes MUST be extracted to a shared component or hook, eliminating duplication.
- **FR-014**: Styling MUST use only the project's design system utility classes; no raw colour values, magic spacing numbers, or per-file style blocks may remain.
- **FR-015**: The directory structure MUST match the canonical layout defined in CLAUDE.md; no files may live outside their designated folder.
- **FR-016**: All TypeScript strict-mode errors MUST be resolved; `pnpm typecheck` MUST pass with zero errors after the refactor.
- **FR-017**: The full test suite MUST pass after the refactor is complete, confirming zero regressions were introduced.

**URL-Based Locale**

- **FR-018**: All application routes MUST include a locale prefix segment (`/pl/` or `/en/`) as the first path component.
- **FR-019**: The default locale MUST be Polish (`pl`); any request to a path without a locale segment MUST redirect to the equivalent `/pl/` path.
- **FR-020**: The locale in the URL MUST be the single source of truth for the active language; switching language via the UI toggle MUST update the URL and persist the preference in session/local storage.
- **FR-021**: When a user navigates within the application, the locale segment MUST be preserved in every generated internal link and programmatic navigation call.
- **FR-022**: Unsupported locale values in the URL MUST result in a redirect to the Polish default rather than an unhandled error.
- **FR-023**: The existing language toggle component MUST remain functional and now drive URL-based locale changes rather than in-memory state only.

**Versioning & Changelog**

- **FR-024**: The project MUST adopt semantic versioning (`major.minor.patch`); version MUST be tracked in `package.json` as the single source of truth.
- **FR-025**: All commit messages MUST follow the Conventional Commits specification (`feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`, `break:`, etc.) to enable automated changelog generation.
- **FR-026**: `CHANGELOG.md` and the version in `package.json` MUST be updated automatically on every merge to the main branch — no developer action is required beyond writing conventional commits.
- **FR-027**: The generated changelog MUST group entries under standard headings: **Features**, **Bug Fixes**, **Refactor**, **Breaking Changes**, and **Other** — with each entry linking to its commit or PR.
- **FR-028**: A `feat:` commit MUST trigger a minor version bump; a `fix:` or `refactor:` commit MUST trigger a patch bump; a commit with `BREAKING CHANGE` in the footer MUST trigger a major bump.
- **FR-029**: Manual edits to `CHANGELOG.md` MUST be preserved; the automation MUST only prepend new entries and MUST NOT overwrite or reformat existing content.
- **FR-030**: The initial `CHANGELOG.md` MUST be seeded with a `v0.1.0` entry summarising the existing feature branches (001–005) as a historical baseline.

### Key Entities

- **Test Suite**: The collection of unit and integration tests, configuration, and coverage reporting. Scoped to business logic and data layers; excludes visual/snapshot tests.
- **Mock Data Layer**: Existing in-memory mock used in development (`isMockMode`). Tests MUST reuse this layer rather than introducing separate test fixtures.
- **Locale Segment**: The two-character language code prefix in the URL path (`pl`, `en`). Acts as the canonical locale identifier for the active session.
- **Semantic Version**: A `major.minor.patch` identifier stored in `package.json` and marked in the git history with a tag (e.g., `v1.2.0`).
- **Changelog Entry**: A structured record in `CHANGELOG.md` documenting all changes in a release, grouped by change type and linked to source commits or PRs.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer can run the full test suite in under 60 seconds on a standard development machine and get a clear pass/fail result.
- **SC-002**: Test suite achieves ≥ 60% code coverage on all non-UI, non-generated source files (utilities, query functions, hooks, row mappers).
- **SC-003**: All unit and integration tests continue to pass after the refactor is merged — zero regressions reported.
- **SC-004**: No source file outside `app/components/ui/` (shadcn-managed) exceeds 200 lines after the refactor.
- **SC-005**: `pnpm typecheck` completes with zero TypeScript errors after the refactor.
- **SC-006**: A new developer can identify the correct file to modify for any given application behaviour in under 5 minutes by reading the directory structure alone.
- **SC-007**: The application loads in Polish by default for a first-time visitor with no stored preferences, with zero additional configuration required.
- **SC-008**: Locale is preserved when any internal link or back/forward browser navigation is used — 100% of navigation paths retain the locale segment.
- **SC-009**: The CI build (typecheck + tests) completes successfully on the `005-tests-refactor` branch before any PR merge.
- **SC-010**: After any merge to main, `CHANGELOG.md` and `package.json` are updated automatically within the merge pipeline — zero developer actions required beyond writing the commit.
- **SC-011**: The `CHANGELOG.md` file is present in the repository root and contains at least the `v0.1.0` historical baseline entry before the first automated release.
- **SC-012**: Every release version is traceable from `CHANGELOG.md` → git tag → individual commits, forming a complete audit trail.

## Assumptions

- The existing mock data layer (`app/lib/mock-data.ts` + `isMockMode` flag) is sufficient for test isolation; no new fixture system is introduced.
- Visual regression tests are explicitly out of scope for this feature — the application is undergoing a visual redesign separately.
- The refactor does not change any user-visible behaviour except the URL locale prefix and the Polish default language.
- Locale preference persistence uses the existing browser storage mechanism (sessionStorage or localStorage) already in use in the project.
- The test framework choice (e.g., Vitest + Testing Library) is left to the planning phase, but must integrate with the existing Vite build without additional build tooling.
- `app/components/ui/` (shadcn-managed) files are excluded from the 200-line rule and coverage requirements.
- Strava-related files are in scope for the test suite but only for mock-mode paths — no live Strava API calls in tests.
- Conventional Commits will be adopted from this feature forward; retroactive rewriting of existing commit history is out of scope.
- The changelog automation runs in the CI/CD pipeline on merge to main; it does not require any local tooling to be installed by individual developers.
- The automation tool must integrate with the existing `pnpm` workspace without introducing a separate runtime (e.g., no Ruby gems or Python scripts).
- Git tags are the mechanism for marking releases; no separate release management database is introduced.
