# Implementation Plan: Public Landing Page

**Branch**: `008-landing-page` | **Date**: 2026-03-10 | **Spec**: [spec.md](./spec.md)

## Summary

Build a public marketing landing page at `/` that presents Synek's value proposition, communicates beta status with free accounts, and provides three self-contained interactive sections: Log In, Join Beta (role-selectable registration), and Contact (feedback form). The landing page is a top-level SPA route with its own sticky nav, outside the authenticated app shell. The feature also introduces athlete self-registration (currently invite-only) and a new `feedback_submissions` table.

## Technical Context

**Language/Version**: TypeScript 5 (strict) + React 19
**Primary Dependencies**: React Router 7, TanStack Query 5, Supabase JS 2, shadcn/ui, i18next, Zod 4
**Storage**: Supabase PostgreSQL — new `feedback_submissions` table (migration 014); no changes to existing tables
**Testing**: Vitest 4, @testing-library/react 16, jsdom
**Target Platform**: Browser SPA (ssr: false)
**Performance Goals**: Page interactive in under 3 seconds; no new heavy dependencies
**Constraints**: No new npm packages; bundle unchanged
**Scale/Scope**: Public-facing page; no auth required

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality & Maintainability | ✅ PASS | Named exports, strict TS, `cn()`, `~/` imports, row mappers in query files |
| II. Testing Standards | ✅ PASS | `feedback.ts` query has real + mock implementations; `mockRegisterUser` generalises existing mock helper; `pnpm typecheck` gate enforced |
| III. UX Consistency | ✅ PASS | `landing` namespace added to both `en/` and `pl/` simultaneously; shadcn components via CLI only; no sport colors needed |
| IV. Performance Requirements | ✅ PASS | No new dependencies; bundle unchanged; feedback submission uses standard TanStack mutation |
| V. Simplicity & Anti-Complexity | ✅ PASS | Single route file + section components; no new abstractions; existing auth flow reused; inline forms with no shared form state |

**Post-design re-check**: No violations introduced by Phase 1 design. One complexity note: `register-user` is a new edge function rather than extending `register-coach` — this is the simpler choice because it avoids modifying a deployed function and its existing callers.

## Project Structure

### Documentation (this feature)

```text
specs/008-landing-page/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── ui-contracts.md  # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks — not created here)
```

### Source Code (repository root)

```text
app/
├── routes/
│   └── landing.tsx                    # NEW — replaces root-redirect as index route
├── components/
│   └── landing/
│       ├── LandingNav.tsx             # NEW — sticky anchor nav
│       ├── HeroSection.tsx            # NEW — hero / get-started
│       ├── WhySynekSection.tsx        # NEW — value differentiators
│       ├── FeaturesSection.tsx        # NEW — feature list
│       ├── LoginSection.tsx           # NEW — inline login form
│       ├── JoinBetaSection.tsx        # NEW — role picker + registration form
│       └── ContactSection.tsx         # NEW — feedback form
├── lib/
│   ├── queries/
│   │   └── feedback.ts               # NEW — createFeedback (real + mock)
│   ├── hooks/
│   │   └── useFeedback.ts            # NEW — useSubmitFeedback mutation
│   ├── mock-data/
│   │   └── feedback.ts               # NEW — in-memory store + resetMockFeedback()
│   └── auth.ts                       # MODIFIED — add mockRegisterUser(role)
├── types/
│   └── feedback.ts                   # NEW — FeedbackSubmission, CreateFeedbackInput
├── i18n/resources/
│   ├── en/landing.json               # NEW
│   └── pl/landing.json               # NEW
└── i18n/config.ts                    # MODIFIED — add 'landing' to namespaces array

supabase/
├── migrations/
│   └── 014_feedback_submissions.sql  # NEW — feedback_submissions table + RLS
└── functions/
    └── register-user/
        └── index.ts                  # NEW — unified registration (coach | athlete)
```

**Files removed**: `app/routes/root-redirect.tsx` (landing page takes over the index route)
**Files modified**: `app/routes.ts` (index → landing.tsx), `app/lib/auth.ts` (add mockRegisterUser), `app/lib/mock-data/index.ts` (re-export feedback), `app/lib/queries/keys.ts` (add feedbackKeys), `app/i18n/config.ts` (add landing namespace)

