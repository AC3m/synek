# Synek

Athlete training planning platform with coach and athlete roles. Coaches create ISO-week training plans; athletes view and complete sessions.

## Tech Stack

| Layer | Technology |
|---|---|
| UI | React 19 + React Router 7 (SPA, no SSR) |
| Language | TypeScript 5 (strict) |
| Styling | Tailwind CSS 4 + shadcn/ui (New York) |
| Server state | TanStack Query 5 |
| Backend | Supabase (postgres + auth) |
| i18n | i18next — EN / PL |
| Validation | Zod 4 |
| Dates | date-fns 4 |
| Package manager | pnpm |

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm

### Install

```bash
pnpm install
```

### Environment

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
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

## Project Structure

```
app/
├── components/
│   ├── ui/           # shadcn components (do not edit manually)
│   ├── calendar/     # week planning calendar widgets
│   ├── training/     # session form + sport-specific field components
│   └── layout/       # Header, LanguageToggle, RoleSwitcher
├── lib/
│   ├── queries/      # Supabase CRUD + mock implementations
│   ├── hooks/        # React Query hooks
│   └── utils/        # date, week-view, training-types helpers
├── types/            # Domain types (training.ts, strava.ts)
├── i18n/             # config + resources/en/ + resources/pl/
└── routes/
    ├── home.tsx
    ├── coach/        # week.$weekId.tsx
    └── athlete/      # week.$weekId.tsx

supabase/
└── migrations/       # SQL migrations (week_plans, training_sessions, strava tables)
```

## Roles

| Role | Access |
|---|---|
| Coach | Create and edit ISO-week training plans; add/remove sessions per day |
| Athlete | View the plan for the current week; mark sessions complete |

Use the role switcher in the header to toggle between roles during development.

## Supported Training Types

`run` · `cycling` · `strength` · `yoga` · `mobility` · `swimming` · `rest_day`

Each type has sport-specific fields and a colour token defined in
`app/lib/utils/training-types.ts`.

## Adding shadcn Components

```bash
pnpm dlx shadcn@latest add <component-name>
```

Never edit files in `app/components/ui/` manually.

## Database

Migrations live in `supabase/migrations/`. Apply them via the Supabase CLI:

```bash
supabase db push
```

Tables: `week_plans`, `training_sessions`, `strava_activities`, `strava_tokens`
