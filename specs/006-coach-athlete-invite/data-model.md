# Data Model: Coach Registration & Athlete Invite

**Feature**: 006-coach-athlete-invite | **Date**: 2026-03-09

---

## New Table: `invites`

```sql
CREATE TABLE invites (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  token      text        NOT NULL UNIQUE,
  coach_id   uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  status     text        NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'used', 'revoked', 'expired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '24 hours',  -- default tier; future Admin Panel will make this configurable
  used_by    uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  used_at    timestamptz
);
```

### Key design notes

- `coach_id` and `used_by` use `ON DELETE SET NULL` (not CASCADE). This preserves the invite row for audit purposes when the coach or athlete account is deleted — satisfying GDPR anonymisation-on-erasure (FR-022).
- `token` is `UNIQUE` — the DB enforces single-use at the constraint level as a backstop behind the Edge Function's atomic check.
- `expires_at` is evaluated lazily by the `get_invite_preview` RPC at read time; no background job required.

### Indexes

```sql
CREATE INDEX invites_coach_id_idx        ON invites (coach_id);
CREATE INDEX invites_token_idx           ON invites (token);       -- already covered by UNIQUE
CREATE INDEX invites_created_at_idx      ON invites (coach_id, created_at); -- rate-limit lookup
```

### Row-level security

```sql
-- Coaches read their own invites
CREATE POLICY "coach_reads_own_invites"
  ON invites FOR SELECT TO authenticated
  USING (coach_id = auth.uid());

-- Coaches revoke their own pending invites
CREATE POLICY "coach_revokes_own_invites"
  ON invites FOR UPDATE TO authenticated
  USING  (coach_id = auth.uid() AND status = 'pending')
  WITH CHECK (coach_id = auth.uid() AND status = 'revoked');

-- No direct INSERT from client — only via create_invite() RPC
-- No DELETE — records are kept for audit
```

---

## New DB Functions

### `create_invite()` → `text`

Called by authenticated coach. Enforces 5/day rate limit, generates and inserts token, returns raw token.

```
SECURITY DEFINER
Caller: authenticated (coach)
Returns: token text
Raises: 'rate_limit_exceeded' if coach has ≥5 invites in last 24h
```

### `get_invite_preview(p_token text)` → `json`

Public (anon-callable). Returns minimal info needed for the invite landing page. Lazily marks expired tokens.

```
SECURITY DEFINER
Caller: anon or authenticated
Returns: { valid: bool, coach_name?: string, reason?: 'not_found'|'used'|'revoked'|'expired' }
No internal IDs in response
```

---

## Modified Table: `profiles`

No new columns required. Existing `role` CHECK constraint already accepts `'coach'` and `'athlete'`.

The `handle_new_user()` trigger (migration 005) already reads `raw_user_meta_data->>'role'` — coach and athlete registration both pass `role` in `signUp` metadata, which the trigger applies.

---

## Existing Tables Used

| Table | Usage |
|---|---|
| `profiles` | Coach and athlete account data; read by `get_invite_preview` for coach name |
| `coach_athletes` | New row created atomically by `claim-invite` Edge Function on athlete registration |
| `auth.users` | Created by `admin.createUser` in `claim-invite`; deleted by `admin.deleteUser` in `delete-account` |

---

## TypeScript Domain Types

```typescript
// app/types/auth.ts (new or extend existing)

export type InviteStatus = 'pending' | 'used' | 'revoked' | 'expired'

export interface Invite {
  id: string
  token: string
  coachId: string | null        // null after GDPR erasure
  status: InviteStatus
  createdAt: string             // ISO 8601
  expiresAt: string             // ISO 8601
  usedBy: string | null
  usedAt: string | null
}

export interface InvitePreview {
  valid: boolean
  coachName?: string
  reason?: 'not_found' | 'used' | 'revoked' | 'expired'
}

export interface CreateInviteResult {
  token: string
  url: string                   // full shareable URL
}

export interface DailyInviteUsage {
  used: number                  // invites generated today
  limit: number                 // always 5 in this iteration
  resetsAt: string              // ISO 8601 — next midnight UTC
}
```

---

## State Transitions: Invite

```
[created] → pending
pending   → used      (claim-invite Edge Function on successful athlete registration)
pending   → revoked   (coach manually revokes via UI)
pending   → expired   (get_invite_preview detects expires_at < now(), lazily written)
used      → (terminal — no further transitions)
revoked   → (terminal)
expired   → (terminal)
```

---

## Mock Data Shape

```typescript
// app/lib/mock-data/invites.ts
export interface MockInvite extends Invite {
  // same shape — mock uses identical type
}

// Seed: a few mock invites per coach-1 in various states
const MOCK_INVITES: MockInvite[] = [
  { id: 'inv-1', token: 'abc123...', coachId: 'coach-1', status: 'pending', ... },
  { id: 'inv-2', token: 'def456...', coachId: 'coach-1', status: 'used',    ... },
]
```
