# Data Model: Secure Registration

**Feature**: 017-secure-registration  
**Date**: 2026-04-11

---

## Existing Entities (modified)

### `auth.users` (Supabase managed)

No schema change. Behaviour change: `email_confirm` flag removed from `admin.createUser` call so Supabase now sends a real confirmation email. `email_confirmed_at` column already exists — it becomes meaningful.

### `profiles` table (extended behaviour)

No schema change needed. The existing trigger that creates a profile row on `auth.users` insert must handle `role = null` for Google OAuth users (who haven't selected a role yet). The `AuthContext` detects `profile.role === null` and routes to role selection.

| Column       | Type           | Notes                                                                             |
| ------------ | -------------- | --------------------------------------------------------------------------------- |
| `id`         | `uuid`         | FK → `auth.users.id`                                                              |
| `name`       | `text`         | From `user_metadata.name` (email) or `raw_user_meta_data->>'full_name'` (Google)  |
| `role`       | `text`         | `'coach' \| 'athlete' \| null` — null only for Google users before role selection |
| `avatar_url` | `text \| null` | Already present                                                                   |
| `created_at` | `timestamptz`  | Already present                                                                   |

**Trigger behaviour for Google users**: `raw_user_meta_data` from Google contains `full_name` and `avatar_url`. The trigger should populate `name` from `full_name` and `avatar_url` from the Google picture URL. `role` stays `null` until the user selects it.

---

## New Entities

### `auth_rate_limits` (new table)

Tracks registration and resend-confirmation attempts per IP to enforce rate limits.

| Column          | Type          | Constraints         | Notes                                                 |
| --------------- | ------------- | ------------------- | ----------------------------------------------------- |
| `ip_address`    | `text`        | NOT NULL            | IPv4 or IPv6, extracted from `x-forwarded-for` header |
| `action`        | `text`        | NOT NULL            | `'register'` or `'resend_confirmation'`               |
| `window_start`  | `timestamptz` | NOT NULL            | Truncated to 10-min or 60-min bucket                  |
| `attempt_count` | `int`         | NOT NULL, DEFAULT 1 | Incremented atomically                                |

**Primary key**: `(ip_address, action, window_start)`  
**Row TTL**: Rows older than 24 hours are safe to clean up (no retention value).

**Rate limits enforced**:

- `action = 'register'` → max 5 per 10-minute window
- `action = 'resend_confirmation'` → max 3 per 60-minute window (keyed on IP, not user ID, to avoid user enumeration)

---

## State Transitions

### Registration (email/password)

```
Visitor → [submits form + Turnstile passes] → Unconfirmed User
Unconfirmed User → [clicks email link] → Confirmed User → Logged-in Session
Unconfirmed User → [requests resend] → Unconfirmed User (new token issued)
Unconfirmed User → [token expires after 24h] → Unconfirmed User (must resend)
```

### Registration (Google OAuth)

```
Visitor → [Continue with Google] → Google Consent → OAuth Callback
OAuth Callback → [no role in profile] → Role Selection
Role Selection → [role saved] → Confirmed User → Logged-in Session
OAuth Callback → [role exists] → Logged-in Session
```

### Password Reset

```
Logged-out User → [Forgot password] → Reset Email Sent
Reset Email Sent → [clicks link < 1h] → Reset Session (type=recovery)
Reset Session → [submits new password] → Confirmed User → Logged-in Session
Reset Session → [link expired] → Error → Offer resend
```

---

## Zod Schemas (boundary validation)

All schemas live in `app/lib/schemas/auth.ts` (new file).

```typescript
// Registration form
export const registrationSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
  role: z.enum(['coach', 'athlete']),
  cfToken: z.string().min(1), // Turnstile token — required in production
});

// Forgot password form
export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

// Reset password form
export const resetPasswordSchema = z
  .object({
    password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
  });

// Role selection (Google OAuth first-time users)
export const roleSelectionSchema = z.object({
  role: z.enum(['coach', 'athlete']),
});
```

---

## Migration

```sql
-- supabase/migrations/<timestamp>_auth_rate_limits.sql

CREATE TABLE public.auth_rate_limits (
  ip_address    text        NOT NULL,
  action        text        NOT NULL,
  window_start  timestamptz NOT NULL,
  attempt_count int         NOT NULL DEFAULT 1,
  PRIMARY KEY (ip_address, action, window_start)
);

-- Only service role can read/write (Edge Function uses service role client)
ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;
-- No RLS policies needed: Edge Function uses service-role key (bypasses RLS)

-- Auto-cleanup: delete rows older than 24h (optional scheduled job or simple TTL)
CREATE INDEX ON public.auth_rate_limits (window_start);
```

No changes to the `profiles` table schema are required. The existing trigger and `role` column already support `null` (it is not `NOT NULL` in the current schema).
