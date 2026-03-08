# Synek — Claude Code Instructions

## What This App Is
An **athlete training planning platform** with coach/athlete roles. Coaches create ISO-week training plans; athletes view and complete sessions. Built SPA (no SSR).

## Tech Stack (versions matter)
- **React 19** + **React Router 7** (file-based routing, SPA mode — `ssr: false`)
- **TypeScript 5** strict mode — path alias `~/` → `./app/`
- **Tailwind CSS 4** via Vite plugin (not PostCSS)
- **TanStack Query 5** — all server state via hooks, no `useEffect` fetching
- **Supabase** (`@supabase/supabase-js 2`) — mock mode auto-activates when credentials are placeholders
- **shadcn/ui** (New York style) + **Radix UI** — only add components via `pnpm dlx shadcn@latest add`
- **i18next** + **react-i18next** — EN/PL, namespaces: `common`, `coach`, `athlete`, `training`
- **Zod 4** for schema validation
- **pnpm** (always, never npm or yarn)
- **date-fns 4** for all date operations

## Commands
```bash
pnpm dev          # dev server (localhost:5173)
pnpm build        # production build
pnpm typecheck    # react-router typegen + tsc
pnpm dlx shadcn@latest add <component>  # add shadcn component
```

---

## Architecture — Read Before Touching Code

### Directory Map
```
app/
├── components/
│   ├── ui/          # shadcn components — NEVER edit manually
│   ├── calendar/    # week planning calendar widgets
│   ├── training/    # session form + sport-specific type-fields/
│   └── layout/      # Header, LanguageToggle, RoleSwitcher
├── lib/
│   ├── queries/     # Supabase CRUD (weeks.ts, sessions.ts) + keys.ts
│   ├── hooks/       # React Query hooks (useWeekPlan.ts, useSessions.ts)
│   └── utils/       # date.ts | week-view.ts | training-types.ts
├── types/           # training.ts (domain models) | strava.ts
├── i18n/            # config.ts + resources/en/ + resources/pl/
└── routes/          # coach/ + athlete/ page components
```

### Data Flow
```
routes/ → hooks/ → queries/ → Supabase (or mock)
            ↕
        React Query cache (single source of truth)
```

---

## Patterns — Follow These Exactly

### 1. New Component
```tsx
// app/components/calendar/MyWidget.tsx
import { useTranslation } from 'react-i18next'
import { cn } from '~/lib/utils'

interface MyWidgetProps {
  onAction: (id: string) => void
  className?: string
}

export function MyWidget({ onAction, className }: MyWidgetProps) {
  const { t } = useTranslation('common')
  return <div className={cn('...', className)}>{t('key')}</div>
}
```
- Named exports only (no default exports for components)
- Props interface above the component, in the same file
- Always accept `className?: string` prop for composability
- Handler props named `on[Action]`

### 2. New React Query Hook
```typescript
// app/lib/hooks/useMyData.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { myKeys } from '~/lib/queries/keys'
import { fetchMyData, updateMyData } from '~/lib/queries/myData'

export function useMyData(id: string) {
  return useQuery({
    queryKey: myKeys.byId(id),
    queryFn: () => fetchMyData(id),
    enabled: !!id,
  })
}

export function useUpdateMyData() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: updateMyData,
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: myKeys.byId(input.id) })
      const prev = qc.getQueryData(myKeys.byId(input.id))
      qc.setQueryData(myKeys.byId(input.id), (old) => ({ ...old, ...input }))
      return { prev }
    },
    onError: (_err, input, ctx) => {
      if (ctx?.prev) qc.setQueryData(myKeys.byId(input.id), ctx.prev)
    },
    onSettled: (_data, _err, input) => {
      qc.invalidateQueries({ queryKey: myKeys.byId(input.id) })
    },
  })
}
```
- Always implement optimistic updates on mutations
- Always cancel in-flight queries in `onMutate`
- Always rollback in `onError` using saved context
- Always invalidate in `onSettled` (not `onSuccess`)

### 3. New Query Key
```typescript
// app/lib/queries/keys.ts — add to existing factory
export const myKeys = {
  all: ['myEntity'] as const,
  byId: (id: string) => [...myKeys.all, id] as const,
}
```

### 4. New Supabase Query
```typescript
// app/lib/queries/myData.ts
import { supabase, isMockMode } from '~/lib/supabase'
import type { MyType } from '~/types/training'

function toMyType(row: Record<string, unknown>): MyType {
  return {
    id: row.id as string,
    myField: row.my_field as string,  // snake_case → camelCase
  }
}

export async function fetchMyData(id: string): Promise<MyType | null> {
  if (isMockMode) return mockFetchMyData(id)
  const { data, error } = await supabase
    .from('my_table')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data ? toMyType(data) : null
}
```
- Every query file MUST have both real and mock implementations
- Use `toMyType()` row mappers for DB → TS transformation (snake → camel)
- Export mock functions so they can be unit-tested independently

### 5. New Training Type (sport-specific fields)
1. Add variant to `TypeSpecificData` in `app/types/training.ts`
2. Add color config in `app/lib/utils/training-types.ts`
3. Create `app/components/training/type-fields/MyTypeFields.tsx`
4. Add translation keys to `app/i18n/resources/en/training.json` and `pl/training.json`
5. Render the field component in `SessionForm.tsx` via switch/conditional

