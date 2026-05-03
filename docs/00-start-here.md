# Synek — Start Here

Synek is a coaching and training management platform. Coaches create ISO-week training plans; athletes view and complete sessions. Built as a React SPA (no SSR) backed by Supabase.

## Read This First (in order)

1. `docs/constitution.md` — non-negotiable principles, locked tech stack, quality gates, governance
2. `docs/architecture/overview.md` — system architecture, data model, Strava integration data flow
3. Task-specific docs from the table below

## I Want To…

| Goal                                             | Go to                                                    |
| ------------------------------------------------ | -------------------------------------------------------- |
| Add a new component                              | `docs/how-to/add-component.md`                           |
| Add a new route / page                           | `docs/how-to/add-route.md`                               |
| Add a new Supabase query or mutation             | `docs/how-to/add-query.md`                               |
| Add a new sport / training type                  | `docs/how-to/add-training-type.md`                       |
| Add translated strings                           | `docs/how-to/add-translation.md`                         |
| Check naming, typing, or styling rules           | `docs/reference/conventions.md`                          |
| Know what patterns are forbidden                 | `docs/reference/anti-patterns.md`                        |
| Understand _why_ the architecture looks this way | `docs/architecture/decisions/`                           |
| Work with Strava (compliance, branding, consent) | `docs/architecture/strava-submission-form.md`            |
| Understand Strava Edge Function auth             | `docs/architecture/strava-function-security.md`          |
| Understand auth flows (login, register, reset)   | `docs/architecture/overview.md` — Authentication section |
| Add a new auth callback flow                     | `docs/how-to/auth-callback-pattern.md`                   |
| Plan or implement a new feature                  | Run `/speckit.specify`, then follow `specs/<feature>/`   |
| Amend project principles or tech stack           | `docs/constitution.md` — Governance section              |
| Deploy the app                                   | `docs/deployment.md`                                     |

## Key Source-of-Truth Files

| Topic                                      | Canonical file                                  |
| ------------------------------------------ | ----------------------------------------------- |
| Project principles & quality gates         | `docs/constitution.md`                          |
| Strava UX, consent & branding requirements | `docs/architecture/strava-submission-form.md`   |
| Strava Edge Function auth model            | `docs/architecture/strava-function-security.md` |
| Sport color tokens                         | `app/lib/utils/training-types.md`               |
| Domain type definitions                    | `app/types/training.ts`                         |
| Query key factory                          | `app/lib/queries/keys.ts`                       |
| Auth validation schemas                    | `app/lib/schemas/auth.ts`                       |
| Auth callback functions                    | `app/lib/queries/auth-callbacks.ts`             |
| Registration Edge Function                 | `supabase/functions/register-user/index.ts`     |
| Email templates                            | `supabase/templates/`                           |

## What Lives Where

```
docs/
  00-start-here.md          ← you are here
  constitution.md           ← highest-authority governance doc
  architecture/
    overview.md             ← system diagram, data model, Strava flow
    strava-submission-form.md
    strava-function-security.md
    decisions/              ← Architecture Decision Records (ADRs)
  how-to/                   ← step-by-step guides for common tasks
  reference/                ← lookup tables: conventions, anti-patterns
  deployment.md
supabase/
  functions/register-user/  ← registration Edge Function (Turnstile + rate limiting)
  templates/                ← custom HTML email templates (confirmation, reset)
specs/
  <NNN-feature-name>/       ← spec.md, plan.md, tasks.md per feature
.claude/commands/           ← SpecKit slash commands
.specify/
  templates/                ← SpecKit document templates
  scripts/                  ← SpecKit helper scripts
```
