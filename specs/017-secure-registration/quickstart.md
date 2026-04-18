# Quickstart: Secure Registration

**Feature**: 017-secure-registration  
**Branch**: `017-secure-registration`

---

## Prerequisites

Before implementing, verify these one-time setup steps are done:

### 1. Cloudflare Turnstile

1. Cloudflare Dashboard → Security → Turnstile → Add Site
2. Select "Invisible" widget type
3. Copy **Site Key** → add to `.env.local` as `VITE_TURNSTILE_SITE_KEY`
4. Copy **Secret Key** → add to Supabase Edge Function secrets as `TURNSTILE_SECRET_KEY`

For local development/tests use the free test keys:

```
VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
```

### 2. Supabase Project Settings

1. Supabase Dashboard → Authentication → Email → **Enable email confirmations**: ON
2. Authentication → URL Configuration → set **Site URL** to your app's production URL
3. Authentication → URL Configuration → add `http://localhost:5173/**` to Redirect URLs (dev)

### 3. Google OAuth

1. Google Cloud Console → APIs & Services → Credentials → Create OAuth 2.0 Client ID
2. Application type: Web application
3. Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
4. Supabase Dashboard → Authentication → Providers → Google → Enable → paste Client ID + Secret
5. Enable: **Link accounts with the same email address** (Auth → Identity)

---

## Development Setup

```bash
# Install new dependency
pnpm add @marsidev/react-turnstile

# Run database migration
supabase db push  # applies auth_rate_limits migration

# Run dev server
pnpm dev
```

Add to `.env.local`:

```
VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA
```

---

## TDD Workflow

Follow this order for each user story:

1. **Write the test first** (it fails — that's expected)
2. **Write the minimum implementation** to make the test pass
3. **Refactor** without breaking the test

```bash
# Watch mode during development
pnpm test

# Full run before commit
pnpm test:run && pnpm typecheck
```

---

## Key Files

| File                                            | Purpose                                               |
| ----------------------------------------------- | ----------------------------------------------------- |
| `app/lib/schemas/auth.ts`                       | Zod schemas — write + test first                      |
| `app/routes/auth-callback.tsx`                  | Handles email confirm / OAuth / reset callbacks       |
| `app/routes/confirm-email.tsx`                  | "Check your email" screen                             |
| `app/routes/forgot-password.tsx`                | Reset request form                                    |
| `app/routes/reset-password.tsx`                 | New password form                                     |
| `app/routes/select-role.tsx`                    | Role picker for Google first-timers                   |
| `app/routes/register.tsx`                       | Modified: add Turnstile, redirect to confirm-email    |
| `app/routes/login.tsx`                          | Modified: add Google button + forgot password link    |
| `app/lib/context/AuthContext.tsx`               | Modified: add `loginWithGoogle`, `needsRoleSelection` |
| `supabase/functions/register-user/index.ts`     | Modified: Turnstile + rate limiting                   |
| `supabase/migrations/<ts>_auth_rate_limits.sql` | New migration                                         |

---

## Acceptance Checklist (before PR)

- [ ] `pnpm typecheck` passes
- [ ] `pnpm test:run` passes (all new tests green)
- [ ] Turnstile widget renders invisibly on registration form
- [ ] Registration creates unconfirmed account + shows confirm-email screen
- [ ] Confirmation link (from email) works on a different device
- [ ] Unconfirmed login shows resend UI
- [ ] Google sign-in creates account, triggers role selection, lands on dashboard
- [ ] Forgot password sends email; link redirects to reset-password page
- [ ] Old password rejected after reset; new password accepted
- [ ] i18n: all new keys in both `en/` and `pl/`
- [ ] `pnpm build` succeeds (no runtime import errors)
