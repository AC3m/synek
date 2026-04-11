# Implementation Plan: Secure Registration

**Branch**: `017-secure-registration` | **Date**: 2026-04-11 | **Spec**: [spec.md](spec.md)

## Summary

Harden the existing registration flow by: fixing the auto-confirm bug in the Edge Function, adding Cloudflare Turnstile bot protection, introducing email confirmation, Google OAuth social login, IP-based rate limiting, and a self-service password reset flow. All changes follow existing patterns — new routes stay presentation-only, server state flows through `lib/queries/` → `lib/hooks/`, and a mock implementation precedes every real one.

---

## Technical Context

**Language/Version**: TypeScript 5 (strict), Deno (Edge Functions)  
**Primary Dependencies**: React 19, React Router 7 (SPA), Supabase JS 2, TanStack Query 5, Zod 4, i18next  
**New Dependency**: `@marsidev/react-turnstile` — ~2 KB gzipped npm wrapper; Turnstile widget loads from Cloudflare CDN asynchronously (zero synchronous bundle cost)  
**Storage**: Supabase Postgres — `profiles` (existing), `auth_rate_limits` (new)  
**Testing**: Vitest + @testing-library/react + @testing-library/user-event (already installed)  
**Target Platform**: Browser SPA + Supabase Edge Functions (Deno)  
**Performance Goals**: Registration flow adds no perceptible latency for real users (Turnstile invisible widget completes in background)  
**Constraints**: Turnstile site key public, secret key never in client bundle. No new major frameworks.  
**Scale/Scope**: Beta platform; rate limits sized for low volume (5 reg/IP/10 min)

---

## Constitution Check

### I. Lean & Purposeful ✅

Every change maps to a documented user story in spec.md. No speculative abstractions — no new helpers or utilities beyond what is called at more than one site. The `auth_rate_limits` table is the simplest possible rate-limiting solution that avoids adding an external service.

### II. Configuration Over Hardcoding ✅

- Turnstile site key: `import.meta.env.VITE_TURNSTILE_SITE_KEY` — never hardcoded
- Turnstile secret: Supabase Edge Function secret env var
- Rate limit thresholds (5 attempts / 10 min, 3 resends / 60 min) defined as named constants at the top of the Edge Function
- All user-facing strings in i18n (both `en/` and `pl/`)

### III. Type Safety & Boundary Validation ✅

- New `app/lib/schemas/auth.ts`: Zod 4 schemas for all four new forms; validates at the boundary before calling Supabase
- Edge Function: Zod validation of request body before any DB or auth operation
- `supabase.auth.verifyOtp()` response typed and narrowed explicitly — no `as any`
- `AuthContext` extended with typed `needsRoleSelection: boolean` — no loose string checks
- `pnpm typecheck` must pass before merge (enforced gate)

### IV. Modularity & Testability ✅

- New query: `app/lib/queries/auth-callbacks.ts` — `verifyEmailToken`, `requestPasswordReset`, `updatePassword`, `signInWithGoogle`, `saveUserRole` — each function has a mock alongside the real implementation
- New schemas module: `app/lib/schemas/auth.ts` — pure, independently testable
- New routes are presentation-only — no Supabase calls inline
- `AuthContext` receives `loginWithGoogle` alongside existing `login` — same interface pattern
- Mock implementations written first (TDD gate)

### V. Performance & Operational Discipline ✅

- `@marsidev/react-turnstile`: ~2 KB npm package; CF CDN script is not bundled → well under 50 KB threshold
- No `select('*')` in new queries — `auth_rate_limits` uses `attempt_count` projection only
- Optimistic updates: not applicable for auth flows (network response is the authoritative state)
- `pnpm typecheck` + `pnpm test:run` must pass before merge

### Security & Secret Handling ✅

- `TURNSTILE_SECRET_KEY` never in `VITE_*` namespace — Edge Function only
- `cfToken` validated server-side; client cannot bypass by omitting it (400 returned)
- Honeypot field retained (first-pass filter)
- BREAKING CHANGE documented: `register-user` v2 contract breaks callers that expect immediate login after 200

---

## Project Structure

