# Quickstart: 008-landing-page

## Prerequisites

```bash
git checkout 008-landing-page
pnpm install        # no new dependencies added in this feature
pnpm dev            # http://localhost:5173
```

The app runs in mock mode when Supabase credentials are absent (`.env` not set up). All landing page flows (login, registration, contact form) work in mock mode.

---

## Key Entry Points

| What | Where |
|------|-------|
| Landing page route | `app/routes/landing.tsx` |
| Landing section components | `app/components/landing/` |
| Feedback query | `app/lib/queries/feedback.ts` |
| Feedback hook | `app/lib/hooks/useFeedback.ts` |
| Feedback mock data | `app/lib/mock-data/feedback.ts` |
| Registration edge function | `supabase/functions/register-user/index.ts` |
| i18n copy | `app/i18n/resources/{en,pl}/landing.json` |
| DB migration | `supabase/migrations/012_feedback_submissions.sql` |

---

## Mock Mode Behaviour

| Action | Mock behaviour |
|--------|---------------|
| Login (existing user) | Uses `mockLogin()` — coach@synek.app / alice@synek.app / bob@synek.app |
| Register as Coach | Creates in-memory user via `mockRegisterUser(..., 'coach')` |
| Register as Athlete | Creates in-memory user via `mockRegisterUser(..., 'athlete')` |
| Contact form submit | Inserts into in-memory `MOCK_FEEDBACK` store |

---

## Running Tests

```bash
pnpm test                    # run all tests
pnpm test app/test/unit/     # unit tests only
pnpm test app/test/integration/  # integration tests only
pnpm typecheck               # type check (must pass before PR)
```

---

## Adding / Editing Landing Copy

All user-visible strings live in:
- `app/i18n/resources/en/landing.json`
- `app/i18n/resources/pl/landing.json`

Use `useTranslation('landing')` in landing components. Always update both files simultaneously.

---

## Testing the Registration Flow Manually

1. Navigate to `http://localhost:5173`
2. Click **Join Beta** in the nav — page scrolls to the Join Beta section
3. Select role (Coach or Athlete)
4. Fill in name, email, password
5. Submit — app redirects to the appropriate dashboard
6. Verify in the browser that the user is now logged in (header shows name/avatar)

To test athlete registration in mock mode, select "Athlete" in the role picker. The new account is created in memory and you can log out and back in using the same credentials within the same browser session.

---

## Deploying the Edge Function

```bash
supabase functions deploy register-user
```

The `register-user` function accepts both `coach` and `athlete` roles. The existing `register-coach` function remains deployed and unchanged (still used by `login.tsx`).
