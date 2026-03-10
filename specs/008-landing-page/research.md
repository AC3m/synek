# Research: 008-landing-page

**Phase 0 output** | **Date**: 2026-03-10

---

## 1. Route Integration

**Decision**: Landing page becomes the new index route (`/`), replacing `root-redirect.tsx`.

**Rationale**: The root URL is the natural home for the landing page. Authenticated users visiting `/` will be redirected to their dashboard from within the landing route — the same redirect logic currently in `root-redirect.tsx`. The landing page is registered as a top-level route (outside `/:locale` layout) so it gets its own sticky nav rather than the app's `Header`.

**Alternatives considered**:
- Register at `/landing` and keep root-redirect — rejected: forces users to know a separate URL; `/` should be the product's front door.
- Include inside `/:locale` layout — rejected: app `Header` would render above the landing nav; users would see the auth UI before reaching the marketing content.

**Impact**: `root-redirect.tsx` is deleted; `routes.ts` index entry points to `routes/landing.tsx`.

---

## 2. Athlete Self-Registration

**Decision**: Add a new `register-user` Supabase Edge Function accepting `{ name, email, password, role: 'coach' | 'athlete' }`. The existing `register-coach` function remains unchanged (still used by `login.tsx`).

**Rationale**: The spec requires athletes to self-register directly from the landing page, which is not currently supported. The cleanest approach is a new unified registration function rather than modifying the existing one, avoiding regressions in the current coach registration flow.

**In mock mode**: A new `mockRegisterUser(email, password, name, role)` helper is added to `app/lib/auth.ts` (generalises the existing `mockRegisterCoach`). After mock registration, `mockLogin` + `login()` are called identically to the current coach flow.

**Alternatives considered**:
- Extend `register-coach` to accept a `role` parameter — rejected: would require updating the existing edge function and all callers; higher regression risk.
- Use `supabase.auth.signUp` directly from the client — rejected: violates the convention established in `login.tsx` (edge function handles account creation to enforce business rules like duplicate detection and profile insert).

---

## 3. Contact / Feedback Form Storage

**Decision**: Add a `feedback_submissions` Supabase table (migration `012_feedback_submissions.sql`). Submissions require no authentication. In mock mode, an in-memory store is used.

**Rationale**: Keeping submissions in Supabase gives the team a central place to read beta feedback. No third-party service is introduced, avoiding new dependencies (Principle V).

**Fields**: `id`, `name`, `email`, `message`, `created_at`. No FK to profiles — feedback is always anonymous/pre-auth.

**Alternatives considered**:
- Third-party form service (Formspree, Resend) — rejected: adds external dependency; constitution requires bundle and dependency justification.
- Email-only via edge function — rejected: harder to query; Supabase table is queryable and auditable.

---

## 4. i18n Namespace

**Decision**: Create a new `landing` namespace with files at `app/i18n/resources/en/landing.json` and `app/i18n/resources/pl/landing.json`.

**Rationale**: Landing page copy (hero headlines, feature bullets, beta messaging, CTAs) is distinct from app UX strings. Separating into its own namespace keeps `common` lean and makes translations easy to hand off to copywriters.

**Alternatives considered**:
- Re-use `common` namespace — rejected: `common` is already broad; marketing copy does not belong alongside auth and UI strings.

---

## 5. Landing Page Component Structure

**Decision**: A single route file `app/routes/landing.tsx` composes section sub-components from `app/components/landing/`. Each section is a named export from its own file.

**Rationale**: Keeps the route file thin (constitution Principle V). Sections are independently readable and testable. Component files stay under the 200-line guideline.

**Sections mapped to components**:
| Section | Component |
|---------|-----------|
| Sticky nav | `LandingNav.tsx` |
| Hero / Get Started | `HeroSection.tsx` |
| Why Synek | `WhySynekSection.tsx` |
| Features | `FeaturesSection.tsx` |
| Log In | `LoginSection.tsx` |
| Join Beta | `JoinBetaSection.tsx` |
| Contact | `ContactSection.tsx` |

---

## 6. Redirect Behaviour for Authenticated Users

**Decision**: Landing route reads `AuthContext.user` on mount; if the user is already authenticated, it immediately redirects to `/${locale}/${role}`. This replicates the behaviour previously in `root-redirect.tsx`.

**Rationale**: Authenticated users should land in their app, not re-read marketing copy. The locale is read from `localStorage.getItem('locale') ?? 'pl'`, identical to the current pattern in `login.tsx`.

---

## 7. No New Major Dependencies

No new npm packages are required. The landing page uses:
- Existing shadcn/ui components (Button, Input, etc.)
- `lucide-react` for icons (already installed)
- Existing Tailwind tokens
- Existing `cn()` utility

This satisfies Principle IV (bundle discipline) and Principle V (simplicity).