```text
app/
├── lib/
│   ├── schemas/
│   │   └── auth.ts                    # NEW — Zod schemas for all auth forms
│   ├── queries/
│   │   └── auth-callbacks.ts          # NEW — verifyEmailToken, requestPasswordReset, etc.
│   └── context/
│       └── AuthContext.tsx            # MODIFIED — add loginWithGoogle, needsRoleSelection
├── routes/
│   ├── auth-callback.tsx              # NEW — unified callback handler
│   ├── confirm-email.tsx              # NEW — "check your email" page
│   ├── forgot-password.tsx            # NEW — reset request form
│   ├── reset-password.tsx             # NEW — new password form
│   ├── select-role.tsx                # NEW — role picker for Google users
│   ├── register.tsx                   # MODIFIED — Turnstile, redirect to confirm-email
│   └── login.tsx                      # MODIFIED — Google button, forgot password link
└── test/
    ├── unit/
    │   └── auth-schemas.test.ts       # NEW — Zod schema unit tests
    └── integration/
        ├── register.test.tsx           # MODIFIED — covers Turnstile mock, confirm-email redirect
        ├── confirm-email.test.tsx      # NEW
        ├── forgot-password.test.tsx    # NEW
        ├── reset-password.test.tsx     # NEW
        ├── auth-callback.test.tsx      # NEW
        └── select-role.test.tsx        # NEW

supabase/
├── functions/
│   └── register-user/
│       └── index.ts                   # MODIFIED — Turnstile validation, rate limiting, remove email_confirm: true
└── migrations/
    └── <timestamp>_auth_rate_limits.sql  # NEW
```

---

## Implementation Phases

### Phase A — Foundation (TDD: test → implement → pass)

**Goal**: Build the testable foundation before any UI changes.

**A1 — Zod schemas + unit tests**

Write `app/test/unit/auth-schemas.test.ts` first:

- Valid registration input passes all schemas
- Missing name fails `registrationSchema`
- Weak password (no uppercase, no digit, < 8 chars) fails each rule independently
- Password/confirmPassword mismatch fails `resetPasswordSchema`
- Invalid role fails `roleSelectionSchema`

Then create `app/lib/schemas/auth.ts` with `registrationSchema`, `forgotPasswordSchema`, `resetPasswordSchema`, `roleSelectionSchema`. Extract and reuse the existing password validation regex from `app/routes/register.tsx` — do not duplicate.

**A2 — `auth-callbacks` query module + mock**

Write tests first in `app/test/unit/auth-callbacks.test.ts` (mock-only assertions):

- `mockVerifyEmailToken` resolves successfully for a valid-looking token
- `mockRequestPasswordReset` resolves for any email
- `mockUpdatePassword` rejects for weak password, resolves for valid
- `mockSaveUserRole` saves role and resolves

Then create `app/lib/queries/auth-callbacks.ts` with both mock and real implementations following the existing query file pattern (see `lib/queries/profile.ts`):

```typescript
export async function verifyEmailToken(
  tokenHash: string,
  type: 'email' | 'recovery',
): Promise<void>;
export async function requestPasswordReset(email: string): Promise<void>;
export async function updatePassword(newPassword: string): Promise<void>;
export async function signInWithGoogle(): Promise<void>;
export async function saveUserRole(userId: string, role: UserRole): Promise<void>;
```

**A3 — Database migration**

Create `supabase/migrations/<timestamp>_auth_rate_limits.sql` (see `data-model.md`).

---

### Phase B — Edge Function Update

**Goal**: `register-user` validates Turnstile, enforces rate limits, and stops auto-confirming accounts.

**B1 — Remove `email_confirm: true`**

In `supabase/functions/register-user/index.ts`, line 89: remove `email_confirm: true` from the `admin.createUser` call. Add `options: { emailRedirectTo: Deno.env.get('APP_URL') + '/auth/callback' }`.

Add `APP_URL` to Edge Function environment (set in Supabase dashboard per environment).

**B2 — Turnstile validation**

After the honeypot check and before input validation, add:

```typescript
const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const res = await fetch(TURNSTILE_VERIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret: Deno.env.get('TURNSTILE_SECRET_KEY'),
      response: token,
      remoteip: ip,
    }),
  });
  const data = (await res.json()) as { success: boolean };
  return data.success;
}
```

If `cfToken` is absent or verification fails → return `400 { error: 'turnstile_failed' }`.

**B3 — IP rate limiting**

After Turnstile passes, before creating the user:

```typescript
async function checkAndIncrementRateLimit(
  supabase: SupabaseClient,
  ip: string,
  action: string,
  windowMinutes: number,
  maxAttempts: number,
): Promise<boolean>; // returns true if allowed, false if exceeded
```

Uses atomic `INSERT ... ON CONFLICT DO UPDATE SET attempt_count = attempt_count + 1 RETURNING attempt_count`. Returns false if `attempt_count > maxAttempts`.

If rate limited → `429 { error: 'rate_limited' }`.

---

### Phase C — Auth Callback Route (TDD)

**Goal**: Single route that handles all auth redirect scenarios.

**C1 — Tests first** (`app/test/integration/auth-callback.test.tsx`):

- Given `?type=email&token_hash=abc`, calls `verifyEmailToken('abc', 'email')` and redirects to `/<locale>/coach` or `/<locale>/athlete` based on user role
- Given `?type=recovery&token_hash=abc`, redirects to `/<locale>/reset-password`
- Given no params (OAuth callback), does not call `verifyEmailToken`
- On `verifyEmailToken` error, shows error message with retry link

