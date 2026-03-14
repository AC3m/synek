# Synek Agent Notes

## General
- Keep changes aligned with the existing architecture docs. Prefer updating the canonical doc first when behavior or policy changes.

## Strava
- Treat `docs/architecture/strava-submission-form.md` as the product and compliance baseline for Strava UX, consent, retention, and branding requirements.
- Treat `docs/architecture/strava-function-security.md` as the single source of truth for Strava Edge Function auth behavior.
- Treat `docs/architecture/overview.md` as the architectural summary for Strava data flow, masking, and confirmation behavior.
- Before changing Strava-related code, read the three docs above and keep implementation aligned with them. Do not silently deviate from documented Strava requirements.
- Preserve the current branding rules unless the docs are updated in the same change:
  - Use official Strava assets only.
  - Keep the settings integration CTA on the official connect button asset.
  - Keep synced workout attribution on the official horizontal "Powered by Strava" logo.
  - Keep the "View on Strava" label in English and styled with Strava orange.
- Preserve the current privacy and consent rules unless the docs are updated in the same change:
  - Synced Strava data must remain private by default.
  - `strava_activities.is_confirmed` is the consent source of truth.
  - Coaches must not receive raw Strava metrics before explicit athlete confirmation.
- Preserve the current retention and platform restrictions unless the docs are updated in the same change:
  - Revocation webhook handling must delete Strava activities and tokens for revoked users.
  - Do not use Strava API data for AI/ML/LLM training, fine-tuning, or evaluation.
- The full official Strava asset pack is stored in `app/assets/strava/archive`. Keep unused assets there instead of `public/` so they stay in the repo without shipping in the static build.
