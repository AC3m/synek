# Research: Secure Registration

**Feature**: 017-secure-registration  
**Date**: 2026-04-11

---

## 1. Cloudflare Turnstile — React Integration

**Decision**: Use `@marsidev/react-turnstile`  
**Rationale**: Smallest available React wrapper (~2 KB npm install; actual widget loads asynchronously from Cloudflare CDN so it has zero synchronous bundle cost). Well-maintained, TypeScript-typed, widely adopted.  
**Bundle impact**: <2 KB gzipped for the wrapper itself. Widget script loads from `challenges.cloudflare.com` and is not bundled. Well within the 50 KB constitution threshold.  
**Alternatives considered**:

- `react-google-recaptcha-v3` — sends user data to Google, privacy concern for EU users, heavier package
- Custom `<script>` injection — more code to maintain, no TypeScript types

**Server-side validation**: POST `{ secret, response: token, remoteip? }` to `https://challenges.cloudflare.com/turnstile/v0/siteverify`. Returns `{ success: boolean, error-codes?: string[] }`. Must be called in the Edge Function — the `cfToken` sent from the client is single-use and validated server-side only.

**Test-mode tokens**: Cloudflare provides a reserved site key `1x00000000000000000000AA` that always passes and a secret `1x0000000000000000000000000000000AA` that always verifies — use these in test and dev environments via env vars, not hardcoded.

**Turnstile already registered on Cloudflare**: Since the app domain is already on Cloudflare, creating a Turnstile widget is a one-click action in the Cloudflare dashboard (Security → Turnstile → Add site). Site key and secret key are generated immediately.

---

## 2. Supabase Email Confirmation Fix

**Decision**: Remove `email_confirm: true` from `admin.createUser` + add `options.emailRedirectTo`  
**Rationale**: The current Edge Function passes `email_confirm: true`, which bypasses email confirmation entirely — every account is auto-confirmed on creation. This is a single-line fix.  
**How it works**: When `email_confirm` is omitted (defaults to `false`), Supabase sends a confirmation email automatically, provided "Enable email confirmations" is enabled in the Supabase project (Auth → Email → Confirm email). That setting must be verified to be ON.  
**`emailRedirectTo`**: Must be set to the app's auth callback URL so the confirmation link points to the SPA: `https://<domain>/<locale>/auth/callback`. The locale in the path is handled by the SPA router — the callback route reads `?token_hash` and `?type` query params.  
**Alternatives considered**:

- Move to client-side `supabase.auth.signUp()`: would bypass the Edge Function's beta-limit and Turnstile checks — rejected
- `admin.generateLink({ type: 'signup' })` to send email manually via custom email service: unnecessary complexity when Supabase handles it natively

---

## 3. Auth Callback Route (SPA)

**Decision**: New route `app/routes/auth-callback.tsx` under the locale layout  
**Rationale**: Supabase's confirmation and recovery links land on a URL. The SPA needs a dedicated route to receive these links, call the appropriate Supabase verification method, and redirect the user appropriately.  
**URL params used**:

- `?token_hash=<hash>&type=email` → email confirmation: call `supabase.auth.verifyOtp({ token_hash, type: 'email' })`
- `?token_hash=<hash>&type=recovery` → password reset: redirect to `/reset-password` where the active session allows `supabase.auth.updateUser({ password })`
- No params + hash fragment (PKCE) → Google OAuth: Supabase JS handles automatically via `onAuthStateChange`
  **Alternatives considered**:
- Handle confirmation inside the login page: would pollute login logic with unrelated callback concerns

---

## 4. Google OAuth with Supabase

**Decision**: `supabase.auth.signInWithOAuth({ provider: 'google' })` — no new Edge Functions  
**Rationale**: Supabase JS v2 handles the full PKCE OAuth flow natively. No custom code needed for the OAuth dance itself.  
**Setup required** (one-time, outside codebase):

1. Google Cloud Console: OAuth 2.0 credentials → authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
2. Supabase Dashboard: Auth → Providers → Google → enable, paste Client ID + Secret

