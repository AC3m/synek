# Synek Agent Notes

## Start Here

Read `docs/00-start-here.md` for the full documentation map. Below is a fast-load summary for agents.

## Source-of-Truth Files

Before making changes, identify which canonical doc governs the area you're touching:

| Area | Canonical doc |
|---|---|
| Project principles, tech stack, quality gates | `docs/constitution.md` |
| Strava UX, consent, branding, retention | `docs/architecture/strava-submission-form.md` |
| Strava Edge Function auth model | `docs/architecture/strava-function-security.md` |
| System architecture and data flow | `docs/architecture/overview.md` |
| Code patterns (how to add things) | `docs/how-to/` |
| Naming, typing, styling rules | `docs/reference/conventions.md` |
| Forbidden patterns | `docs/reference/anti-patterns.md` |
| Why architecture decisions were made | `docs/architecture/decisions/` |

## General Rules

- Keep changes aligned with the canonical doc for the area you're touching. Prefer updating the canonical doc first when behavior or policy changes.
- `pnpm typecheck` must pass before any feature is considered done.
- Every mutation needs `onMutate` / `onError` / `onSettled`.
- Add i18n keys to both `en/` and `pl/` in the same change.
- No `supabase.from()` outside `lib/queries/`. No `useEffect` for data fetching.

## Strava

Before changing any Strava-related code, read the three canonical docs above.

Preserve the following unless the canonical docs are updated in the same change:

**Branding**
- Use official Strava assets only (archive at `app/assets/strava/archive`)
- Settings integration CTA: official connect button asset
- Synced workout attribution: official horizontal "Powered by Strava" logo
- "View on Strava" label in English, styled with Strava orange

**Privacy & Consent**
- Synced Strava data is private by default
- `strava_activities.is_confirmed` is the consent source of truth
- Coaches must not see raw Strava metrics before explicit athlete confirmation

**Retention & Platform Restrictions**
- Revocation webhook must delete Strava activities and tokens for revoked users
- Do not use Strava API data for AI/ML/LLM training, fine-tuning, or evaluation
