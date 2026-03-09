# Tasks: Coach Registration & Athlete Invite

**Input**: Design documents from `/specs/006-coach-athlete-invite/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/edge-functions.md ✅

**Tests**: Included — 3 test files covering unit (query/hook layer) and integration (UI components). Written TDD-style: write test first, confirm FAIL, then implement.

**Organization**: Tasks grouped by user story. Each phase is independently completable and testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other [P] tasks in the same phase (different files, no shared state)
- **[Story]**: Maps to user story from spec.md (US1–US4)
- Exact file paths in every task description

---

## Phase 1: Setup — DB & Type Foundation

**Purpose**: Establish the new `invites` table, RPCs, RLS, and TypeScript types before any application code is written.

**⚠️ CRITICAL**: Application code in all subsequent phases depends on these artifacts existing.

- [X] T001 Create `supabase/migrations/011_invites_schema.sql`: define `invites` table (`id uuid PK`, `token text UNIQUE`, `coach_id uuid REFERENCES profiles(id) ON DELETE SET NULL`, `status text CHECK IN ('pending','used','revoked','expired') DEFAULT 'pending'`, `created_at timestamptz DEFAULT now()`, `expires_at timestamptz DEFAULT now() + interval '24 hours'`, `used_by uuid REFERENCES profiles(id) ON DELETE SET NULL`, `used_at timestamptz`); add indexes (`invites_coach_id_idx`, `invites_created_at_idx`); create `create_invite()` SECURITY DEFINER function (checks count of invites by `auth.uid()` where `created_at >= date_trunc('day', now() AT TIME ZONE 'UTC')` ≥ 5 → raise `rate_limit_exceeded`; this enforces a **calendar day** limit resetting at midnight UTC, consistent with FR-020 and the UI counter in T013; then inserts with `encode(gen_random_bytes(16),'hex')` token, returns token text); create `get_invite_preview(p_token text)` SECURITY DEFINER function (joins `invites` + `profiles`, lazily updates status to `expired` if past `expires_at`, returns json `{valid, coach_name?, reason?}`); grant `EXECUTE ON FUNCTION get_invite_preview` to `anon` role; RLS: enable on `invites`, policy `coach_reads_own_invites` (SELECT, `coach_id = auth.uid()`), policy `coach_revokes_own_invites` (UPDATE USING `coach_id = auth.uid() AND status = 'pending'` WITH CHECK `status = 'revoked'`)
- [X] T002 [P] Create `app/types/invites.ts`: export `InviteStatus = 'pending' | 'used' | 'revoked' | 'expired'`; export `interface Invite { id: string, token: string, coachId: string|null, status: InviteStatus, createdAt: string, expiresAt: string, usedBy: string|null, usedAt: string|null }`; export `interface InvitePreview { valid: boolean, coachName?: string, reason?: 'not_found'|'used'|'revoked'|'expired' }`; export `interface DailyInviteUsage { used: number, limit: number, resetsAt: string }`

**Checkpoint**: Migration file ready to apply; TypeScript types defined.

---

## Phase 2: Foundational — Data Layer

**Purpose**: Query infrastructure, mock data, React Query hooks, i18n strings, and unit tests. All user story UI depends on this layer.

**⚠️ CRITICAL**: Complete before any user story implementation begins.

- [X] T003 Create `app/lib/mock-data/invites.ts`: define `MOCK_INVITES` array with 4 entries for `coach-1` — one per status (pending with future expiry, used, revoked, expired with past expiry); export `mockListInvites(coachId: string): Invite[]`; export `mockCreateInvite(coachId: string): string` (checks count of today's invites ≥ 5 → throw 'rate_limit_exceeded', otherwise pushes new entry, returns token); export `mockRevokeInvite(inviteId: string): void` (sets status to 'revoked'); export `mockGetInvitePreview(token: string): InvitePreview` (returns `{valid:true, coachName:'Coach'}` for pending non-expired token, `{valid:false, reason}` otherwise)
- [X] T004 [P] Extend `app/lib/mock-data/index.ts`: add `export * from './invites'`
- [X] T005 [P] Extend `app/lib/queries/keys.ts`: add `invites: { all: ['invites'] as const, byCoach: (coachId: string) => ['invites', coachId] as const, preview: (token: string) => ['invites', 'preview', token] as const }` to the `queryKeys` object
- [X] T006 [P] Write `app/test/invites.test.ts` — **write FIRST, confirm tests FAIL before T007/T008**: mock `~/lib/queries/invites` using async factory pattern (`vi.mock('~/lib/queries/invites', async () => {...})`); mock `~/lib/context/AuthContext` (`useAuth: () => ({user: {id:'coach-1',...}})`); use `createTestQueryClient()` per test; write tests: `toInvite()` maps snake_case DB row to camelCase `Invite`; `useInvites('coach-1')` returns the mock invite list; `useCreateInvite` optimistic update inserts a pending entry before mutation resolves; `useCreateInvite` rolls back the optimistic entry on mutation error; `useRevokeInvite` optimistically sets status to 'revoked'; `useRevokeInvite` rolls back on error; run `pnpm test app/test/invites.test.ts` and confirm all tests fail (modules not yet implemented)
- [X] T007 Create `app/lib/queries/invites.ts`: import `supabase`, `isMockMode` from `~/lib/supabase`; import mock functions from `~/lib/mock-data`; define `toInvite(row: Record<string, unknown>): Invite` mapper (snake_case → camelCase); export `listInvites(coachId: string): Promise<Invite[]>` (mock: `mockListInvites`, real: `supabase.from('invites').select('id, token, coach_id, status, created_at, expires_at, used_by, used_at').eq('coach_id', coachId).order('created_at', {ascending:false})`); export `createInvite(): Promise<string>` (mock: `mockCreateInvite`, real: `supabase.rpc('create_invite')`); export `revokeInvite(inviteId: string): Promise<void>` (mock: `mockRevokeInvite`, real: `supabase.from('invites').update({status:'revoked'}).eq('id', inviteId)`); export `getInvitePreview(token: string): Promise<InvitePreview>` (mock: `mockGetInvitePreview`, real: `supabase.rpc('get_invite_preview', {p_token: token})`)
- [X] T008 Create `app/lib/hooks/useInvites.ts`: export `useInvites(coachId: string)` — `useQuery({queryKey: queryKeys.invites.byCoach(coachId), queryFn: () => listInvites(coachId), enabled: !!coachId})`; export `useCreateInvite()` — `useMutation` with `onMutate` (cancel + snapshot), `onError` (rollback), `onSettled` (invalidate `invites.byCoach`); optimistic update inserts a `{status:'pending'}` entry; export `useRevokeInvite()` — same optimistic pattern, sets `status:'revoked'` locally on mutate, rolls back on error; export `useInvitePreview(token: string)` — `useQuery({queryKey: queryKeys.invites.preview(token), queryFn: () => getInvitePreview(token), enabled: !!token, retry: false})`
- [X] T009 [P] Add i18n keys to `app/i18n/resources/en/common.json` and `app/i18n/resources/pl/common.json` simultaneously: under `auth` add `registerAsCoach`, `registerAsCoachSubtitle`, `fullName`, `createAccount`, `creatingAccount`, `alreadyHaveAccount`, `signInInstead`, `passwordRequirements`, `privacyNotice` (e.g. "Privacy Notice"), `privacyNoticeAgree` (e.g. "By registering you agree to our {{link}}."); add top-level `invite` object with `invalidTitle`, `invalidUsed`, `invalidRevoked`, `invalidExpired`, `invalidNotFound`, `askNewInvite`, `welcomeTitle` (with `{{coachName}}`), `welcomeSubtitle`, `createAccount`, `creatingAccount`, `alreadySignedIn`; under `settings` add `deleteAccount.dangerZone`, `deleteAccount.title`, `deleteAccount.description`, `deleteAccount.cta`, `deleteAccount.confirmStep`, `deleteAccount.typeUsername`, `deleteAccount.typeUsernamePlaceholder`, `deleteAccount.submit`, `deleteAccount.deleting`; under `settings.tabs` add `athletes`
- [X] T010 [P] Add i18n keys to `app/i18n/resources/en/coach.json` and `app/i18n/resources/pl/coach.json` simultaneously: add top-level `athletes` object with `title`, `inviteSection`, `generateLink`, `generating`, `copyLink`, `copied`, `dailyLimit` (with `{{used}}` and `{{limit}}`), `resetsAt` (with `{{time}}`), `limitReached`, `inviteList.empty`, `inviteList.status.pending`, `inviteList.status.used`, `inviteList.status.revoked`, `inviteList.status.expired`, `inviteList.expiresAt` (with `{{time}}`), `inviteList.createdAt` (with `{{date}}`), `revokeInvite`, `revokeConfirm`

**Checkpoint**: Data layer + unit tests complete. Run `pnpm test app/test/invites.test.ts` — all tests should now PASS.

---

## Phase 3: User Story 1 — Coach Self-Registration (Priority: P1) 🎯 MVP

**Goal**: New user can register as a coach directly from the login page without needing an invite.

**Independent Test**: Open `/login` unauthenticated → click "Register as Coach" → fill name, email, valid password → submit → assert redirect to `/:locale/coach` and user role is coach.

- [X] T011 [P] Add `mockRegisterCoach(email: string, password: string, name: string): AuthUser` to `app/lib/auth.ts`: push `{id: crypto.randomUUID(), email, password, role:'coach' as UserRole, name, avatarUrl:null}` to MOCK_USERS; return `{id, email, role:'coach', name, avatarUrl:null}`; this mock is required before T012 so the register form works in mock mode
- [X] T012 [US1] Extend `app/routes/login.tsx`: add `mode` state (`'login' | 'register'`, default `'login'`); add `name` state string; define Zod schema `registerSchema` (`name: z.string().min(1)`, `email: z.string().email()`, `password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/)`); add honeypot `<input name="website" tabIndex={-1} className="sr-only" aria-hidden="true" />` — reject submit silently if non-empty; in register mode render: heading `t('auth.registerAsCoach')`, full name input (id=`name`), email input, password input with show/hide toggle (reuse existing toggle), password requirements hint `t('auth.passwordRequirements')`, submit button showing `t('auth.creatingAccount')` while pending; on submit: validate with `registerSchema`, call `supabase.auth.signUp({email, password, options:{data:{name, role:'coach'}}})` (real) or `mockRegisterCoach(email, password, name)` then manually sign in (mock mode); on success redirect to `/${locale}/coach`; generic error for email already in use (do not reveal account type); add `t('auth.alreadyHaveAccount')` toggle link at bottom; swap subtitle text to `t('auth.registerAsCoachSubtitle')` in register mode; **FR-018**: render `<p className="text-xs text-muted-foreground">` with `t('auth.privacyNoticeAgree', {link: <a href={import.meta.env.VITE_PRIVACY_NOTICE_URL ?? '/privacy'} target="_blank" className="underline">{t('auth.privacyNotice')}</a>})` above the submit button using `Trans` component from react-i18next

**Checkpoint**: Coach can self-register. US1 fully functional and independently testable.

---

## Phase 4: User Story 2 — Coach Generates Athlete Invite Link (Priority: P2)

**Goal**: Authenticated coach can generate, copy, view, and revoke invite links from Settings.

**Independent Test**: Log in as coach → navigate to Settings → "Athletes" tab visible → click "Generate Invite Link" → invite URL appears in list → copy to clipboard works → daily counter shows 1/5 → revoke the invite → status badge changes to "Revoked".

- [X] T013 [P] [US2] Create `app/components/settings/AthletesTab.tsx`: named export `AthletesTab`; accepts `className?: string`; uses `useTranslation('coach')` for all strings in this component (namespace is `'coach'`, keys are `athletes.*`); uses `useAuth()` to get `user.id`; uses `useInvites(user.id)`, `useCreateInvite()`, `useRevokeInvite()`; derive `DailyInviteUsage` from invite list (count where `createdAt >= today UTC midnight`, limit=5, resetsAt=next midnight UTC formatted with `date-fns`); render: section heading `t('athletes.inviteSection')`; daily counter `t('athletes.dailyLimit', {used, limit})` + reset time `t('athletes.resetsAt', {time: ...})`; "Generate Invite Link" Button (disabled when `used >= limit` or `createInvite.isPending`), label `t('athletes.generateLink')`, on click calls `createInvite.mutate()` then sets clipboard to `${window.location.origin}/invite/${token}`, show `t('athletes.copied')` confirmation for 2s; invite list table with columns: status badge (`Badge` variant by status, label `t(\`athletes.inviteList.status.${invite.status}\`)`), created date (`format(createdAt, 'dd MMM yyyy')`), expires/expired at, copy icon button (copies URL, label `t('athletes.copyLink')`), "Revoke" Button (only for `status === 'pending'`, label `t('athletes.revokeInvite')`, calls `revokeInvite.mutate(id)`); empty state `t('athletes.inviteList.empty')` when no invites; use `cn()` for class merging
- [X] T014 [US2] Extend `app/routes/settings.tsx`: import `AthletesTab` from `~/components/settings/AthletesTab`; add `'athletes'` to the tab value union; in `TabsList` add `{user?.role === 'coach' && <TabsTrigger value="athletes">{t('settings.tabs.athletes')}</TabsTrigger>}`; add `{user?.role === 'coach' && <TabsContent value="athletes"><AthletesTab /></TabsContent>}` after the user tab content

