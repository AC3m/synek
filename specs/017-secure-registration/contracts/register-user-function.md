# Contract: `register-user` Edge Function (v2)

**Path**: `supabase/functions/register-user/index.ts`  
**Auth**: `Authorization: Bearer <VITE_SUPABASE_ANON_KEY>`

---

## Request

```
POST /functions/v1/register-user
Content-Type: application/json
```

```typescript
{
  name: string; // min 1 char, trimmed
  email: string; // valid email
  password: string; // min 8, 1 uppercase, 1 digit
  role: 'coach' | 'athlete';
  website: string; // honeypot — MUST be empty string; non-empty = bot, silently accepted
  cfToken: string; // Cloudflare Turnstile token — validated server-side
}
```

## Responses

| Status | Body                                 | Meaning                                  |
| ------ | ------------------------------------ | ---------------------------------------- |
| 200    | `{ success: true }`                  | Account created; confirmation email sent |
| 400    | `{ error: 'missing_params' }`        | Required field absent                    |
| 400    | `{ error: 'invalid_role' }`          | Role not 'coach' or 'athlete'            |
| 400    | `{ error: 'weak_password' }`         | Password fails policy                    |
| 400    | `{ error: 'email_taken' }`           | Email already registered and confirmed   |
| 400    | `{ error: 'turnstile_failed' }`      | Turnstile token invalid or expired       |
| 429    | `{ error: 'coach_limit_reached' }`   | Daily beta coach slots exhausted         |
| 429    | `{ error: 'athlete_limit_reached' }` | Daily beta athlete slots exhausted       |
| 429    | `{ error: 'rate_limited' }`          | IP exceeded 5 registrations / 10 min     |
| 500    | `{ error: 'internal_error' }`        | Unexpected failure                       |

## Validation order (server-side)

1. Honeypot check (`website` non-empty → silent 200)
2. Turnstile token verification (POST to Cloudflare siteverify)
3. IP rate limit check (query `auth_rate_limits`)
4. Input validation (presence, role enum, password policy)
5. Beta slot limit check (count today's profiles by role)
6. `admin.createUser({ email_confirm: false, emailRedirectTo: ... })`
7. Increment `auth_rate_limits` counter
8. Return `{ success: true }`

## Breaking change from v1

- New required field: `cfToken` — omitting it in production returns `400 { error: 'turnstile_failed' }`
- `email_confirm` behaviour: accounts are now created **unconfirmed**. Callers MUST NOT call `login()` immediately after a 200 response — show the confirm-email screen instead.
