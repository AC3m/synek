# Auth Callback Pattern

`app/routes/auth-callback.tsx` is a **unified callback handler** for all Supabase auth flows that redirect back to the app.

## How it works

Supabase redirects to `/auth/callback?type=<type>&token_hash=<hash>` after:

| `type` param | Flow               | What the route does                                                                                                             |
| ------------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `email`      | Email confirmation | Calls `verifyEmailToken`, navigates to dashboard; shows specific error cards for `otp_expired` / `otp_disabled`                 |
| `recovery`   | Password reset     | Stores `sessionStorage('auth_callback_type', 'recovery')`, navigates to `/reset-password`                                       |
| _(none)_     | Google OAuth       | Shows "completing sign-in…" spinner; navigates when `user` arrives via `onAuthStateChange`; falls back to error card after 10 s |

## Adding a new auth flow

1. Add the new Supabase redirect URL pointing to `/auth/callback`
2. In `auth-callback.tsx`, add a new `if (type === '...')` branch before the OAuth fallthrough
3. Write a new scenario in `app/test/integration/auth-callback.test.tsx`

## Key constraints

- Never call `supabase.auth.*` directly in this route — use functions from `lib/queries/auth-callbacks`
- The OAuth branch relies on `useAuth().user` being populated by `onAuthStateChange` — do **not** poll `getSession` here