**Checkpoint**: Coach invite management fully functional. US2 independently testable.

---

## Phase 5: User Story 3 — Athlete Registers via Invite Link (Priority: P3)

**Goal**: Athlete opens a valid invite URL, sees coach context, registers, and is auto-linked to the coach.

**Independent Test**: Generate valid invite URL as coach → open in fresh unauthenticated browser tab → coach name visible on page → complete registration form → assert redirect to `/:locale/athlete`, athlete appears in coach's roster, invite status is `used`.

- [X] T015 [P] [US3] Write `app/test/invite-page.test.tsx` — **write FIRST, confirm tests FAIL before T017**: mock `~/lib/hooks/useInvites` (`useInvitePreview`); mock `~/lib/context/AuthContext`; mock `react-router` (`useParams`, `useNavigate`); mock `~/lib/supabase` (`supabase.auth.signInWithPassword`); mock `fetch` (global); write tests: valid token → page renders coach name in heading; `status='used'` token → renders "invite already used" error card; `status='expired'` token → renders "invite expired" error card; `status='not_found'` → renders "invite not found" error; authenticated user with valid token → renders logout prompt instead of form; form submit with mismatched honeypot filled → does not call fetch; form submit with valid inputs → calls claim-invite Edge Function URL; run `pnpm test app/test/invite-page.test.tsx` and confirm all tests fail
- [X] T016 [US3] Create `supabase/functions/claim-invite/index.ts`: follow the pattern of `supabase/functions/strava-auth/index.ts` (Deno.serve, CORS_HEADERS, `json()` helper, `createClient` with `SUPABASE_SERVICE_ROLE_KEY`); parse body `{token, name, email, password}`; validate all params present → `400 missing_params`; query `invites` for `token` with `status='pending'` and `expires_at > now()`; if not found/expired/used/revoked → `400 invalid_token` with appropriate `reason`; call `supabase.auth.admin.createUser({email, password, email_confirm: true, user_metadata: {name, role:'athlete'}})`; on duplicate email → `400 email_taken`; insert `coach_athletes(coach_id, athlete_id)` where `coach_id = invite.coach_id`, `athlete_id = newUser.id`; if insert fails → call `supabase.auth.admin.deleteUser(newUser.id)` then return `500 internal_error`; update invite `{status:'used', used_by: newUser.id, used_at: new Date().toISOString()}`; return `200 {success: true}`
- [X] T017 [P] [US3] Register invite route in `app/routes.ts`: add `route('invite/:token', 'routes/invite.$token.tsx')` at the top level (outside the `':locale'` layout, alongside `login`)
- [X] T018 [US3] Create `app/routes/invite.$token.tsx`: named export `meta()` returning `[{title: 'Join Synek'}]`; default export `InviteTokenPage`; read `token` from `useParams()`; call `useInvitePreview(token)` hook; detect locale: `navigator.language.startsWith('en') ? 'en' : 'pl'`; init i18n with detected locale on mount (`i18n.changeLanguage(locale)`); if preview loading → render spinner; if `preview.valid === false` → render error card with icon, title `t('invite.invalidTitle')`, message keyed on `preview.reason`, and `t('invite.askNewInvite')` note; if `preview.valid === true` → render registration form: heading `t('invite.welcomeTitle', {coachName: preview.coachName})`, subtitle, name/email/password inputs, honeypot `<input name="website" tabIndex={-1} className="sr-only" aria-hidden="true" />`, Zod validation matching coach register schema, submit button; on submit: reject if honeypot filled; POST to `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/claim-invite` with body `{token, name, email, password}`; on `email_taken` show generic error; on `invalid_token` show error card; on success call `supabase.auth.signInWithPassword({email, password})` then `navigate(\`/${locale}/athlete\`, {replace:true})`; if user already authenticated → show `t('invite.alreadySignedIn')` with logout button and cancel link; **FR-018**: render `<Trans i18nKey="auth.privacyNoticeAgree">` with inline `<a href={import.meta.env.VITE_PRIVACY_NOTICE_URL ?? '/privacy'} target="_blank" className="underline">` link above the submit button; run `pnpm test app/test/invite-page.test.tsx` — all tests should now PASS

