# Edge Function Contracts

**Feature**: 006-coach-athlete-invite | **Date**: 2026-03-09

---

## `claim-invite`

**Path**: `POST /functions/v1/claim-invite`
**Auth**: None (unauthenticated request — athlete does not have an account yet)
**Service role**: Used internally (never sent to client)

### Request

```json
{
  "token":    "string — 32-char hex invite token",
  "name":     "string — athlete's display name",
  "email":    "string — athlete's email address",
  "password": "string — athlete's chosen password (≥8 chars, ≥1 uppercase, ≥1 number)"
}
```

### Responses

```json
// 200 OK — registration successful
{ "success": true }

// 400 — validation error
{ "error": "missing_params" }
{ "error": "invalid_token",   "reason": "not_found" | "used" | "revoked" | "expired" }
{ "error": "email_taken" }
{ "error": "weak_password" }

// 500 — unexpected server error
{ "error": "internal_error" }
```

### Internal flow

1. Validate all params present.
2. Fetch invite row: token match, status = 'pending', expires_at > now().
3. If invalid → return `400 invalid_token`.
4. Call `admin.createUser({ email, password, email_confirm: true, user_metadata: { name, role: 'athlete' } })`.
5. If email exists → return `400 email_taken` (generic, does not reveal account type).
6. Insert `coach_athletes` row: `(coach_id = invite.coach_id, athlete_id = newUser.id)`.
7. Update invite: `status = 'used', used_by = newUser.id, used_at = now()`.
8. Return `200 { success: true }`.
9. Client follows up with `supabase.auth.signInWithPassword({ email, password })` — issues a fresh session.

### Security notes

- Steps 4–7 are executed sequentially with early return on failure. If step 6 fails, the athlete account exists but is orphaned — the Edge Function should attempt to `admin.deleteUser` the newly created account before returning 500.
- The invite token is never echoed back in any response.
- The service role key is only inside the Edge Function environment — never client-accessible.

---

## `delete-account`

**Path**: `POST /functions/v1/delete-account`
**Auth**: Bearer token (user's current JWT, passed as `Authorization` header)
**Service role**: Used internally

### Request

```json
{} // empty body — user identity derived from JWT
```

### Responses

```json
// 200 OK
{ "success": true }

// 401 — missing or invalid token
{ "error": "unauthorized" }

// 500
{ "error": "internal_error" }
```

### Internal flow

1. Verify JWT from `Authorization` header using `supabase.auth.getUser(jwt)`. Extract `userId`.
2. Anonymise invite records: `UPDATE invites SET coach_id = NULL, used_by = NULL WHERE coach_id = userId OR used_by = userId`.
3. Anonymise profile: `UPDATE profiles SET name = 'Deleted User', email = 'deleted_' || gen_random_uuid() || '@synek.invalid' WHERE id = userId`.
   - Note: profile row will cascade-delete in step 4, but anonymising first ensures no personal data survives even momentarily in any audit log between steps.
4. Call `admin.deleteUser(userId)` — cascades to `profiles` (ON DELETE CASCADE) and nullifies invite FKs (ON DELETE SET NULL).
5. Return `200 { success: true }`.
6. Client clears auth state and redirects to `/login`.

### Security notes

- JWT is verified server-side — client cannot delete another user's account.
- Step 2 runs before step 4 so GDPR anonymisation is committed before the cascade fires.

---

## DB RPC Contracts

These are called via `supabase.rpc()` from the client.

### `create_invite()`

```typescript
supabase.rpc('create_invite')
// Returns: { data: string /* token */, error }
// Throws PostgreSQL exception 'rate_limit_exceeded' if coach has ≥5 invites today
```

### `get_invite_preview(p_token)`

```typescript
supabase.rpc('get_invite_preview', { p_token: string })
// Returns: { data: InvitePreview, error }
// InvitePreview = { valid: bool, coach_name?: string, reason?: string }
// Callable by anon role
```
