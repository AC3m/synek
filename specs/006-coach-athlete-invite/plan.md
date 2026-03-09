# Implementation Plan: Coach Registration & Athlete Invite

**Branch**: `006-coach-athlete-invite` | **Date**: 2026-03-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-coach-athlete-invite/spec.md`

## Summary

Implement self-service coach registration, invite-based athlete onboarding, and account deletion — all production-ready with GDPR compliance and infosec industry-standard controls. Coach signs up on the login page; generates single-use, expiring invite links; athlete registers via the invite URL. Account deletion is a two-step confirmation in User Settings. Two small Edge Functions handle the only two operations that require the Supabase Admin API; everything else stays client-side via existing patterns.

## Technical Context

**Language/Version**: TypeScript 5 strict
**Primary Dependencies**: React 19, React Router 7 (SPA), TanStack Query 5, Supabase JS 2, shadcn/ui, i18next, Zod 4
**Storage**: Supabase PostgreSQL — new `invites` table; no schema changes to existing tables
**Testing**: Vitest 4 + @testing-library/react 16 — mock implementations for all new query files
**Target Platform**: SPA, Vercel (existing deployment)
**Performance Goals**: Invite page load < 500ms; registration flow < 3s end-to-end (within SC-001/SC-003)
**Constraints**: No new npm dependencies unless unavoidable; bundle impact must stay under 50 KB gzipped
**Scale/Scope**: 5 invites/coach/day; no bulk operations; single-coach-per-athlete constraint

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | ✅ PASS | Named exports, `cn()`, `~/` aliases, row mappers in query files, no direct `supabase.from()` in components |
| II. Testing Standards | ✅ PASS | Mock implementations for all new query files; optimistic updates on invite mutations; `pnpm typecheck` gate |
| III. UX Consistency | ✅ PASS | All strings via i18next (en + pl); shadcn components via CLI only; no new sport colors (not applicable) |
| IV. Performance | ✅ PASS | Specific column selects; no wildcard `select('*')`; no new large dependencies |
| V. Simplicity | ✅ PASS | Two Edge Functions only where admin API required; DB RPC for invite generation; no premature abstractions |

No violations. Complexity Tracking table not required.

## Project Structure

### Documentation (this feature)

```text
specs/006-coach-athlete-invite/
├── plan.md              ← this file
├── research.md          ← Phase 0
├── data-model.md        ← Phase 1
├── contracts/
│   └── edge-functions.md ← Phase 1
└── tasks.md             ← /speckit.tasks output
```

### Source Code

```text
app/
├── routes/
│   └── invite.$token.tsx           # Public invite landing + athlete registration
├── components/
│   └── settings/
│       ├── UserTab.tsx             # Extend: add account deletion danger zone
│       ├── AthletesTab.tsx         # New: invite management (coaches only)
│       └── DeleteAccountDialog.tsx # New: two-step confirmation dialog
├── lib/
│   ├── queries/
│   │   └── invites.ts              # New: invite CRUD + mock implementations
│   ├── hooks/
│   │   └── useInvites.ts           # New: React Query hooks (list, create, revoke)
│   └── mock-data/
│       └── invites.ts              # New: mock invite seed data
├── i18n/resources/
│   ├── en/
│   │   ├── common.json             # Extend: auth.register.*, invite.*, settings.deleteAccount.*
│   │   └── coach.json              # Extend: athletes.invite.*
│   └── pl/
│       ├── common.json             # Same keys, Polish values
│       └── coach.json              # Same keys, Polish values

supabase/
├── migrations/
│   └── 011_invites_schema.sql      # invites table, RPCs, RLS
└── functions/
    ├── claim-invite/
    │   └── index.ts                # Atomic athlete registration
    └── delete-account/
        └── index.ts                # Account deletion with admin API