**Checkpoint**: Full invite flow end-to-end functional. US3 independently testable.

---

## Phase 6: User Story 4 — Account Deletion (Priority: P4)

**Goal**: Any authenticated user can permanently delete their account via a two-step confirmation in User Settings > User tab.

**Independent Test**: Log in → Settings > User → scroll to Danger Zone → click "Delete Account" → step 1 dialog appears → click Continue → step 2: type incorrect username → submit button disabled → type correct username → submit → session ends → redirect to `/login` → attempt to log in with old credentials → fails.

- [X] T019 [P] [US4] Write `app/test/delete-account-dialog.test.tsx` — **write FIRST, confirm tests FAIL before T020**: mock `~/lib/context/AuthContext` (`useAuth: () => ({user: {name:'Alice Johnson',...}, logout: vi.fn()})`); mock `react-router` (`useNavigate`); mock `fetch` (global, returns `{ok:true}` by default); mock `~/lib/supabase` (`supabase.auth.getSession` returns `{data:{session:{access_token:'tok'}}}`); write tests: dialog trigger button is rendered; clicking trigger opens step 1 dialog with consequences description; "Continue" advances to step 2; submit button is disabled when input is empty; submit button is disabled when input is wrong (e.g. 'alice'); submit button is enabled when input matches `user.name` exactly ('Alice Johnson'); on submit calls `fetch` to `delete-account` Edge Function URL with `Authorization: Bearer tok` header; on successful fetch calls `logout()` and `navigate('/login', {replace:true})`; on failed fetch (`ok:false`) shows an error message and does NOT call `logout()`; run `pnpm test app/test/delete-account-dialog.test.tsx` and confirm all tests fail
- [X] T020 [P] [US4] Create `app/components/settings/DeleteAccountDialog.tsx`: named export `DeleteAccountDialog`; props: `className?: string`; uses `useAuth()` for `user.name` and `logout`; uses `useNavigate()`; internal state: `open: boolean`, `step: 1 | 2`, `confirmInput: string`, `isPending: boolean`, `error: string | null`; renders a trigger `<Button variant="destructive">` labelled `t('settings.deleteAccount.cta')`; wraps content in shadcn `<Dialog open={open} onOpenChange={...}>`; **Step 1**: description of consequences, `<DialogFooter>` with Cancel + "Continue to confirm" buttons → sets `step(2)`; **Step 2**: `<Label>` `t('settings.deleteAccount.typeUsername')`, `<Input>` placeholder=`user?.name`, value=`confirmInput`; `<Button variant="destructive" disabled={confirmInput !== user?.name || isPending}>`; on submit: get session via `supabase.auth.getSession()`, POST to `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account` with `Authorization: Bearer ${session.access_token}`; on success: `logout()`, `navigate('/login', {replace:true})`; on error: set `error` message, `setIsPending(false)`; reset all state when `open` becomes false; run `pnpm test app/test/delete-account-dialog.test.tsx` — all tests should now PASS
- [X] T021 [US4] Create `supabase/functions/delete-account/index.ts`: follow `strava-auth` pattern; extract JWT from `Authorization: Bearer <token>` header → `400 unauthorized` if missing; call `supabase.auth.getUser(jwt)` to verify and extract `userId` → `401 unauthorized` if invalid; create admin client with `SUPABASE_SERVICE_ROLE_KEY`; **step 1 — FR-026**: `UPDATE invites SET status='revoked' WHERE coach_id = userId AND status = 'pending'` (immediately invalidates all pending invites before any further changes); **step 2 — FR-022**: `UPDATE invites SET coach_id = NULL, used_by = NULL WHERE coach_id = userId OR used_by = userId` (anonymise FKs for audit trail); **step 3**: anonymise profile: `UPDATE profiles SET name = 'Deleted User', email = 'deleted_' || gen_random_uuid() || '@synek.invalid' WHERE id = userId`; **step 4**: call `adminClient.auth.admin.deleteUser(userId)` (cascades to profiles via FK); return `200 {success: true}`
- [X] T022 [US4] Extend `app/components/settings/UserTab.tsx`: import `DeleteAccountDialog` from `~/components/settings/DeleteAccountDialog`; at the bottom of the returned JSX add a visually separated danger zone: `<Separator className="my-8" />`, `<div>` with heading `t('settings.deleteAccount.dangerZone')` styled `text-destructive font-medium`, short description paragraph, and `<DeleteAccountDialog />`

