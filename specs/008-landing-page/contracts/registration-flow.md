# Registration Flow

## Overview

Public endpoint — no session required. Supports `coach` and `athlete` roles.

```
Browser
  → POST /functions/v1/register-user   (edge function)
  → supabase.auth.signInWithPassword   (via AuthContext.login)
  → navigate(/:locale/:role)
```

---

## Edge Function: `register-user`

**Deployed with `--no-verify-jwt`** — the Supabase publishable key is not a JWT; default verification would reject every request.

### Request

```json
{
  "name": "Jan Trener",
  "email": "jantrener@gmail.com",
  "password": "Coach1234",
  "role": "coach",
  "website": ""
}
```

### Security checks (in order)

| Check | Where | Detail |
|---|---|---|
| Honeypot | Edge function | `website` field non-empty → silent `200` (no info leak) |
| Required fields | Edge function | `name`, `email`, `password` present |
| Role validation | Edge function | Must be `coach` or `athlete` |
| Password policy | Edge function | ≥8 chars, ≥1 uppercase, ≥1 digit |
| Coach rate limit | Edge function | Max 5 coach registrations per UTC calendar day |
| Password policy | Frontend (Zod) | Same rules — catches errors before the network call |

### Responses

| Status | `error` value | Meaning |
|---|---|---|
| 200 | — | User created |
| 400 | `missing_params` | Required field absent |
| 400 | `invalid_role` | Role not `coach` or `athlete` |
| 400 | `weak_password` | Password fails policy |
| 400 | `email_taken` | Email already registered |
| 429 | `coach_limit_reached` | Daily coach limit hit |
| 500 | `internal_error` | Supabase error |

---

## Frontend: `register.tsx`

### Happy path

1. Zod validates fields client-side
2. `fetch` → `register-user` edge function
3. `AuthContext.login()` — fetches profile and sets user in context **before** `navigate()` fires (prevents auth flash on the destination route)
4. `navigate(/:locale/:role, { replace: true })`

### Split-brain recovery

If a previous registration attempt created the user but sign-in failed, a retry returns `email_taken`. The frontend then attempts `login()` silently. If that succeeds, the user lands in the app without seeing an error — the partial registration is recovered transparently.

If `login()` also fails, the user is shown `emailAlreadyRegistered` and directed to log in manually.

### Error mapping

| Edge function error | UI behaviour |
|---|---|
| `email_taken` → login succeeds | Silent recovery, redirect to dashboard |
| `email_taken` → login fails | Field error on email field |
| `coach_limit_reached` | Toast/banner: "try again tomorrow" |
| anything else | Generic `registrationError` banner |

---

## Rate Limiting

Only coach registrations are rate-limited at the function level (`DAILY_COACH_REGISTRATION_LIMIT = 5`, defined in `app/lib/config.ts` and duplicated in the edge function). Athlete registrations rely on Supabase's built-in auth rate limiting.

The limit is a calendar day in UTC (midnight to midnight).

---

## Maintenance Notes

- To change the coach daily limit: update `DAILY_COACH_REGISTRATION_LIMIT` in **both** `app/lib/config.ts` and `supabase/functions/register-user/index.ts`, then redeploy the function.
- Password policy is enforced in two places (Zod schema in `register.tsx` and regex checks in the edge function) — keep them in sync.
- `register-coach` was removed in March 2026. `register-user` is the sole registration endpoint.
