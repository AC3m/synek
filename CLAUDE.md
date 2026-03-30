# Synek — Claude Code Instructions

## What This App Is
An athlete training planning platform. Coaches create ISO-week training plans; athletes view and complete sessions. Built SPA (no SSR).

**Start with `docs/00-start-here.md`** for the full documentation map.

## Commands

```bash
pnpm dev          # dev server (localhost:5173)
pnpm build        # production build
pnpm typecheck    # react-router typegen + tsc (MUST pass before merge)
pnpm dlx shadcn@latest add <component>  # add shadcn component
```

## Architecture

```
routes/ → hooks/ → queries/ → Supabase (or mock)
            ↕
        React Query cache (single source of truth)
```

Key directories:
- `app/routes/` — page components only; no DB access
- `app/lib/hooks/` — React Query hooks; the only place components touch server state
- `app/lib/queries/` — Supabase CRUD + `keys.ts`; real and mock implementations side-by-side
- `app/lib/utils/` — pure helpers: `date.ts`, `training-types.ts`, `week-view.ts`
- `app/components/ui/` — shadcn-managed primitives; never edit manually
- `app/components/calendar/` — week planning widgets
- `app/components/training/` — session form + sport-specific `type-fields/`
- `app/types/` — domain models in `training.ts`; Strava types in `strava.ts`
- `app/i18n/resources/en/` and `app/i18n/resources/pl/` — translation namespaces
- `supabase/functions/` — Deno Edge Functions (one directory per function)

## Documentation Map

| I want to… | Read |
|---|---|
| Understand principles & quality gates | `docs/constitution.md` |
| Understand the system architecture | `docs/architecture/overview.md` |
| Add a component / route / query / training type / translation | `docs/how-to/` |
| Check naming, type, or styling rules | `docs/reference/conventions.md` |
| Know what is forbidden | `docs/reference/anti-patterns.md` |
| Understand why something is built a certain way | `docs/architecture/decisions/` |
| Work with Strava | `docs/architecture/strava-submission-form.md`, `docs/architecture/strava-function-security.md` |

## Critical Rules (Always Apply)

These are the rules most likely to cause bugs or failed type checks if missed:

- No `useEffect` for data fetching — React Query hooks only
- No `supabase.from()` in components or hooks — only `lib/queries/`
- No default exports for components — named exports only (routes are the exception)
- No hardcoded sport colors — always reference `app/lib/utils/training-types.ts`
- `pnpm typecheck` must pass before any feature is considered done
- Every mutation needs `onMutate` / `onError` / `onSettled`
- Always add i18n keys to both `en/` and `pl/` simultaneously

## Active Technologies

TypeScript 5 (strict), React 19, React Router 7 (SPA), TanStack Query 5, shadcn/ui (New York), Supabase JS 2, i18next, date-fns 4, Zod 4