**Checkpoint**: Account deletion fully functional for both roles. US4 independently testable.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T023 [P] Run `pnpm typecheck` from repo root; resolve any TypeScript errors introduced by new files (type imports, missing props, return type mismatches)
- [X] T024 [P] Cross-check all i18n keys added in T009 and T010 are present in both `en/` and `pl/` files — verify no key exists in one language file but not the other; run `/i18n-check` if available
- [X] T025 [P] Run full test suite `pnpm test` and confirm all three new test files pass with no regressions in existing tests; verify coverage threshold still met (`pnpm test --coverage`)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Requires Phase 1 complete (types needed by mock data and query files)
- **Phase 3–6 (User Stories)**: All require Phase 2 complete; can then proceed in priority order or in parallel
- **Phase 7 (Polish)**: Requires all desired user story phases complete

### User Story Dependencies

| Story | Depends On | Notes |
|---|---|---|
| US1 — Coach Registration | Phase 2 | Standalone; T011 adds mockRegisterCoach before T012 |
| US2 — Invite Generation | Phase 2 | Standalone; uses hooks from foundational layer |
| US3 — Athlete Registration | Phase 2 | Edge Function + route independent; invite page depends on T016+T017 |
| US4 — Account Deletion | Phase 2 | Standalone; dialog test (T019) written before dialog impl (T020) |

