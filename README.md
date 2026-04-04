# Synek

Athlete training planning platform with coach and athlete roles. Coaches create ISO-week training plans; athletes view and complete sessions. Built as a SPA (no SSR).

## Tech Stack

| Layer           | Technology                              |
| --------------- | --------------------------------------- |
| UI              | React 19 + React Router 7 (SPA, no SSR) |
| Language        | TypeScript 5 (strict)                   |
| Styling         | Tailwind CSS 4 + shadcn/ui (New York)   |
| Server state    | TanStack Query 5                        |
| Backend         | Supabase (postgres + auth)              |
| i18n            | i18next — EN / PL                       |
| Validation      | Zod 4                                   |
| Dates           | date-fns 4                              |
| Package manager | pnpm                                    |

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm
- Supabase CLI (for migrations/functions deploy)

### Install

```bash
pnpm install
pnpm supabase:install
```

`pnpm install` also runs the `prepare` script, which enables the Husky pre-commit hook for this clone. The hook runs `lint-staged` and formats staged files with Prettier before each commit.

### Environment

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
# VITE_MOCK_MODE=true
VITE_STRAVA_CLIENT_ID=<client-id>
SUPABASE_ACCESS_TOKEN=<access-token>
STRAVA_WEBHOOK_VERIFY_TOKEN=<verify-token>
SUPABASE_INTERNAL_FUNCTIONS_TOKEN=<internal-function-token>
```

> **Mock mode**: If credentials are missing or placeholder, the app automatically runs against
> in-memory mock data — no Supabase project required for local development.

### Dev server

```bash
pnpm dev        # http://localhost:5173
```

### Build

```bash
pnpm build      # production bundle → ./build/
pnpm start      # serve the production build
```

### Type check

```bash
pnpm typecheck  # react-router typegen + tsc
```

### Tests

```bash
pnpm test           # watch mode
pnpm test:run       # single run
pnpm test:coverage  # coverage report
```

## Project Structure

```
app/
├── components/
│   ├── ui/           # shadcn components (do not edit manually)
│   ├── calendar/     # week planning calendar widgets
│   ├── training/     # session form, session detail modal, sport-specific fields
│   ├── landing/      # landing page sections
│   └── layout/       # Header, LanguageToggle, RoleSwitcher
├── lib/
│   ├── queries/      # Supabase CRUD + mock implementations
│   ├── hooks/        # React Query hooks
│   ├── mock-data/    # in-memory mock data (sessions, weeks, profile, strava)
│   └── utils/        # date, week-view, training-types, lap-classification helpers
├── types/            # Domain types (training.ts, strava.ts)
├── i18n/             # config + resources/en/ + resources/pl/
└── routes/
    ├── landing.tsx
    ├── login.tsx / register.tsx / invite.$token.tsx
    ├── settings.tsx
    ├── coach/        # week.$weekId.tsx, strength.tsx, strength.$variantId.tsx
    └── athlete/      # week.$weekId.tsx, strength.tsx, strength.$variantId.tsx

supabase/
├── functions/        # Deno Edge Functions (strava-auth, strava-webhook, etc.)
└── migrations/       # SQL migrations — source of truth for schema
```

## Roles

| Role    | Access                                                                                                       |
| ------- | ------------------------------------------------------------------------------------------------------------ |
| Coach   | Create and edit ISO-week training plans; manage sessions per day; build strength variants                    |
| Athlete | View assigned weekly plans; mark sessions complete; log performance; self-plan if `can_self_plan` is enabled |

Use the role switcher in the header to toggle between roles during development.

## Supported Training Types

`run` · `cycling` · `strength` · `yoga` · `mobility` · `swimming` · `walk` · `hike` · `rest_day`

Each type has sport-specific fields and a colour token defined in
`app/lib/utils/training-types.ts`.

## Database

Migrations live in `supabase/migrations/`. Apply them via the Supabase CLI:

```bash
supabase db push
```

Core tables: `week_plans`, `training_sessions`, `invites`, `strength_variants`,
`strength_variant_exercises`, `strength_session_exercises`, `strava_activities`,
`strava_tokens`, `strava_laps`. See `supabase/migrations/` for the full schema.

## Supabase Deploy

Required environment variables:

- `SUPABASE_PROJECT_REF`
- `SUPABASE_DB_PASSWORD`
- `STRAVA_CLIENT_ID`
- `STRAVA_CLIENT_SECRET`
- `STRAVA_WEBHOOK_VERIFY_TOKEN`
- `SUPABASE_INTERNAL_FUNCTIONS_TOKEN`

Deploy:

```bash
pnpm supabase:deploy:strava
```

After deploy, run this one-time SQL in Supabase SQL Editor for cron runtime settings:

```sql
ALTER DATABASE postgres SET app.settings.supabase_project_ref = '<your-project-ref>';
ALTER DATABASE postgres SET app.settings.internal_functions_token = '<your-internal-functions-token>';
SELECT pg_reload_conf();
```