**C2 — Implement** `app/routes/auth-callback.tsx`:

```typescript
// Reads useSearchParams() for token_hash and type
// type === 'email': calls verifyEmailToken, on success redirects to dashboard
// type === 'recovery': stores recovery intent in sessionStorage, redirects to /reset-password
// no params: shows "completing sign-in..." spinner while onAuthStateChange fires
```

Route must be added to the locale layout in `react-router.config.ts` / routes config.

---

### Phase D — Confirm Email Route (TDD)

**D1 — Tests first** (`app/test/integration/confirm-email.test.tsx`):

- Renders "check your email" message with the submitted email address
- "Resend" button calls `requestPasswordReset` wait — actually `resendConfirmationEmail` — and shows success state
- Resend button is disabled while request is in-flight
- After 3 resends, shows "please wait" message (rate limit indicator from server error)

**D2 — Implement** `app/routes/confirm-email.tsx`:

- Reads email from `useLocation().state.email` (passed from register page via `navigate`)
- Calls `supabase.auth.resend({ type: 'signup', email })` for resend action
- No query hook needed (one-off action, not cached state)

---

### Phase E — Register Page Update (TDD — modify existing tests first)

**E1 — Update existing test** `app/test/integration/register.test.tsx`:

- Mock `@marsidev/react-turnstile` widget: `vi.mock('@marsidev/react-turnstile', () => ({ Turnstile: ({ onSuccess }: { onSuccess: (t: string) => void }) => { onSuccess('mock-token'); return null; } }))`
- Test: successful registration does NOT call `login()`, navigates to `/confirm-email` instead
- Test: `cfToken` is included in the fetch body
- Test: `turnstile_failed` error from server shows appropriate error message
- Test: `rate_limited` error shows appropriate error message

**E2 — Implement changes** to `app/routes/register.tsx`:

- Add `<Turnstile siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY} onSuccess={setCfToken} />` (invisible widget)
- Add `cfToken` state; Button disabled until `cfToken` is set
- Include `cfToken` in the fetch body
- After successful 200: `navigate(`/${locale}/confirm-email`, { state: { email } })` instead of `await login()`
- Map new error codes: `turnstile_failed` → show error; `rate_limited` → show error

---

### Phase F — Login Page Update (TDD)

**F1 — Update existing test** `app/test/integration/login.test.tsx`:

- Add: renders "Continue with Google" button
- Add: renders "Forgot password?" link pointing to `/<locale>/forgot-password`
- Add: when `login()` throws with message `email_not_confirmed`, shows "confirm your email" message with resend link (new link or button navigates to `/confirm-email`)

**F2 — Implement changes** to `app/routes/login.tsx`:

- Add "Continue with Google" button that calls `loginWithGoogle()` from `useAuth()`
- Add "Forgot password?" link: `<Link to={`/${locale}/forgot-password`}>`
- In `handleLoginSubmit` catch: detect `email_not_confirmed` error message and set a specific error state that renders the resend UI

---

### Phase G — Forgot Password + Reset Password Routes (TDD)

**G1 — Tests first** (`app/test/integration/forgot-password.test.tsx`):

- Renders email input and submit button
- On submit, calls `requestPasswordReset(email)`
- Shows "check your email" success state after resolve (same response regardless of whether email exists)
- Shows error state if `requestPasswordReset` rejects

**G2 — Implement** `app/routes/forgot-password.tsx`:

- Simple form with email input, validated with `forgotPasswordSchema`
- Calls `requestPasswordReset` from `auth-callbacks` query
- On success: show inline "check your email" message (no separate route — reduces navigation complexity)
- "Back to login" link

**G3 — Tests first** (`app/test/integration/reset-password.test.tsx`):

- Renders new-password and confirm-password inputs
- Validates password policy on submit (min 8, uppercase, digit)
- Shows error if passwords don't match
- On success, calls `updatePassword(newPassword)` and redirects to dashboard
- Shows error if `updatePassword` rejects

**G4 — Implement** `app/routes/reset-password.tsx`:

- Uses `resetPasswordSchema` for validation
- Calls `updatePassword` from `auth-callbacks` query
- Redirects to `/${locale}/${role}` on success (role from `useAuth().user`)

---

### Phase H — Google OAuth + Role Selection (TDD)

**H1 — AuthContext extension**

Add to `AuthContextValue` interface:

```typescript
needsRoleSelection: boolean;
loginWithGoogle: () => Promise<void>;
confirmRole: (role: UserRole) => Promise<void>;
```

`loginWithGoogle`: calls `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/auth/callback' } })`. In mock mode: not supported (Google OAuth not available in dev mock mode — show a "not available in demo" message).

`needsRoleSelection`: derived from `user !== null && user.role === null`. Set to false once `confirmRole` saves the role.