### Within Each Phase

- All tasks marked `[P]` within a phase can run simultaneously
- T006 (unit test) written before T007/T008 (implementation) — tests must FAIL first
- T007 depends on T003 (mock data) and T005 (query keys)
- T008 depends on T005 and T007 (hooks depend on query file)
- T014 depends on T013 (settings route imports AthletesTab)
- T015 (invite page test) written before T018 (invite page impl) — tests must FAIL first
- T018 depends on T016 and T017 (invite page uses Edge Function and registered route)
- T019 (dialog test) written before T020 (dialog impl) — tests must FAIL first
- T022 depends on T020 (UserTab imports DeleteAccountDialog)

---

## Parallel Execution Examples

### Phase 2 Parallel Opportunity

```
Simultaneously:
  T004 — mock-data/index.ts exports
  T005 — queries/keys.ts invite keys
  T006 — app/test/invites.test.ts (TDD: write + confirm FAIL)
  T009 — common i18n keys (en + pl)
  T010 — coach i18n keys (en + pl)
After T003 complete:
  T007 — queries/invites.ts (needs mock functions)
After T007 complete:
  T008 — hooks/useInvites.ts (needs query file)
After T007 + T008 complete:
  Run pnpm test invites.test.ts → all PASS ✓
```

### Phase 5+6 Parallel Opportunity