**Structure Decision**: Single project (Option 1). All changes are within the existing SPA structure. The edge function follows the pattern of `supabase/functions/register-coach/` and `supabase/functions/claim-invite/`.

---

## Phase 0: Research Summary

All unknowns resolved. See [research.md](./research.md) for full rationale.

| Unknown | Resolution |
|---------|-----------|
| Landing page route location | Top-level index route (`/`), replaces root-redirect.tsx |
| Authenticated user redirect | Handled inside landing.tsx via `useAuth().user` + `useNavigate`, same pattern as login.tsx |
| Athlete self-registration | New `register-user` edge function accepting `role: 'coach' \| 'athlete'` |
| Mock support for athlete registration | New `mockRegisterUser(email, password, name, role)` in auth.ts |
| Contact form storage | New `feedback_submissions` table (migration 014); no third-party service |
| i18n namespace | New `landing` namespace; both EN and PL files required |
| Header suppression | Landing is layout-less (top-level route); app Header never renders on this page |
| New npm dependencies | None required |

---

## Phase 1: Design & Contracts

### Data Model

See [data-model.md](./data-model.md).

**New entity**: `FeedbackSubmission` — stored in `feedback_submissions` table. Fields: `id`, `name`, `email`, `message`, `created_at`. No auth FK (unauthenticated inserts allowed via RLS policy).

**Registration extension**: No schema change. New `register-user` edge function accepts `role: 'coach' | 'athlete'`; `profiles` table already has `role` column.

### UI Contracts

See [contracts/ui-contracts.md](./contracts/ui-contracts.md).

Three forms defined:
1. **Login form** — email + password → `useAuth().login()` → role-based redirect
2. **Join Beta form** — role picker + name + email + password → `register-user` edge function → fresh sign-in → redirect
3. **Contact form** — name + email + message → `useSubmitFeedback()` mutation → confirmation message

All three include honeypot fields. All use Zod for validation. All display inline errors without page reload.

### Navigation Contract

Six anchor links in sticky nav: `#get-started`, `#why-synek`, `#features`, `#log-in`, `#join-beta`, `#contact`. Smooth scroll via `scrollIntoView({ behavior: 'smooth' })`.

### Key Implementation Decisions

#### 1. Route Change: `/` → `landing.tsx`

`routes.ts` changes from:
```typescript
index('routes/root-redirect.tsx'),
```
to:
```typescript
index('routes/landing.tsx'),
```

The redirect logic for authenticated users moves into `landing.tsx`:
```typescript
// Early in component — same pattern as login.tsx
useEffect(() => {
  if (user) {
    const locale = localStorage.getItem('locale') ?? 'pl'
    navigate(`/${locale}/${user.role}`, { replace: true })
  }
}, [user, navigate])
```

`root-redirect.tsx` is deleted.

#### 2. Athlete Self-Registration via `register-user` Edge Function

The new function (`supabase/functions/register-user/index.ts`) follows the `register-coach` pattern exactly, adding `role` to the request body and the `profiles` insert:

```typescript
// Input shape
{ name: string, email: string, password: string, role: 'coach' | 'athlete' }
```

In mock mode, `JoinBetaSection` calls the new `mockRegisterUser` helper:
```typescript
// app/lib/auth.ts — new export
export function mockRegisterUser(
  email: string,
  password: string,
  name: string,
  role: 'coach' | 'athlete'
): AuthUser
```

#### 3. Feedback Mutation (no optimistic update needed)

`useSubmitFeedback` is a simple mutation — no optimistic update required because the contact form has no pre-existing data to patch. The UI state (loading/success/error) is managed locally in `ContactSection.tsx` using the mutation's `status` field.

#### 4. i18n Config Update

```typescript
// app/i18n/config.ts — add to ns array
ns: ['common', 'coach', 'athlete', 'training', 'landing'],
```

`useTranslation('landing')` used in all `app/components/landing/` files.

#### 5. Landing Nav — No React Router `<Link>`

Nav items are plain `<a href="#section-id">` tags (not React Router `<Link>`), since they are hash anchors on the same page, not route transitions.

---

## Complexity Tracking

No constitution violations. No complexity justification required.
