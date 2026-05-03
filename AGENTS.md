# Synek Agent Notes

## Start Here

Read `docs/00-start-here.md` for the full documentation map. Below is the fast-load summary and working checklist for agents.

## Source-of-Truth Files

Before making changes, identify which canonical doc governs the area you're touching:

| Area                                          | Canonical doc                                   |
| --------------------------------------------- | ----------------------------------------------- |
| Project principles, tech stack, quality gates | `docs/constitution.md`                          |
| Strava UX, consent, branding, retention       | `docs/architecture/strava-submission-form.md`   |
| Strava Edge Function auth model               | `docs/architecture/strava-function-security.md` |
| System architecture and data flow             | `docs/architecture/overview.md`                 |
| Code patterns (how to add things)             | `docs/how-to/`                                  |
| Naming, typing, styling rules                 | `docs/reference/conventions.md`                 |
| Forbidden patterns                            | `docs/reference/anti-patterns.md`               |
| Why architecture decisions were made          | `docs/architecture/decisions/`                  |

## General Rules

- Keep changes aligned with the canonical doc for the area you're touching. Prefer updating the canonical doc first when behavior or policy changes.
- Run `pnpm verify:app` before app-only handoff; run `pnpm verify` before merge or when Edge Functions may be affected.
- Every mutation needs `onMutate` / `onError` / `onSettled`.
- Add i18n keys to both `en/` and `pl/` in the same change.
- Use `pnpm` only. Do not use `npm` or `yarn`.
- Keep secrets in `.env.local`; do not commit `.env`, `.env.local`, or Supabase secrets.

## Verification

Run the smallest relevant subset while developing, then the appropriate verification command before handoff:

```bash
pnpm typecheck                   # React Router typegen + TypeScript
pnpm test:run                    # Vitest once
pnpm verify:app                  # format, typecheck, tests
pnpm supabase:functions:check    # Deno check for Edge Functions
pnpm verify                      # verify:app + Edge Function checks
```

## Handoff Format

End with:

1. Short diff summary with file paths.
2. Verification run, or proposed verification steps if not run.
3. Any risks or follow-up decisions needed from the human reviewer.
