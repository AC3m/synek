# Reference: Code Conventions

## File Naming

| Thing | Convention | Example |
|---|---|---|
| Components | PascalCase | `SessionCard.tsx` |
| UI primitives (shadcn-managed) | lowercase | `button.tsx` |
| Hooks | camelCase, `use` prefix | `useWeekPlan.ts` |
| Query files | kebab-case | `sessions.ts`, `week-view.ts` |
| Utility files | kebab-case | `training-types.ts` |
| Route files | kebab-case, `$` for params | `week.$weekId.tsx` |
| Mock data modules | kebab-case | `mock-sessions.ts` |

## TypeScript Conventions

### Types vs Interfaces

- Use `type` for unions and computed types
- Use `interface` for component props and plain object shapes

### Domain Types (`app/types/training.ts`)

- PascalCase: `WeekPlan`, `TrainingSession`
- Discriminated unions keyed on `type`: `type TypeSpecificData = RunData | CyclingData | …` — each variant carries `{ type: 'run' | 'cycling' | … }`
- Input types suffixed `Input`: `CreateSessionInput`, `UpdateSessionInput`
- JSONB DB fields typed `Record<string, unknown>` at boundary, narrowed in row mappers

### Imports

```ts
import type { WeekPlan } from '~/types/training'   // always import type for types
import { cn } from '~/lib/utils'
```

### Other rules

- `any` is forbidden — use `unknown` and narrow explicitly
- Dynamic i18n template-literal keys: cast `as never`
- Zod 4: use `.issues[0]?.message` (`.errors` was removed in v4)
- Query keys: `as const` always

## Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| Domain types | PascalCase | `WeekPlan`, `RunData` |
| DB columns → TS | snake_case → camelCase | `week_start` → `weekStart` |
| i18n keys | kebab-case | `session-form.title` |
| Handler props | `on` prefix | `onAddSession`, `onClose` |
| Boolean state | `is` / `has` prefix | `isCompleted`, `hasError` |
| Query keys | kebab-case array entries | `['sessions', id]` |

## Styling

### Tailwind

Use `cn()` from `~/lib/utils` for all conditional class merging:

```tsx
<div className={cn('base-class', isActive && 'active-class', className)} />
```

### Sport Color System

Never invent color literals. All sport colors are configured in `app/lib/utils/training-types.ts`.

| Sport | Text token | Background token |
|---|---|---|
| `run` | `text-blue-700` | `bg-blue-100` |
| `cycling` | `text-green-700` | `bg-green-100` |
| `strength` | `text-orange-700` | `bg-orange-100` |
| `yoga` | `text-purple-700` | `bg-purple-100` |
| `mobility` | `text-teal-700` | `bg-teal-100` |
| `swimming` | `text-cyan-700` | `bg-cyan-100` |
| `rest_day` | `text-gray-500` | `bg-gray-100` |

Read the config before touching any sport-related color class.

### shadcn/ui

- Import from `~/components/ui/…`
- Never manually edit `app/components/ui/` — shadcn-managed
- Add components via `pnpm dlx shadcn@latest add <name>`

## Date Handling

Always use utilities from `app/lib/utils/date.ts`:

```ts
getCurrentWeekId()        // → "2026-W10"
weekIdToMonday(weekId)   // → "2026-03-02"
getWeekDateRange(monday) // → "Mar 2 – Mar 8, 2026"
```

- Week IDs are ISO 8601: `YYYY-WWW`
- `weekStart` fields are always Monday in `YYYY-MM-DD`
- All other date operations: use `date-fns` functions — never raw `new Date()` arithmetic

## Mock Mode

Activates automatically when Supabase credentials are absent or placeholder — no manual flag.

- Mock data in `app/lib/mock-data/` split by domain (`sessions.ts`, `weeks.ts`, `profile.ts`, …)
- Write the mock implementation first, real Supabase implementation second
- Each mock module exports `resetMockX()` — call it in `beforeEach`
- Reset with deep clones: `SEED.map(i => ({ ...i }))` — prevents mutation bleed between tests

## Testing File Layout

| Directory | What goes here |
|---|---|
| `app/test/unit/` | Pure function / row mapper tests — no React, no module mocks |
| `app/test/integration/` | Hook and component tests with TanStack Query wrapper |

## Security Conventions

### Honeypot (all public-facing forms)

```tsx
<input
  name="website"
  tabIndex={-1}
  className="sr-only"
  aria-hidden="true"
  value={honeypot}
  onChange={(e) => setHoneypot(e.target.value)}
/>
```

Silently reject submissions where `honeypot` is non-empty.

### Auth & Destructive Actions

- After invite-based registration, call `signInWithPassword` to issue a fresh session (prevents session fixation)
- Destructive actions (e.g. account deletion): two-step — step 1 explains consequences, step 2 requires typing the exact confirmation value

## Edge Function Pattern

Follow `supabase/functions/strava-auth/index.ts`:

```ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  // …
})
```

- Verify JWT via `anonClient.auth.getUser(jwt)` before any mutation
- Use service-role client only for admin operations
- Always handle `OPTIONS` preflight
