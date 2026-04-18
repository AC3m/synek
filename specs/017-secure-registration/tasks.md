# Tasks: Secure Registration

**Input**: Design documents from `/specs/017-secure-registration/`  
**TDD**: Tests are written FIRST and must FAIL before implementation begins. Mark each test task complete only when the test file exists with failing assertions. Mark each implementation task complete when tests PASS.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies on in-progress tasks)
- **[US#]**: Which user story this task belongs to
- **TDD NOTE**: For every test task, the test file must be committed first with failing assertions before the implementation task is started

---

## Phase 1: Setup

**Purpose**: Install new dependency, create DB migration, establish env vars before any story work.

- [x] T001 Install `@marsidev/react-turnstile` via `pnpm add @marsidev/react-turnstile`
- [x] T002 [P] Create DB migration file `supabase/migrations/<timestamp>_auth_rate_limits.sql` per `data-model.md` (table + PK + RLS enable + index on window_start)
- [x] T003 [P] Add `VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA` (test key) to `.env.local` and document the variable name in `.env.example`. Also run `supabase secrets set APP_URL=http://localhost:5173` for local dev and document the production value (`APP_URL=https://<your-domain>`) in `.env.example` — required by T014 so the Edge Function builds the correct `emailRedirectTo` URL.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared schemas, query module with mocks, and route registration. Must be complete before any user story.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T004 Write `app/test/unit/auth-schemas.test.ts` — cover `registrationSchema` (valid pass; missing name fail; weak password: no uppercase, no digit, <8 chars each fail independently), `forgotPasswordSchema` (valid email; invalid email fail), `resetPasswordSchema` (valid pass; password mismatch fail), `roleSelectionSchema` (valid roles; invalid role fail). **Commit with FAILING tests.**
- [x] T005 Create `app/lib/schemas/auth.ts` — export `registrationSchema`, `forgotPasswordSchema`, `resetPasswordSchema`, `roleSelectionSchema` using Zod 4. Reuse the password regex from `app/routes/register.tsx` (do not duplicate). **T004 tests must now PASS.**
- [x] T006 Write `app/test/unit/auth-callbacks.test.ts` — mock-only tests: `mockVerifyEmailToken` resolves for valid token; `mockRequestPasswordReset` resolves for any email; `mockUpdatePassword` rejects for weak password and resolves for valid; `mockSaveUserRole` saves and resolves; `mockSignInWithGoogle` throws `not_available_in_mock` in mock mode; `mockResendConfirmationEmail` resolves immediately for any email. **Commit with FAILING tests.**
- [x] T007 Create `app/lib/queries/auth-callbacks.ts` — mock implementations only: `mockVerifyEmailToken`, `mockRequestPasswordReset`, `mockUpdatePassword`, `mockSaveUserRole`, `mockResendConfirmationEmail` (resolves immediately). **T006 tests must now PASS.**
- [x] T008 Add real Supabase implementations to `app/lib/queries/auth-callbacks.ts` — `verifyEmailToken`: `supabase.auth.verifyOtp({ token_hash, type })`; `requestPasswordReset`: `supabase.auth.resetPasswordForEmail(email, { redirectTo })`; `updatePassword`: `supabase.auth.updateUser({ password })`; `signInWithGoogle`: `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })`; `saveUserRole`: `supabase.auth.updateUser({ data: { role } })` + `supabase.from('profiles').update({ role }).eq('id', userId)`; `resendConfirmationEmail(email)`: `supabase.auth.resend({ type: 'signup', email })`. Each function follows the `if (isMockMode) return mock…` pattern.
- [x] T009 Register all 5 new routes in `app/routes.ts` under `':locale' / locale-bare-layout`: `route('auth/callback', 'routes/auth-callback.tsx')`, `route('confirm-email', 'routes/confirm-email.tsx')`, `route('forgot-password', 'routes/forgot-password.tsx')`, `route('reset-password', 'routes/reset-password.tsx')`, `route('select-role', 'routes/select-role.tsx')`
- [x] T010 Create minimal stub exports for all 5 new route files so the router resolves without errors: `app/routes/auth-callback.tsx`, `app/routes/confirm-email.tsx`, `app/routes/forgot-password.tsx`, `app/routes/reset-password.tsx`, `app/routes/select-role.tsx` (each exports a default function returning `null`)

**Checkpoint**: `pnpm typecheck` passes, `pnpm test:run` shows T004/T006 test suites green.

---

## Phase 3: User Story 1 — Email/Password Registration with Confirmation (Priority: P1) 🎯 MVP

**Goal**: New accounts are created unconfirmed; a confirmation email is sent; the user cannot log in until they click the link; expired/used links are handled gracefully.

**Independent Test**: Register a new account → see confirm-email page → click link in email → land on dashboard as logged-in user. Unconfirmed login → see resend UI.

### Tests for US1 (TDD — write and commit BEFORE implementation)

- [x] T011 Write `app/test/integration/auth-callback.test.tsx` — scenarios: (a) `?type=email&token_hash=abc` calls `verifyEmailToken('abc','email')` and navigates to `/<locale>/coach` or `/<locale>/athlete` based on mocked user role; (b) `verifyEmailToken` rejects with `otp_expired` → shows "link expired" card with a "Resend confirmation" button (not a generic error); (c) `verifyEmailToken` rejects with already-verified / `otp_disabled` error → shows "already confirmed" card with a login link; (d) any other `verifyEmailToken` rejection → shows generic error card with "back to login" link; (e) `?type=recovery&token_hash=abc` → does NOT call `verifyEmailToken`, sets `sessionStorage('auth_callback_type', 'recovery')`, navigates to `/<locale>/reset-password`; (f) no params (OAuth case) → renders "completing sign-in…" spinner; after a 10-second timeout fires, transitions to error card with back-to-login link. Mock `~/lib/queries/auth-callbacks`. **Commit with FAILING tests.**
- [x] T012 Write `app/test/integration/confirm-email.test.tsx` — scenarios: (a) renders email address passed via navigation state; (b) "Resend" button calls `supabase.auth.resend` and shows success text after resolve; (c) button is disabled while request in-flight; (d) server error shows error message. Mock `~/lib/supabase`. **Commit with FAILING tests.**
- [x] T013 Update `app/test/integration/register.test.tsx` — add/modify: (a) successful registration does NOT call `login()` and navigates to `/<locale>/confirm-email` with state `{ email }`; (b) login route is never visited after successful register submit. Existing passing tests must remain green. **Commit with newly FAILING assertions only.**

### Implementation for US1

- [x] T014 Fix `supabase/functions/register-user/index.ts` — remove `email_confirm: true` from `admin.createUser` call (line ~89). Add `options: { emailRedirectTo: Deno.env.get('APP_URL')! + '/auth/callback' }` to the same call. Add `APP_URL` to the list of required env vars in the function comment.
- [x] T071 [US1] Handle the "re-register with same unconfirmed email" edge case in `supabase/functions/register-user/index.ts` — after `admin.createUser` returns an email-already-exists error, query `auth.users` to check `email_confirmed_at` on the existing record. If `email_confirmed_at` is null (unconfirmed), call `admin.generateLink({ type: 'signup', email })` and send the confirmation link via Supabase's built-in email, then return `{ success: true, status: 'confirmation_resent' }`. If `email_confirmed_at` is set (confirmed), return the existing `email_taken` error. Update `app/routes/register.tsx` to handle the `confirmation_resent` status identically to a fresh registration success (navigate to confirm-email page).
- [x] T015 [P] Implement `app/routes/auth-callback.tsx` — read `useSearchParams()` for `token_hash` and `type`. If `type === 'email'`: call `verifyEmailToken`; on success redirect to `/<locale>/<role>`; catch `AuthApiError` and branch on error code: `otp_expired` → render expired-link card with a "Resend" button that calls `resendConfirmationEmail`; already-verified / `otp_disabled` → render "already confirmed" card with login link; all other errors → generic error card with back-to-login link. If `type === 'recovery'`: set `sessionStorage.setItem('auth_callback_type', 'recovery')`, navigate to `/<locale>/reset-password`. If no params: render "completing sign-in…" spinner; use a `useEffect` with a 10-second `setTimeout` that transitions to an error card with a back-to-login link if no session arrives.
- [x] T016 [P] Implement `app/routes/confirm-email.tsx` — read `email` from `useLocation().state as { email: string }`. Render check-your-email card with the email address. "Resend" button calls `resendConfirmationEmail(email)` from `lib/queries/auth-callbacks` (never call `supabase.auth.resend` directly in the route — keeps the route presentation-only and testable in mock mode). Show success / error inline. Use i18n keys `landing:beta.confirmEmailTitle`, `confirmEmailBody`, `resendConfirmation`, `resentConfirmation`.
- [x] T017 Update `app/routes/register.tsx` — replace the `await login(result.data.email, result.data.password)` + `navigate(...)` block on successful 200 with `navigate(`/${locale}/confirm-email`, { state: { email: result.data.email } })`. Remove the now-unused `login` import from `useAuth()` destructuring if no longer needed.
- [x] T018 Update `app/lib/context/AuthContext.tsx` login method — in the Supabase branch, after `signInWithPassword` error: if `error.message` includes `'Email not confirmed'`, throw `new Error('email_not_confirmed')` so the login page can detect it specifically.
- [x] T019 Update `app/routes/login.tsx` — in the catch handler: if `err.message === 'email_not_confirmed'`, set a distinct error state that renders a "confirm your email" message with a `<Link to="/<locale>/confirm-email">` resend link. Use i18n key `common:auth.emailNotConfirmed` and `common:auth.resendConfirmationEmail`.
- [x] T020 [P] Add i18n keys to `app/i18n/resources/en/landing.json` under `beta`: `confirmEmailTitle`, `confirmEmailBody` (with `{{email}}` interpolation), `resendConfirmation`, `resentConfirmation`
- [x] T021 [P] Add matching Polish translations for T020 keys to `app/i18n/resources/pl/landing.json`
- [x] T022 [P] Add i18n keys to `app/i18n/resources/en/common.json` under `auth`: `emailNotConfirmed`, `resendConfirmationEmail`
- [x] T023 [P] Add matching Polish translations for T022 keys to `app/i18n/resources/pl/common.json`

**Checkpoint**: T011/T012/T013 tests pass. Register → confirm-email screen appears. Clicking confirmation link logs the user in. Unconfirmed login shows resend UI.

---

## Phase 4: User Story 2 — Bot Prevention / Cloudflare Turnstile (Priority: P1)

**Goal**: Every registration form submission carries a validated Turnstile token. The Edge Function rejects requests with missing or invalid tokens. Legitimate users see no friction.

**Independent Test**: Submit registration form in a browser → Turnstile completes invisibly → cfToken included in request body → account created. Omit cfToken → 400 `turnstile_failed` returned.

### Tests for US2 (TDD — write and commit BEFORE implementation)

- [x] T024 Update `app/test/integration/register.test.tsx` — add: (a) Turnstile widget renders (mock `@marsidev/react-turnstile` as `{ Turnstile: ({ onSuccess }) => { onSuccess('mock-token'); return null; } }`); (b) submit button is disabled until Turnstile fires `onSuccess`; (c) `cfToken: 'mock-token'` is present in the fetch body; (d) server returning `turnstile_failed` shows the correct error message. **Commit with FAILING assertions; previously passing tests must remain green.**

### Implementation for US2

- [x] T025 Add `verifyTurnstile(token: string, ip: string): Promise<boolean>` helper to `supabase/functions/register-user/index.ts` — POSTs to `https://challenges.cloudflare.com/turnstile/v0/siteverify` with `secret` (from `Deno.env.get('TURNSTILE_SECRET_KEY')`) and `response` (token). Returns `data.success`.
- [x] T026 Add Turnstile validation step to `supabase/functions/register-user/index.ts` request pipeline — extract `cfToken` from body, call `verifyTurnstile` after honeypot check and before input validation. If absent or fails → `400 { error: 'turnstile_failed' }`.
- [x] T027 Add `<Turnstile>` widget to `app/routes/register.tsx` — import from `@marsidev/react-turnstile`, add `cfToken` state (initial `''`), pass `siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}` and `onSuccess={setCfToken}`. Widget is invisible (no visual element rendered for users).
- [x] T028 Disable the register submit Button in `app/routes/register.tsx` until `cfToken !== ''` — update the `disabled` prop: `disabled={isPending || !role || !cfToken}`.
- [x] T029 Add `cfToken` to the fetch body in `app/routes/register.tsx` `handleSubmit` — include alongside existing fields.
- [x] T030 Add `turnstile_failed` and `rate_limited` error mappings in `app/routes/register.tsx` — set `setError(t('beta.registrationError'))` for generic, add specific messages for the two new codes using `common:errors.turnstileFailed` and `common:errors.rateLimited`.
- [x] T031 [P] Add i18n keys to `app/i18n/resources/en/common.json` under `errors`: `turnstileFailed`, `rateLimited`
- [x] T032 [P] Add matching Polish translations for T031 keys to `app/i18n/resources/pl/common.json`

**Checkpoint**: T024 tests pass. `cfToken` appears in request body in browser DevTools. Removing the env var causes submit to be disabled.

---

## Phase 5: User Story 3 — Google Sign-In (Priority: P2)

**Goal**: Users can register and log in via Google. First-time Google users select a role before reaching the dashboard. Returning Google users land directly on their dashboard.

**Independent Test**: Click "Continue with Google" → complete Google consent → role selection screen appears → select role → land on dashboard. Second visit: no role prompt.

### Tests for US3 (TDD — write and commit BEFORE implementation)

- [x] T033 Write `app/test/integration/select-role.test.tsx` — scenarios: (a) renders Coach and Athlete role buttons; (b) clicking Coach calls `confirmRole('coach')`; (c) clicking Athlete calls `confirmRole('athlete')`; (d) both buttons are disabled while `confirmRole` is in-flight; (e) after resolve, navigates to `/<locale>/coach` or `/<locale>/athlete`. Mock `useAuth` to provide `confirmRole: vi.fn()`. **Commit with FAILING tests.**
- [x] T034 Update `app/test/integration/login.test.tsx` — add: (a) "Continue with Google" button is rendered; (b) clicking it calls `loginWithGoogle()`; (c) "Forgot password?" link is rendered pointing to `/<locale>/forgot-password`. **Commit with FAILING assertions.**

### Implementation for US3

- [x] T035 Extend `AuthContextValue` interface in `app/lib/context/AuthContext.tsx` — add `loginWithGoogle: () => Promise<void>`, `needsRoleSelection: boolean`, `confirmRole: (role: UserRole) => Promise<void>`
- [x] T036 Implement `loginWithGoogle` in `AuthProvider` — real mode: call `signInWithGoogle()` from `lib/queries/auth-callbacks.ts` (which calls `supabase.auth.signInWithOAuth`). Mock mode: throw `new Error('google_not_available_in_demo')`.
- [x] T037 Implement `needsRoleSelection` in `AuthProvider` — derived value: `user !== null && user.role === null`. Expose in context value.
- [x] T038 Implement `confirmRole` in `AuthProvider` — call `saveUserRole(user.id, role)` from `lib/queries/auth-callbacks.ts`, then update local `user` state with the selected role via `setUser(prev => prev ? { ...prev, role } : prev)`.
- [x] T039 Implement `app/routes/select-role.tsx` — render role picker cards (same visual style as the role picker in register.tsx — inline the JSX, do not extract a shared component since it exists in only 2 places). Call `useAuth().confirmRole(role)` on selection. Navigate to `/<locale>/<role>` on resolve. Use i18n keys `common:auth.selectRoleTitle`, `selectRoleBody`, `confirmRole`.
- [x] T040 Add "Continue with Google" button to `app/routes/login.tsx` — positioned below the submit button, separated by an "or" divider. Calls `loginWithGoogle()` from `useAuth()`. In mock mode, shows an inline "not available in demo" message if it throws.
- [x] T041 [P] Add "Continue with Google" button to `app/routes/register.tsx` — positioned below the existing submit button with the same "or" divider pattern. Calls `loginWithGoogle()`.
- [x] T042 Add `needsRoleSelection` redirect guard to `app/routes/athlete/layout.tsx` — if `needsRoleSelection` is true, render `<Navigate to={`/${locale}/select-role`} replace />` (already has access to `locale` from `useParams`).
- [x] T043 [P] Add the same `needsRoleSelection` redirect guard to `app/routes/coach/layout.tsx`
- [x] T044 Update `app/routes/auth-callback.tsx` — the no-params branch (OAuth return) now handles the case where `onAuthStateChange` fires with a Google user whose `profile.role` is null. Since `needsRoleSelection` will be true, the layout guards (T042/T043) will redirect — no additional code needed here. Add a comment explaining this.
- [x] T045 [P] Add i18n keys to `app/i18n/resources/en/common.json` under `auth`: `selectRoleTitle`, `selectRoleBody`, `confirmRole`, `continueWithGoogle`, `googleNotAvailableInDemo`
- [x] T046 [P] Add matching Polish translations for T045 keys to `app/i18n/resources/pl/common.json`
- [x] T047 [P] Add `beta.continueWithGoogle` key to `app/i18n/resources/en/landing.json` (register page uses `landing` namespace)
- [x] T048 [P] Add matching Polish translation for T047 key to `app/i18n/resources/pl/landing.json`

**Checkpoint**: T033/T034 tests pass. In dev, clicking "Continue with Google" shows "not available in demo" toast. Supabase Google provider must be configured for real browser test.

---

## Phase 6: User Story 4 — Rate Limiting (Priority: P2)

**Goal**: Registration is limited to 5 attempts per IP per 10 minutes. Legitimate users who hit the limit see a clear wait-and-retry message.

**Independent Test**: Submit 6 registration requests with the same mock IP within the window → 6th returns 429 `rate_limited`. After window expires, request succeeds.

### Tests for US4 (TDD — write and commit BEFORE implementation)

- [x] T049 Extract `checkAndIncrementRateLimit` into its own file `supabase/functions/register-user/rate-limit.ts` (imported by `index.ts`), then write `supabase/functions/register-user/rate-limit.test.ts` using Deno's native test runner (`Deno.test`) — **not** Vitest, which cannot import Deno modules. Scenarios: (a) first attempt returns `true`; (b) fifth attempt returns `true`; (c) sixth attempt returns `false`. Stub the Supabase client with an in-memory object that tracks `attempt_count`. Run with `deno test supabase/functions/register-user/rate-limit.test.ts`. **Commit with FAILING tests.**

### Implementation for US4

- [x] T050 Implement `checkAndIncrementRateLimit(supabase, ip, action, windowMinutes, maxAttempts): Promise<boolean>` in `supabase/functions/register-user/rate-limit.ts` (extracted file from T049) — uses `supabase.from('auth_rate_limits').upsert(...)` with `onConflict: 'ip_address,action,window_start'` and `ignoreDuplicates: false` to atomically increment, then reads `attempt_count`. Returns `false` if count exceeds max. **T049 Deno tests must now PASS.**
- [x] T051 Integrate `checkAndIncrementRateLimit` into the request pipeline in `supabase/functions/register-user/index.ts` — call after Turnstile validation, before input validation. Extract client IP from `req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown'`. If returns false → `429 { error: 'rate_limited' }`.
- [x] T052 Define rate limit constants at the top of `supabase/functions/register-user/index.ts`: `const RATE_LIMIT_WINDOW_MINUTES = 10`, `const RATE_LIMIT_MAX_ATTEMPTS = 5`, `const RESEND_RATE_LIMIT_WINDOW_MINUTES = 60`, `const RESEND_RATE_LIMIT_MAX_ATTEMPTS = 3`
- [x] T067 [US4] Update `app/test/integration/confirm-email.test.tsx` — add scenario: (a) after 3 successful resend calls, `resendConfirmationEmail` rejects with a rate-limit error; the UI shows a "please wait before requesting another email" message and the Resend button is disabled. Mock `~/lib/queries/auth-callbacks` to reject on the 4th call. **Commit with FAILING assertions.**
- [x] T068 [US4] Enforce FR-011 resend rate limiting: in `app/lib/queries/auth-callbacks.ts` real `resendConfirmationEmail` implementation — before calling `supabase.auth.resend`, call `checkAndIncrementRateLimit` using the service-role client with `action='resend_confirmation'`, `windowMinutes=RESEND_RATE_LIMIT_WINDOW_MINUTES`, `maxAttempts=RESEND_RATE_LIMIT_MAX_ATTEMPTS`. If rate-limited, throw `new Error('rate_limited')` so the confirm-email route can display the wait message. **T067 tests must now PASS.**

**Checkpoint**: T049 Deno tests pass. T067 Vitest tests pass. Manual test: rapid-fire 6 POSTs to the Edge Function with the same IP → 6th returns 429. Rapid resend clicks beyond 3 show wait message.

---

## Phase 7: User Story 5 — Password Reset (Priority: P2)

**Goal**: Users with a confirmed email can reset their password via a secure link. Google-only users see a helpful redirect message.

**Independent Test**: Request reset → email sent → click link → enter new password → logged in. Old password no longer works. Google-only account attempt → "use Google sign-in" message shown.

### Tests for US5 (TDD — write and commit BEFORE implementation)

- [x] T053 Write `app/test/integration/forgot-password.test.tsx` — scenarios: (a) renders email input and submit button; (b) on submit calls `requestPasswordReset(email)`; (c) shows "check your email" success state after resolve (same message regardless of email existence); (d) shows error message if `requestPasswordReset` rejects. Mock `~/lib/queries/auth-callbacks`. **Commit with FAILING tests.**
- [x] T054 Write `app/test/integration/reset-password.test.tsx` — scenarios: (a) renders new-password and confirm-password fields; (b) shows validation error if passwords don't match; (c) shows validation error for weak password (mirrors `resetPasswordSchema`); (d) on valid submit calls `updatePassword(newPassword)`; (e) shows error if `updatePassword` rejects; (f) on success navigates to dashboard. Mock `~/lib/queries/auth-callbacks` and `useAuth`. **Commit with FAILING tests.**
- [x] T055 Update `app/test/integration/auth-callback.test.tsx` — add: `?type=recovery&token_hash=abc` does NOT call `verifyEmailToken`, instead sets `sessionStorage('auth_callback_type', 'recovery')` and navigates to `/<locale>/reset-password`. Ensure T011 scenarios remain green. **Commit with FAILING assertions only.**

### Implementation for US5

- [x] T069 [US5] Write additional test scenario in `app/test/integration/forgot-password.test.tsx` — (e) when `requestPasswordReset` is called for a Google-only account (mock returns `new Error('google_only_account')`), the form shows "Your account uses Google Sign-In. Please sign in with Google." and does NOT show the "check your email" success message. **Commit with FAILING assertion.**
- [x] T056 Implement `app/routes/forgot-password.tsx` — email form validated with `forgotPasswordSchema`. On submit calls `requestPasswordReset(email)` from `lib/queries/auth-callbacks`. On resolve shows inline "check your email" confirmation message. On reject with `google_only_account` error shows Google sign-in prompt. On all other rejects shows generic error. "Back to sign in" link. Use i18n keys `common:auth.forgotPasswordTitle`, `forgotPasswordBody`, `sendResetLink`, `resetLinkSent`.
- [x] T057 Implement `app/routes/reset-password.tsx` — two-field form (password + confirm) validated with `resetPasswordSchema`. Calls `updatePassword(newPassword)` from `lib/queries/auth-callbacks`. On success: read role from `useAuth().user.role` (do NOT call `supabase.auth.getUser()` directly in the route — `onAuthStateChange` will have updated the context already), navigate to `/<locale>/<role>`. On reject shows error. Use i18n keys `common:auth.resetPasswordTitle`, `resetPasswordSubmit`, `passwordResetSuccess`.
- [x] T058 Update `app/routes/auth-callback.tsx` recovery branch — set `sessionStorage.setItem('auth_callback_type', 'recovery')`, then navigate to `/<locale>/reset-password`. (The active Supabase recovery session persists independently of sessionStorage.)
- [x] T059 Add "Forgot password?" link to `app/routes/login.tsx` — `<Link to={`/${locale}/forgot-password`}>` positioned below the password field. Use i18n key `common:auth.forgotPassword`.
- [x] T070 [US5] Add FR-018 check to `app/lib/queries/auth-callbacks.ts` real `requestPasswordReset` — before calling `supabase.auth.resetPasswordForEmail`, call `supabase.auth.signInWithOtp` is not needed; instead use `supabase.auth.admin` (service role) or check the user's identities: if the user record has no `password` identity provider in `user.identities`, throw `new Error('google_only_account')`. If no user is found with that email, proceed silently (anti-enumeration). Update `mockRequestPasswordReset` to accept an optional override that simulates the `google_only_account` error. **T069 test must now PASS.**
- [x] T060 [P] Add i18n keys to `app/i18n/resources/en/common.json` under `auth`: `forgotPassword`, `forgotPasswordTitle`, `forgotPasswordBody`, `sendResetLink`, `resetLinkSent`, `resetPasswordTitle`, `resetPasswordSubmit`, `passwordResetSuccess`, `googleOnlyAccount`
- [x] T061 [P] Add matching Polish translations for T060 keys to `app/i18n/resources/pl/common.json`

**Checkpoint**: T053/T054/T055/T069 tests pass. Forgot-password form resolves silently for unknown emails. Google-only account shows sign-in-with-Google prompt. Reset link lands on reset-password page. New password works; old does not.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [x] T062 Run `pnpm typecheck` — fix all TypeScript errors introduced across the feature. Ensure no `any` escapes exist; all Supabase response shapes are narrowed explicitly.
- [x] T063 Run `pnpm test:run` — verify all test suites pass (unit + integration). Investigate and fix any flaky tests.
- [x] T064 Run `pnpm build` — confirm no runtime import errors or missing module references.
- [x] T065 [P] Docs check — review `docs/how-to/`, `docs/architecture/decisions/`, `docs/reference/conventions.md`, `docs/reference/anti-patterns.md`. The `auth-callback` route pattern (unified callback handler for multiple auth flow types) is a new reusable pattern — add a brief entry to `docs/how-to/` if it doesn't already exist. Note in PR description if no update is needed.
- [x] T066 [P] Update `specs/017-secure-registration/checklists/requirements.md` — confirm all checklist items still pass after implementation (no implementation details leaked into spec).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 (T001 for dependency install)
- **Phases 3–7 (User Stories)**: All depend on Phase 2 completion. US1 and US2 (both P1) should be completed before P2 stories. US3, US4, US5 are independent of each other after Phase 2.
- **Phase 8 (Polish)**: Depends on all desired stories being complete

### User Story Dependencies

- **US1 (Email Confirmation)**: After Phase 2 — no story dependencies
- **US2 (Bot Prevention)**: After Phase 2 — no story dependencies; builds on same Edge Function as US1 so do US1 first
- **US3 (Google Sign-In)**: After Phase 2 — independent of US1/US2
- **US4 (Rate Limiting)**: After Phase 2 — best done after US2 (both modify same Edge Function)
- **US5 (Password Reset)**: After Phase 2 — requires US1's `auth-callback.tsx` to be stubbed (T010/T015 complete)

### Within Each User Story

1. Write test files → commit with FAILING tests
2. Write implementation → commit when tests PASS
3. Add i18n keys for both `en/` and `pl/` simultaneously
4. Verify `pnpm typecheck` passes before moving to next story

### Parallel Opportunities (within each phase)

- T002, T003 — parallel with each other (Phase 1)
- T004, T006 — parallel with each other (both test files, no dependencies)
- T015, T016 — parallel (different route files)
- T020, T022 — parallel (different i18n namespace sections)
- T021, T023 — parallel (Polish translations, different files)
- T042, T043 — parallel (different layout files)
- T045–T048 — all i18n files, parallel

---

## Parallel Example: User Story 1

```
After T013 (tests committed failing):
  Parallel track A: T014 (Edge Function fix)
  Parallel track B: T015 (auth-callback route) + T016 (confirm-email route)

After T015/T016/T017/T018/T019 complete:
  Parallel: T020 (en/landing i18n) + T021 (pl/landing i18n) + T022 (en/common i18n) + T023 (pl/common i18n)
```

---

## Implementation Strategy

### MVP Scope (US1 + US2 only)

Complete Phases 1–4 (T001–T032). This delivers:

- Email confirmation on registration (the most critical security gap)
- Turnstile bot protection
- No auto-confirmed accounts
- Confirm-email screen and resend flow

**Stop and validate MVP** before proceeding to US3–US5.

### Incremental Delivery

1. Phase 1–2 (T001–T010): Foundation ready
2. Phase 3 (T011–T023): Email confirmation working → validate independently
3. Phase 4 (T024–T032): Turnstile live → validate with DevTools
4. Phase 5 (T033–T048): Google OAuth working → validate with real browser + Google consent
5. Phase 6 (T049–T052): Rate limiting active → validate with rapid-fire requests
6. Phase 7 (T053–T061): Password reset working → validate full reset flow
7. Phase 8 (T062–T066): Polish → PR ready

---

## Notes

- `[P]` = different files, no in-progress dependencies — safe to run in parallel
- i18n tasks are always `[P]` — they touch different files and can be done alongside implementation
- TDD commits: test file committed first (red), then implementation (green), then optional refactor
- Edge Function changes (T014, T025/T026, T050/T051) all touch the same file — do them sequentially
- `pnpm typecheck` is a hard gate — do not accumulate TypeScript errors across tasks
