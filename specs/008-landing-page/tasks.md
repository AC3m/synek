# Tasks: Public Landing Page

**Input**: Design documents from `/specs/008-landing-page/`
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/ ✅

**Tests**: No test tasks — not requested in spec. Run `pnpm typecheck` as the quality gate (T025).

**Organization**: Tasks grouped by user story. US1 (pure presentation) is fully independent. US2–US4 each add one section and one backend concern.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Config, types, and translation key files that every landing component imports. Must be done before any component work begins.

- [x] T001 Add `'landing'` to the `ns` array in `app/i18n/config.ts`
- [x] T002 [P] Create `app/i18n/resources/en/landing.json` with all key names and placeholder English values (nav, hero, whySynek, features, beta, contact sections — see contracts/ui-contracts.md for key names)
- [x] T003 [P] Create `app/i18n/resources/pl/landing.json` mirroring the same key structure as T002 with placeholder Polish values
- [x] T004 [P] Create `app/types/feedback.ts` — `FeedbackSubmission` interface and `CreateFeedbackInput` interface per data-model.md
- [x] T005 [P] Add `feedbackKeys` to `app/lib/queries/keys.ts` — `{ all: ['feedback'] as const }`

**Checkpoint**: Config and types in place — component files can be created and will resolve imports correctly.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Route wiring, data layer, and mock auth extension that every user story depends on. Establishes the landing page as a reachable route and enables all forms to work in mock mode.

**⚠️ CRITICAL**: No user story component work can begin until this phase is complete.

- [x] T006 Update `app/routes.ts`: replace `index('routes/root-redirect.tsx')` with `index('routes/landing.tsx')`
- [x] T007 Delete `app/routes/root-redirect.tsx`; create `app/routes/landing.tsx` as a minimal scaffold — auth redirect logic (`useEffect` on `user` → `navigate(/${locale}/${role})`) + empty `<main>` with six placeholder `<section id="…">` slots matching the nav anchors
- [x] T008 [P] Create `supabase/migrations/014_feedback_submissions.sql` — `feedback_submissions` table with `user_id uuid references profiles(id) on delete set null` + RLS policy allowing public insert per data-model.md
- [x] T009 [P] Add `mockRegisterUser(email, password, name, role: 'coach' | 'athlete'): AuthUser` to `app/lib/auth.ts` — follows the same pattern as existing `mockRegisterCoach`, adds the user to `MOCK_USERS` with the given role
- [x] T010 [P] Create `app/lib/mock-data/feedback.ts` — mutable `MOCK_FEEDBACK` store, `addMockFeedback()`, `getMockFeedback()`, `resetMockFeedback()` (deep-clone reset) per data-model.md; add re-export to `app/lib/mock-data/index.ts`
- [x] T011 Create `app/lib/queries/feedback.ts` — `createFeedback(input: CreateFeedbackInput)` with real Supabase path (`insert` into `feedback_submissions` selecting `id, name, email, message, user_id, created_at`) and mock path (`addMockFeedback`); `toFeedbackSubmission` row mapper; depends on T010
- [x] T012 Create `app/lib/hooks/useFeedback.ts` — `useSubmitFeedback()` mutation using `createFeedback`; `onSettled` invalidates `feedbackKeys.all`; depends on T011

**Checkpoint**: `pnpm dev` serves the app at `/` via the new landing scaffold (blank page). Auth redirect fires for logged-in users. Feedback data layer is fully wired in mock mode.

---

## Phase 3: User Story 1 — Prospect Discovers and Evaluates (Priority: P1) 🎯 MVP

**Goal**: A visitor can land on `/`, read the full marketing page, and navigate to any section via the sticky nav.

**Independent Test**: Navigate to `http://localhost:5173`. Verify the sticky nav is visible with six links. Click each link — page smooth-scrolls to the correct section. No login required. Authenticated users are redirected to their dashboard.

