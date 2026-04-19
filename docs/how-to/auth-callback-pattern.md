# Auth Callback Pattern

`app/routes/auth-callback.tsx` is a **unified callback handler** for all Supabase auth flows that redirect back to the app.

## How it works

Supabase redirects to `/:locale/auth/callback?type=<type>&token_hash=<hash>` after:

| `type` param | Flow               | What the route does                                                                                                                   |
| ------------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `signup`     | Email confirmation | Calls `verifyEmailToken`, navigates to dashboard; shows specific error cards for `otp_expired` / `otp_disabled`                       |
| `email`      | Magic link login   | Same as `signup` — calls `verifyEmailToken` with `type='email'`                                                                       |
| `recovery`   | Password reset     | Calls `verifyEmailToken` to exchange token, stores `sessionStorage('auth_callback_type', 'recovery')`, navigates to `/reset-password` |
| _(none)_     | Google OAuth       | Shows "completing sign-in…" spinner; navigates when `user` arrives via `onAuthStateChange`; falls back to error card after 10 s       |

### PKCE flow (link-scanner safe)

Email templates use `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=signup|recovery` instead of `{{ .ConfirmationURL }}`. This means:

- The email link points to **our SPA**, not Supabase's `/auth/v1/verify` endpoint
- Link scanners (Cloudflare, etc.) fetch our HTML page but don't consume the token
- Only the client-side `verifyOtp()` call consumes the token

Templates live in `supabase/templates/`. Deploy to hosted project with:

```bash
SUPABASE_ACCESS_TOKEN=sbp_xxx SUPABASE_PROJECT_REF=xxx ./scripts/supabase-deploy-email-templates.sh
```

### Hash fragment handling

Supabase may also put data in the **hash fragment** (`#error=...&error_code=otp_expired` for errors, `#access_token=...&type=recovery` for implicit-flow recovery). The route parses both query params and hash.

## Adding a new auth flow

1. Add the new Supabase redirect URL pointing to `/:locale/auth/callback`
2. In `auth-callback.tsx`, add a new `if (type === '...')` branch before the OAuth fallthrough
3. Write a new scenario in `app/test/integration/auth-callback.test.tsx`

## Key constraints

- Never call `supabase.auth.*` directly in this route — use functions from `lib/queries/auth-callbacks`
- The OAuth branch relies on `useAuth().user` being populated by `onAuthStateChange` — do **not** poll `getSession` here