### 6. New Route
```typescript
// app/routes/coach/my-page.tsx  (or athlete/)
import { useTranslation } from 'react-i18next'

export default function MyPage() {
  const { t } = useTranslation('coach')
  return <div>{t('my-page.title')}</div>
}
```
Register in `app/routes.ts` under the correct layout.
Run `pnpm typecheck` after adding routes to generate types.

### 7. Adding Translations
Always add to BOTH language files simultaneously:
- `app/i18n/resources/en/<namespace>.json`
- `app/i18n/resources/pl/<namespace>.json`

Use namespace prefix in `useTranslation`: `useTranslation('training')` → `t('key')`

---

## Type Conventions

### Domain Types (`app/types/training.ts`)
- **PascalCase** for all types: `WeekPlan`, `TrainingSession`
- **Discriminated unions** keyed on `type` field:
  ```typescript
  type TypeSpecificData = RunData | CyclingData | ...
  // Each has: { type: 'run' | 'cycling' | ... , ...fields }
  ```
- **Input types** suffixed with `Input`: `CreateSessionInput`, `UpdateSessionInput`
- **JSONB fields** typed as `Record<string, unknown>` at DB boundary, narrowed via mappers

### TypeScript Rules
- Prefer `type` over `interface` for unions and computed types
- Use `interface` for component props and plain object shapes
- Never use `any` — use `unknown` and narrow
- Use `as const` on query keys
- Import types with `import type { }` syntax

---

## Styling Rules

### Tailwind
- Use `cn()` from `~/lib/utils` for all conditional class merging
- Follow sport color system (do NOT invent new colors):
  ```
  run       → blue-700 / bg-blue-100
  cycling   → green-700 / bg-green-100
  strength  → orange-700 / bg-orange-100
  yoga      → purple-700 / bg-purple-100
  mobility  → teal-700 / bg-teal-100
  swimming  → cyan-700 / bg-cyan-100
  rest_day  → gray-500 / bg-gray-100
  ```
- Look up existing color config in `app/lib/utils/training-types.ts` before adding colors

### shadcn/ui
- Import from `~/components/ui/...`
- Never modify files in `app/components/ui/` — they are shadcn-managed
- Add new shadcn components only via `pnpm dlx shadcn@latest add <name>`

---

## Mock Mode
Mock mode activates automatically when Supabase credentials are missing/placeholder.
- Mock data lives in `app/lib/mock-data.ts`
- Both real and mock implementations live in the same query file
- When adding new DB features: implement mock version first, then real Supabase version

---

## Anti-Patterns (Never Do These)

- **No `useEffect` for data fetching** — use React Query hooks in `lib/hooks/`
- **No default exports for components** — named exports only
- **No inline SQL/queries in route files** — all DB access goes through `lib/queries/`
- **No direct `supabase.from()` calls in components or hooks** — only in `lib/queries/`
- **No hardcoded English strings in JSX** — always use `t('key')` from i18next
- **No mutations without optimistic updates** — implement `onMutate`/`onError`/`onSettled`
- **No new shadcn components edited manually** — always use CLI
- **No CSS modules or styled-components** — Tailwind only
- **No date manipulation outside `date-fns`** — never use `new Date()` arithmetic directly
- **No `npm` or `yarn`** — always `pnpm`

---

## File & Naming Conventions

| Thing | Convention | Example |
|-------|-----------|---------|
| Components | PascalCase | `SessionCard.tsx` |
| UI primitives (shadcn) | lowercase | `button.tsx` |
| Hooks | camelCase, `use` prefix | `useWeekPlan.ts` |
| Query files | kebab-case | `sessions.ts`, `week-view.ts` |
| Utility files | kebab-case | `training-types.ts` |
| Types | PascalCase | `WeekPlan`, `RunData` |
| DB columns | snake_case (mapped to camelCase in TS) | `week_start` → `weekStart` |
| Route files | kebab-case, param with `$` | `week.$weekId.tsx` |
| i18n keys | kebab-case | `session-form.title` |
| Handler props | `on` prefix | `onAddSession`, `onClose` |
| Boolean state | `is`/`has` prefix | `isCompleted`, `hasError` |

---

## Date Handling

Always use utilities from `app/lib/utils/date.ts`:
```typescript
getCurrentWeekId()        // → "2026-W10"
weekIdToMonday(weekId)   // → "2026-03-02"
getWeekDateRange(monday) // → "Mar 2 – Mar 8, 2026"
```
- Week IDs are ISO 8601 format: `YYYY-WWW`
- `weekStart` fields are always Monday's date in `YYYY-MM-DD`
- Use `date-fns` functions for all other date operations

---

## Supabase Schema Notes

Tables: `week_plans`, `training_sessions`, `strava_activities`, `strava_tokens`

Key constraints:
- `week_plans.week_start` is UNIQUE
- `training_sessions.sort_order` controls display order within a day
- `type_specific_data` is JSONB — validate with Zod before inserting
- Strava tables are provisioned but integration not yet implemented

When writing new migrations, place in `supabase/migrations/` with prefix `00N_`.

## Active Technologies
- TypeScript 5 (strict) + React 19, React Router 7 (SPA), TanStack Query 5, Supabase JS 2, Zod 4, date-fns 4, papaparse (devDependency — migration script only) (001-sheets-data-migration)
- Supabase (PostgreSQL) — `training_sessions` and `week_plans` tables extended (001-sheets-data-migration)

## Recent Changes
- 001-sheets-data-migration: Added TypeScript 5 (strict) + React 19, React Router 7 (SPA), TanStack Query 5, Supabase JS 2, Zod 4, date-fns 4, papaparse (devDependency — migration script only)