- [x] T013 [US1] Create `app/components/landing/LandingNav.tsx` — sticky top bar, renders six `<a href="#…">` anchor links using i18n keys from `landing:nav.*`; uses `cn()` for active/scroll state; no React Router `<Link>` (hash anchors only)
- [x] T014 [P] [US1] Create `app/components/landing/HeroSection.tsx` — `id="get-started"`, headline + subheadline communicating value prop + beta status, primary CTA button scrolling to `#join-beta`, secondary CTA linking to `#log-in`; uses `landing:hero.*` keys
- [x] T015 [P] [US1] Create `app/components/landing/WhySynekSection.tsx` — `id="why-synek"`, three-to-four differentiator cards (structured training, coach visibility, athlete autonomy, beta access); uses `landing:whySynek.*` keys
- [x] T016 [P] [US1] Create `app/components/landing/FeaturesSection.tsx` — `id="features"`, feature list/grid (week planning, session types, Strava sync, coach/athlete roles, self-planning); uses `landing:features.*` keys
- [x] T017 [US1] Wire all four sections into `app/routes/landing.tsx`: import `LandingNav`, `HeroSection`, `WhySynekSection`, `FeaturesSection`; render them with correct section `id` attributes; add remaining placeholder sections (`#log-in`, `#join-beta`, `#contact`) as empty `<section>` stubs; depends on T013–T016

**Checkpoint**: Full marketing page visible at `/`. Sticky nav scrolls to all sections. US1 independently deliverable.

---

## Phase 4: User Story 2 — Visitor Joins the Beta (Priority: P2)

**Goal**: A visitor can select Coach or Athlete, fill in name/email/password, and create an account — landing on their role-appropriate dashboard.

**Independent Test**: Click "Join Beta" in the nav. Select "Coach", fill form with valid data, submit. Verify redirect to `/pl/coach`. Repeat as Athlete → `/pl/athlete`. Submit with duplicate email → see email error. Submit empty form → see inline validation errors.

- [x] T018 [US2] Create `supabase/functions/register-user/index.ts` — follows `supabase/functions/register-coach/index.ts` pattern exactly; accepts `{ name, email, password, role: 'coach' | 'athlete' }`; inserts into `auth.users` + `profiles` with the given role; returns `{ success: true }` or `{ error: string }`
- [x] T019 [US2] Create `app/components/landing/JoinBetaSection.tsx` — `id="join-beta"`; role toggle (Coach / Athlete); name, email, password fields; honeypot `website` field (`aria-hidden`, `tabIndex={-1}`); Zod validation (same schema as `login.tsx`); mock path calls `mockRegisterUser(..., role)` then `login()`; real path POSTs to `register-user` edge function then `supabase.auth.signInWithPassword`; on success `navigate(/${locale}/${role})`; inline errors per contracts/ui-contracts.md; uses `landing:beta.*` keys; depends on T009

**Checkpoint**: Full registration flow works in mock mode for both roles. US2 independently deliverable.

---

## Phase 5: User Story 3 — Existing User Logs In (Priority: P3)

**Goal**: An existing user can log in directly from the landing page without navigating to `/login`.

**Independent Test**: Click "Log In" in the nav. Enter `coach@synek.app / coach123`, submit. Verify redirect to `/pl/coach`. Enter wrong credentials → see error without page reload.

- [x] T020 [US3] Create `app/components/landing/LoginSection.tsx` — `id="log-in"`; email + password fields; calls `useAuth().login(email, password)`; on success navigates to `/${locale}/${user.role}` via the same `useEffect` on `user` used in `login.tsx`; inline error display; loading state on submit button; uses `landing:login.*` keys; wire into `app/routes/landing.tsx`

**Checkpoint**: Existing users can log in without leaving the landing page. US3 independently deliverable.

---

## Phase 6: User Story 4 — Visitor Sends Feedback (Priority: P4)

**Goal**: Any visitor (logged-in or anonymous) can submit a feedback message; authenticated users have name/email prefilled and their `userId` is captured silently.

**Independent Test**: As anonymous: scroll to Contact, fill name/email/message, submit → confirmation message, form clears. As authenticated user: verify name/email are prefilled. Submit → confirm `user_id` is non-null in the mock store (`getMockFeedback()`).

- [x] T021 [US4] Create `app/components/landing/ContactSection.tsx` — `id="contact"`; reads `user` from `useAuth()`; prefills `name` and `email` from `user.name` / `user.email` when authenticated (fields remain editable); includes honeypot field; calls `useSubmitFeedback()` with `{ name, email, message, userId: user?.id ?? null }`; shows success confirmation + clears form on `isSuccess`; shows error message on `isError`; beta-framed copy via `landing:contact.*` keys; wire into `app/routes/landing.tsx`; depends on T012

