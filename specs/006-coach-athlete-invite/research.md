# Research: Coach Registration & Athlete Invite

**Feature**: 006-coach-athlete-invite | **Date**: 2026-03-09

---

## Decision 1: Atomic Invite Claim & Account Deletion

**Decision**: Two focused Supabase Edge Functions — `claim-invite` and `delete-account`.

**Rationale**: Both operations require the Supabase Admin API (`admin.createUser`, `admin.deleteUser`) which must never be called from the client. The project already uses Edge Functions for Strava OAuth (same Deno + `@supabase/supabase-js@2` pattern), so no new technology is introduced.

**Alternatives considered**:
- Client-side `signUp` + RPC claim: introduces a race window between user creation and invite marking. A second concurrent user could steal an invite between the two steps.
- DB-only RPC: cannot call `auth.admin` APIs from SQL; would require a separate mechanism for auth-user deletion.

---

## Decision 2: Invite Generation — DB RPC

**Decision**: Invite generation is a DB RPC (`create_invite()`) called via `supabase.rpc()` from the client. No Edge Function needed.

**Rationale**: Generation only needs to insert a row and enforce the daily rate limit — a straightforward `SECURITY DEFINER` function. Keeping it at the DB layer avoids cold-start latency and matches the project's existing RPC usage pattern (Strava sync uses RPCs).

**Alternatives considered**:
- Client-side insert: would require the client to generate the token (weaker entropy control) and cannot atomically enforce the rate limit without a race condition.
- Edge Function: unnecessary complexity for a simple insert + count operation.

---

## Decision 3: Invite Token Format

**Decision**: `encode(gen_random_bytes(16), 'hex')` — 32-character lowercase hex string (128 bits of entropy).

**Rationale**: `gen_random_bytes` is cryptographically secure (uses the OS CSPRNG). Hex encoding is URL-safe without padding issues. 128 bits matches the NIST minimum recommendation for unpredictable tokens.

**Alternatives considered**:
- `gen_random_uuid()`: only 122 bits and widely used for primary keys — a token that looks like a UUID is more likely to be confused with an ID.
- Base64url: marginally shorter but adds encoding complexity for negligible gain.

---

## Decision 4: Invite Preview (Unauthenticated Read)

**Decision**: A `SECURITY DEFINER` DB RPC `get_invite_preview(token)` returns `{valid: bool, coach_name?, reason?}`. No direct table access from anon role.

**Rationale**: The invite landing page must show the coach's name before the user is authenticated. Exposing the `invites` table directly to anon RLS would leak internal IDs. A narrow RPC returns only what is needed (coach display name + validity) with no internal identifiers in the response.

**Lazy expiry**: If the token is past `expires_at`, the RPC updates `status = 'expired'` at read time. No background job required — consistent with the spec assumption.

---

## Decision 5: Coach Registration UI

**Decision**: Extend `login.tsx` with a toggleable "Register as Coach" view. No separate route.

**Rationale**: The spec calls for "an entry point on the login/landing page." A single page with a sign-in / register toggle is the established pattern (GitHub, Notion, Vercel all use this). It avoids a new public route and keeps unauthenticated surface minimal (Constitution V: YAGNI).

---

## Decision 6: Account Deletion — Anonymise Then Delete

**Decision**: Edge Function `delete-account`:
1. Anonymises invite records (`coach_id = NULL`, `used_by = NULL`) to preserve audit trail.
2. Updates the profile name/email to generic placeholder values.
3. Calls `admin.deleteUser(userId)` — the `ON DELETE CASCADE` on `profiles` then fires, and the `ON DELETE SET NULL` on invites preserves the anonymised audit rows.

**Rationale**: GDPR right to erasure is satisfied (personal data removed). Audit trail is preserved (event structure + timestamps remain). `ON DELETE SET NULL` on invite FKs is the correct DB design to support this pattern.

---

## Decision 7: Bot Protection

**Decision**: Honeypot hidden field on both registration forms. Server-side: Supabase's built-in auth rate limiting (configurable in project settings) covers brute-force registration attempts.

**Rationale**: A honeypot catches the majority of simple bots with zero UX friction. Supabase's native rate limiter handles volume attacks at the infrastructure level. No third-party CAPTCHA dependency needed (Constitution V: simplicity).

---

## Decision 8: Invite Management Location

**Decision**: New "Athletes" tab in the Settings page (coaches only). Account deletion is a new section at the bottom of the existing "User" tab.

**Rationale**: Settings already uses a tabs pattern. Adding a coach-only "Athletes" tab is consistent and avoids a new route. Account deletion belongs in the User tab (personal account management) and a clearly separated danger zone section within it.

---

## Security Posture Summary

| Threat | Mitigation |
|---|---|
| User enumeration on duplicate email | Generic error message (FR-003) |
| Invite token guessing | 128-bit CSPRNG token (FR-006) |
| Invite reuse / race condition | Atomic `claim-invite` Edge Function; unique constraint on token |
| Session fixation after registration | `signInWithPassword` always issues a new session (FR-017) |
| Crawler consuming invite | `get_invite_preview` is read-only; invite consumed only when Edge Function runs on form submit |
| Client-side role injection | Role set server-side via `user_metadata` in `admin.createUser`; `handle_new_user` trigger reads from metadata (FR-016) |
| Admin API exposure | Only accessible inside Edge Functions (service role key never sent to client) |
| Excessive invite generation | DB RPC rate-limit: 5 per coach per calendar day (FR-020) |
| Bot registration | Honeypot field + Supabase auth rate limiting (FR-015) |
| GDPR erasure | Anonymise invites → delete auth user (cascade) — personal data removed, audit rows preserved (FR-022) |