```
After Phase 4 complete:
  Simultaneously:
    T015 — app/test/invite-page.test.tsx (TDD: write + FAIL)
    T016 — claim-invite Edge Function
    T017 — routes.ts update
    T019 — app/test/delete-account-dialog.test.tsx (TDD: write + FAIL)
    T020 — DeleteAccountDialog component
    T021 — delete-account Edge Function
After T015+T016+T017:
  T018 — invite.$token.tsx → run tests → PASS ✓
After T019+T020:
  T022 — UserTab danger zone → run tests → PASS ✓
```

---

## Implementation Strategy

### MVP (User Story 1 Only)

1. Phase 1: T001, T002
2. Phase 2: T003–T010 (including unit tests T006)
3. Phase 3: T011, T012
4. Phase 7: T023–T025
5. **Validate**: Coach can register; login page toggle works; mock + real Supabase mode both function; `pnpm test` passes

### Full Delivery (All Stories)

1. Phase 1 → Phase 2 → Phase 3 (US1) → Phase 4 (US2) → Phase 5 (US3) → Phase 6 (US4) → Phase 7
2. Each phase is a shippable increment; validate independently before advancing
3. Each test file written before its implementation phase — confirm FAIL then PASS

### Parallel Team Strategy (2 developers)

After Phase 2:
- Dev A: US1 (T011–T012) → US2 (T013–T014)
- Dev B: US3 (T015–T018) → US4 (T019–T022)
- Merge after both complete → Phase 7 together

---

## Notes

- `[P]` tasks = different files, no shared state, safe to parallelise
- **TDD order**: T006 before T007/T008 · T015 before T018 · T019 before T020 — always confirm FAIL before implementing
- Each Edge Function follows the `strava-auth` pattern exactly (Deno, CORS, `json()` helper, service role client)
- Mock mode: all new flows must work without Supabase credentials — `isMockMode` branches required in all query functions
- `pnpm typecheck` MUST pass before merge (Constitution gate II)
- All user-visible strings MUST exist in both `en/` and `pl/` before merge (Constitution gate III)
- `select('*')` is forbidden — use explicit column lists in all Supabase queries (Constitution IV)