**Checkpoint**: Contact form works for both anonymous and authenticated users. `user_id` visible in Supabase dashboard for internal submissions. US4 independently deliverable.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Production-quality copy, responsive layout verification, and type safety gate.

- [x] T022 [P] Fill production-quality English copy in `app/i18n/resources/en/landing.json` — replace all placeholders with final marketing text (hero headline, differentiators, feature descriptions, beta messaging, CTA labels, contact section copy, nav labels)
- [x] T023 [P] Fill production-quality Polish copy in `app/i18n/resources/pl/landing.json` — translate all keys from T022
- [ ] T024 [P] Verify responsive layout across all `app/components/landing/` components at 375px (mobile), 768px (tablet), 1440px (desktop) — fix any overflow, spacing, or readability issues
- [x] T025 Run `pnpm typecheck`; fix all TypeScript errors in new files (`landing.tsx`, `app/components/landing/`, `app/lib/queries/feedback.ts`, `app/lib/hooks/useFeedback.ts`, `app/types/feedback.ts`, `app/lib/auth.ts`)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS all user story phases
- **Phase 3 (US1)**: Depends on Phase 2 — can start as soon as Foundational is done
- **Phase 4 (US2)**: Depends on Phase 2 (needs `mockRegisterUser` from T009)
- **Phase 5 (US3)**: Depends on Phase 2 only (reuses existing auth — no new data layer)
- **Phase 6 (US4)**: Depends on T012 (`useSubmitFeedback`) from Phase 2
- **Phase 7 (Polish)**: Depends on all story phases complete

### User Story Dependencies

- **US1 (P1)**: Independent after Phase 2 — purely presentational
- **US2 (P2)**: Independent after Phase 2 — needs T009 (mockRegisterUser)
- **US3 (P3)**: Independent after Phase 2 — reuses existing `useAuth().login`
- **US4 (P4)**: Independent after T012 (useFeedback hook) — needs ContactSection only

### Within Each Phase

- T002, T003, T004, T005 (Phase 1) — all parallel
- T008, T009, T010 (Phase 2) — all parallel; T011 depends on T010; T012 depends on T011
- T014, T015, T016 (Phase 3) — all parallel; T017 depends on T013–T016
- T022, T023, T024 (Phase 7) — all parallel; T025 runs last

---

## Parallel Execution Examples

### Phase 1 (all parallel)
```
T001 → i18n config
T002 → en/landing.json
T003 → pl/landing.json
T004 → types/feedback.ts
T005 → keys.ts
```

### Phase 3 (US1 sections in parallel, then wire)
```
T013 → LandingNav.tsx
T014 → HeroSection.tsx        ← parallel
T015 → WhySynekSection.tsx    ← parallel
T016 → FeaturesSection.tsx    ← parallel
            ↓ (all complete)
T017 → landing.tsx (wire together)
```

### Phase 4–6 (can run in parallel after Phase 2)
```
T018 + T019 → US2 (JoinBeta edge fn + component)
T020        → US3 (LoginSection)
T021        → US4 (ContactSection, needs T012)
```

---

## Implementation Strategy

### MVP First (User Story 1 — Read-only landing page)

1. Complete Phase 1: Setup (T001–T005)
2. Complete Phase 2: Foundational (T006–T012)
3. Complete Phase 3: US1 (T013–T017)
4. **Stop and validate**: marketing page visible at `/`, nav scrolls correctly, auth redirect works
5. Ship / demo if ready

### Incremental Delivery

1. Phase 1 + 2 → Foundation
2. Phase 3 (T013–T017) → Full page visible ✓
3. Phase 4 (T018–T019) → Beta registration live ✓
4. Phase 5 (T020) → Login section live ✓
5. Phase 6 (T021) → Feedback form live ✓
6. Phase 7 (T022–T025) → Production copy + polish ✓

---

## Notes

- All `app/components/landing/` components: named exports, `className?: string` prop, `useTranslation('landing')`
- Nav links are `<a href="#…">` (not React Router `<Link>`) — hash anchors, same page
- Honeypot field in JoinBeta and Contact: `name="website"`, `tabIndex={-1}`, `aria-hidden="true"`
- Mock mode is the development default — all flows work without Supabase credentials
- `pnpm typecheck` MUST pass before PR (T025 is the final gate)