`confirmRole`: calls `saveUserRole(userId, role)` from `auth-callbacks.ts`, which does:

1. `supabase.auth.updateUser({ data: { role } })` — updates `user_metadata`
2. `supabase.from('profiles').update({ role }).eq('id', userId)` — updates profiles table
   Then sets `user.role` in local state.

**H2 — Tests first** (`app/test/integration/select-role.test.tsx`):

- Renders coach and athlete role buttons
- Selecting a role calls `confirmRole('coach')` or `confirmRole('athlete')`
- After `confirmRole` resolves, navigates to `/<locale>/coach` or `/<locale>/athlete`
- Selecting a role disables both buttons while pending

**H3 — Implement** `app/routes/select-role.tsx`:

- Shows role picker (same UI as on the register page — extract to a shared `RolePicker` component only if used in 3+ places; here it's 2 so inline it)
- Uses `useAuth().confirmRole`
- On success: `navigate(`/${locale}/${role}`)`

**H4 — Route guard**

In `app/routes/athlete/layout.tsx` and `app/routes/coach/layout.tsx`: if `needsRoleSelection` is true, redirect to `/<locale>/select-role`. This prevents a Google user from accessing the dashboard before selecting their role.

---

### Phase I — i18n

Add to `app/i18n/resources/en/landing.json` (`beta` namespace):

```json
"confirmEmailTitle": "Check your inbox",
"confirmEmailBody": "We've sent a confirmation link to {{email}}. Click it to activate your account.",
"resendConfirmation": "Resend confirmation email",
"resentConfirmation": "Email resent!",
"continueWithGoogle": "Continue with Google"
```

Add to `app/i18n/resources/en/common.json` (`auth` namespace):

```json
"forgotPassword": "Forgot password?",
"forgotPasswordTitle": "Reset your password",
"forgotPasswordBody": "Enter your email and we'll send you a reset link.",
"sendResetLink": "Send reset link",
"resetLinkSent": "Check your inbox for a password reset link.",
"resetPasswordTitle": "Set new password",
"resetPasswordSubmit": "Update password",
"passwordResetSuccess": "Password updated. You're now signed in.",
"emailNotConfirmed": "Please confirm your email before signing in.",
"resendConfirmationEmail": "Resend confirmation email",
"selectRoleTitle": "Welcome! What's your role?",
"selectRoleBody": "Choose how you'll use Synek.",
"confirmRole": "Continue"
```

Add corresponding keys to `app/i18n/resources/pl/` simultaneously.

---

## Complexity Tracking

| Item                                 | Why Needed                                                                                             | Simpler Alternative Rejected Because                                                                                                                               |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| New `auth_rate_limits` table         | IP-based rate limiting requires persistent state across Edge Function invocations                      | Supabase built-in limits cover auth endpoints, not custom Edge Functions; adding Upstash/Redis adds an external service with no other use in the project           |
| New `app/lib/schemas/auth.ts` module | 4 schemas needed across 4+ files; inlining each schema in its route would duplicate the password regex | One shared location for boundary validation; called from 3+ routes (register, reset-password, select-role) + Edge Function — qualifies under the ≥3 call-site rule |

---

## Test Plan Summary

| File                                   | Type        | Key scenarios                                                               |
| -------------------------------------- | ----------- | --------------------------------------------------------------------------- |
| `unit/auth-schemas.test.ts`            | Unit        | All schema pass/fail cases                                                  |
| `unit/auth-callbacks.test.ts`          | Unit        | Mock query functions resolve/reject correctly                               |
| `integration/register.test.tsx`        | Integration | Turnstile mock, cfToken in body, redirect to confirm-email, new error codes |
| `integration/confirm-email.test.tsx`   | Integration | Renders email, resend button, rate-limit state                              |
| `integration/auth-callback.test.tsx`   | Integration | type=email → verify + redirect, type=recovery → redirect to reset           |
| `integration/forgot-password.test.tsx` | Integration | Submit → success state, error state                                         |
| `integration/reset-password.test.tsx`  | Integration | Validation, match check, success → redirect                                 |
| `integration/select-role.test.tsx`     | Integration | Role buttons, confirmRole called, navigation                                |
| `integration/login.test.tsx`           | Modified    | Google button, forgot link, email_not_confirmed handling                    |

**TDD order**: Write every test file before its corresponding implementation file. Each test file should be committed with failing tests first, then the implementation committed to make them pass.

---

## BREAKING CHANGE

**`register-user` Edge Function v2** is not backward-compatible with the current frontend:

- New required field `cfToken` (400 if absent in production)
- 200 response no longer means "user is ready to log in" — it means "confirmation email sent"

Both changes are contained within this feature branch. The frontend and Edge Function are updated together — no staged rollout needed.

**Commit footer**: `BREAKING CHANGE: register-user now requires cfToken and returns unconfirmed accounts`