**Role selection problem**: Google users arrive with `user_metadata` populated by Google (name, picture) but no `role`. The profiles table trigger creates a row on `auth.users` insert but with an empty/null role. `AuthContext.onAuthStateChange` must detect `profile.role === null` and set a `needsRoleSelection` flag. The app then redirects to `select-role.tsx` before any dashboard access.

**Account linking**: If a Google email matches an existing email/password user, Supabase can be configured to auto-link identities (Auth → Identity → "Link accounts with same email address"). This must be enabled in the Supabase dashboard — no code change needed.

**Alternatives considered**:

- Enterprise SAML (Google Workspace SSO): overkill for a consumer athlete app; requires organisation context; out of scope
- Firebase Authentication: introduces a second auth provider, conflicts with Supabase

---

## 5. Password Reset Flow

**Decision**: Use Supabase built-in `resetPasswordForEmail` + `updateUser`  
**Rationale**: Fully supported by Supabase JS v2. Zero additional infrastructure.  
**Flow**:

1. `supabase.auth.resetPasswordForEmail(email, { redirectTo: origin + '/auth/callback' })` — sends the email
2. User clicks link → `auth-callback` detects `type=recovery` → redirects to `/reset-password` (user is now in a session with `aal1` but password-recovery event)
3. `supabase.auth.updateUser({ password: newPassword })` completes the reset

**Anti-enumeration**: `resetPasswordForEmail` always responds with success regardless of whether the email is registered — the same behaviour Supabase has built in. No additional code needed.

**Google-only accounts**: Supabase does not send a password reset email to accounts that have no password credential (Google-only). The Edge Function or frontend can check `user.identities` to detect this case.

**Alternatives considered**:

- Custom token table: unnecessary when Supabase handles it natively

---

## 6. IP Rate Limiting in Edge Function

**Decision**: Simple `auth_rate_limits` Postgres table + helper in `register-user`  
**Rationale**: Supabase's built-in rate limits apply at the auth API level, not at the custom Edge Function level. A lightweight DB table avoids adding a Redis/KV dependency.  
**Schema**: `(ip_address TEXT, action TEXT, window_start TIMESTAMPTZ, attempt_count INT)` with a unique constraint on `(ip_address, action, window_start)`. Window granularity: 10 minutes for registration, 60 minutes for resend.  
**Implementation pattern**: `INSERT ... ON CONFLICT DO UPDATE SET attempt_count = attempt_count + 1 RETURNING attempt_count` — atomic increment in one query.  
**Alternatives considered**:

- Cloudflare Workers rate limiting: would require moving the Edge Function to Cloudflare — too large a change
- Upstash Redis (via Vercel Marketplace): overkill for current scale; adds external dependency

---

## 7. New Environment Variables

| Variable                  | Where                                     | Purpose                                  |
| ------------------------- | ----------------------------------------- | ---------------------------------------- |
| `VITE_TURNSTILE_SITE_KEY` | `.env.local` + Supabase Edge Function env | Public key for Turnstile widget render   |
| `TURNSTILE_SECRET_KEY`    | Supabase Edge Function secret             | Server-side Turnstile token verification |

Test-mode values (never commit real keys):

- Site key: `1x00000000000000000000AA` (always passes)
- Secret: `1x0000000000000000000000000000000AA` (always verifies)

---

## 8. i18n Namespaces

New keys needed in both `en/` and `pl/`:

- `landing.beta.confirmEmailTitle`, `confirmEmailBody`, `resendConfirmation`, `resentConfirmation`
- `landing.beta.continueWithGoogle`
- `common.auth.forgotPassword`, `forgotPasswordTitle`, `forgotPasswordBody`, `sendResetLink`, `resetLinkSent`, `resetPasswordTitle`, `resetPasswordSubmit`, `passwordResetSuccess`, `emailNotConfirmed`, `resendConfirmationEmail`, `selectRoleTitle`, `selectRoleBody`, `confirmRole`
- `common.errors.turnstileFailed`, `common.errors.rateLimited`

All new keys MUST be added to both `en/` and `pl/` simultaneously per constitution.