```

**Structure Decision**: Single project (web SPA). No new top-level directories. All new code follows existing directory conventions verbatim.

---

## Phase 0: Research

All decisions resolved. See [research.md](./research.md) for full rationale.

| Decision | Choice | Key Reason |
|---|---|---|
| Atomic invite claim | Edge Function `claim-invite` | Admin API required; prevents race conditions |
| Account deletion | Edge Function `delete-account` | `admin.deleteUser` only safe server-side |
| Invite generation | DB RPC `create_invite()` | Simple insert + rate-limit check; no admin API needed |
| Invite preview | DB RPC `get_invite_preview()` (SECURITY DEFINER, anon-callable) | Returns coach name without exposing internal IDs |
| Coach registration UI | Toggle on existing `login.tsx` | YAGNI; spec says "entry point on login page" |
| Bot protection | Honeypot field + Supabase native rate limiting | Zero UX friction; no third-party dependency |
| Token format | `gen_random_bytes(16)` hex-encoded (128 bits) | CSPRNG, URL-safe, meets NIST minimum |
| Invite management location | New "Athletes" tab in Settings (coaches only) | Consistent with existing tabs pattern |
| Account deletion location | Danger zone at bottom of existing "User" tab | Personal account management belongs in User tab |

---

## Phase 1: Design

### 1. Database Migration (`011_invites_schema.sql`)

Full schema in [data-model.md](./data-model.md). Summary:

- New `invites` table with `ON DELETE SET NULL` on both FK columns (GDPR-safe audit trail). Default expiry: 24 hours (designed to be Admin Panel-configurable in future).
- `create_invite()` SECURITY DEFINER RPC — rate-limit enforced at DB level.
- `get_invite_preview(token)` SECURITY DEFINER RPC — anon-callable, returns only `{valid, coach_name, reason}`.
- RLS: coaches read/revoke own invites; no direct client INSERT.
- `invites` granted EXECUTE on `get_invite_preview` to `anon` role.

### 2. Edge Functions

See [contracts/edge-functions.md](./contracts/edge-functions.md). Pattern follows existing `strava-auth` function (Deno, `@supabase/supabase-js@2`, CORS headers, `json()` helper).

**`claim-invite`**: Validates token → `admin.createUser` (role=athlete, email confirmed) → insert `coach_athletes` → mark invite used → client signs in with `signInWithPassword` (fresh session, FR-017).

**`delete-account`**: Verify JWT → anonymise invite records → `admin.deleteUser` (CASCADE handles profile + SET NULL handles invites).

### 3. Coach Registration

Extend `login.tsx` with a "Register as Coach" link that toggles to a registration form in the same page component. On submit:

```typescript
await supabase.auth.signUp({
  email,
  password,
  options: { data: { name, role: 'coach' } },
})
```

The `handle_new_user()` trigger (migration 005) reads `raw_user_meta_data` and populates `profiles.role = 'coach'` automatically. No additional DB work needed.

Password validation: Zod schema client-side (`min(8)`, `.regex(/[A-Z]/)`, `.regex(/[0-9]/)`). Honeypot field: `<input name="website" tabIndex={-1} className="sr-only" aria-hidden="true" />` — reject submission silently if non-empty.

### 4. Invite Management UI

New `AthletesTab` component in Settings (visible to coaches only). Sections:
- **Invite counter**: "X of 5 invites used today. Resets at midnight UTC." (queries from invite list)
- **Generate button**: disabled when limit reached; calls `supabase.rpc('create_invite')`.
- **Invite list**: table showing all coach's invites with status badge, created date, expiry, and Revoke button for pending invites.
- **Copy link**: copies `${window.location.origin}/invite/${token}` to clipboard.

React Query hooks in `useInvites.ts`:
- `useInvites(coachId)` — query, lists all coach invites
- `useCreateInvite()` — mutation with optimistic update (adds pending invite to list)
- `useRevokeInvite()` — mutation with optimistic update (sets status to revoked locally)

### 5. Invite Landing Page (`/invite/$token`)

Route registered outside the `:locale` layout in `routes.ts` (like `login`). On load:
1. Calls `get_invite_preview(token)` via `supabase.rpc`.
2. If `valid: false` → shows error state with appropriate message (`reason` → i18n key).
3. If `valid: true` → shows registration form with coach name in heading.
4. On submit → calls `claim-invite` Edge Function → on success → `signInWithPassword` → navigate to `/${locale}/athlete` (locale from browser language preference, fall back to `'pl'`).
5. If user is already authenticated → show "This invite is for new accounts only" with logout option.

Browser locale detection:
```typescript
const browserLocale = navigator.language.startsWith('en') ? 'en' : 'pl'
```

### 6. Account Deletion (`DeleteAccountDialog`)

Added to the bottom of `UserTab` in a visually separated danger zone.

**Step 1**: "Delete Account" button → opens dialog. Dialog body explains: all data is permanently deleted, this cannot be undone. CTA: "Continue to confirm".

**Step 2**: Text input. Label: "Type your username to confirm". Submit button ("Delete My Account") disabled until `input.value === user.name` (exact string match, case-sensitive per the spec). On submit:
1. Calls `delete-account` Edge Function with auth header.
2. On success: `logout()` (clears auth state) → navigate to `/login`.

Optimistic update is not applicable here (irreversible). Loading state on the submit button during the request.

### 7. i18n Keys

New keys to add to both `en` and `pl` namespaces:

**`common.json`**:
```
auth.registerAsCoach, auth.registerAsCoachSubtitle, auth.fullName,
auth.createAccount, auth.creatingAccount, auth.alreadyHaveAccount,
auth.passwordRequirements,
invite.invalidTitle, invite.invalidUsed, invite.invalidRevoked,
invite.invalidExpired, invite.invalidNotFound, invite.askNewInvite,
invite.welcomeTitle, invite.welcomeSubtitle (with {{coachName}}),
invite.createAccount, invite.creatingAccount,
settings.deleteAccount.title, settings.deleteAccount.description,
settings.deleteAccount.cta, settings.deleteAccount.confirm,
settings.deleteAccount.typeUsername, settings.deleteAccount.typeUsernamePlaceholder,
settings.deleteAccount.submit, settings.deleteAccount.deleting,
settings.deleteAccount.dangerZone,
settings.tabs.athletes
```

**`coach.json`**:
```
athletes.title, athletes.inviteSection, athletes.generateLink,
athletes.copyLink, athletes.copied, athletes.dailyLimit (with {{used}}/{{limit}}),
athletes.resetsAt (with {{time}}), athletes.limitReached,
athletes.inviteList.empty, athletes.inviteList.status.*,
athletes.revokeInvite, athletes.revokeConfirm
```

### 8. Mock Data & Testing

**`app/lib/mock-data/invites.ts`**: Seed 4 invites for `coach-1` (one per status: pending, used, revoked, expired). Export CRUD functions matching the real query signatures.

**`app/lib/queries/invites.ts`**: Real + mock implementations. Row mapper `toInvite(row)` for snake → camel. Mock functions exported for unit tests.

**Test files** (in `app/test/`):
- `invites.test.ts` — unit tests for `toInvite` mapper, `useInvites` hook, `useCreateInvite` optimistic update, `useRevokeInvite` rollback.
- `invite-page.test.tsx` — integration: valid token shows form, invalid token shows error, authenticated user sees logout prompt.
- `delete-account-dialog.test.tsx` — step 1 CTA opens step 2, submit disabled until username matches, submit calls Edge Function.

---

## Security Controls Summary

| Control | Implementation |
|---|---|
| Invite token entropy | `gen_random_bytes(16)` hex — 128 bits CSPRNG |
| No IDs in invite URL | Only token in URL; RPC returns no internal IDs |
| Atomic invite claim | Edge Function: validate → create user → link → mark used (sequential, abort on any failure) |
| Session fixation prevention | `signInWithPassword` always issues new session after registration |
| Role enforcement | `admin.createUser` sets role in metadata; `handle_new_user` trigger applies it; client claims ignored |
| Rate limit on invite generation | DB RPC enforces 5/coach/day before insert |
| Bot protection | Honeypot field; Supabase native auth rate limiting |
| Admin API isolation | Service role key only in Edge Functions; never returned to client |
| GDPR erasure | Invite anonymisation committed before `admin.deleteUser` cascade |
| User enumeration prevention | Registration and invite claim use generic error messages for existing-email case |
| Double-confirm deletion | Username-match gate in UI + server-side JWT verification in Edge Function |
