# Synek — Claude Code Instructions

## What This App Is
An **athlete training planning platform** with coach/athlete roles. Coaches create ISO-week training plans; athletes view and complete sessions. Built SPA (no SSR). See `.specify/memory/constitution.md` for approved tech stack versions, type safety rules, security policy, and performance targets.

## Commands
```bash
pnpm dev          # dev server (localhost:5173)
pnpm build        # production build
pnpm typecheck    # react-router typegen + tsc (MUST pass before merge)
pnpm dlx shadcn@latest add <component>  # add shadcn component
```

---

## Architecture

### How Directories Relate
- `app/routes/` — page components only; no DB access, no direct queries
- `app/lib/hooks/` — React Query hooks (`useWeekPlan.ts`, `useSessions.ts`, etc.); the only place components touch server state
- `app/lib/queries/` — Supabase CRUD functions (`sessions.ts`, `weeks.ts`) + `keys.ts` query key factory; real and mock implementations live side-by-side in the same file
- `app/lib/utils/` — pure helpers: `date.ts`, `training-types.ts`, `week-view.ts`
- `app/components/ui/` — shadcn-managed primitives; never edit manually
- `app/components/calendar/` — week planning widgets
- `app/components/training/` — session form + sport-specific `type-fields/`
- `app/types/` — domain models in `training.ts`; Strava types in `strava.ts`
- `app/i18n/resources/en/` and `app/i18n/resources/pl/` — translation namespaces: `common`, `coach`, `athlete`, `training`
- `supabase/functions/` — Deno Edge Functions (one directory per function)

### Data Flow
```
routes/ → hooks/ → queries/ → Supabase (or mock)
            ↕
        React Query cache (single source of truth)
```

---

## Patterns — Follow These Exactly

### 1. New Component
- Named exports only — no default exports for components (routes are the exception)
- Props interface in the same file, above the component
- Always accept `className?: string` for composability
- Handler props named `on[Action]`
- Always use `cn()` from `~/lib/utils` for conditional classes
- Always use `useTranslation` — no hardcoded English strings

See `app/components/calendar/SessionCard.tsx` for a full example.

### 2. New React Query Hook
Four mandatory rules for every mutation:
1. `onMutate`: call `qc.cancelQueries`, snapshot previous data, apply optimistic update
2. `onError`: rollback to snapshot from context
3. `onSettled` (not `onSuccess`): call `qc.invalidateQueries`
4. `enabled: !!id` guard on queries that depend on a runtime value

See `app/lib/hooks/useWeekPlan.ts` and `app/lib/hooks/useSessions.ts` for full examples.

### 3. New Query Key
```typescript
// app/lib/queries/keys.ts — add to existing factory
export const myKeys = {
  all: ['myEntity'] as const,
  byId: (id: string) => [...myKeys.all, id] as const,
}
```

### 4. New Supabase Query
- Every query file MUST export both a real and a mock implementation
- Gate on `isMockMode`: `if (isMockMode) return mockFetch(id)`
- Use a `toMyType(row)` row mapper for snake_case → camelCase transformation
- Never use `select('*')` — always list columns explicitly; use `.maybeSingle()` for nullable results

See `app/lib/queries/sessions.ts` or `app/lib/queries/weeks.ts` for a complete example.

### 5. New Training Type (sport-specific fields)
1. Add variant to `TypeSpecificData` in `app/types/training.ts`
2. Add color config in `app/lib/utils/training-types.ts`
3. Create `app/components/training/type-fields/MyTypeFields.tsx`
4. Add translation keys to both `app/i18n/resources/en/training.json` and `pl/training.json`
5. Render the field component in `SessionForm.tsx` via switch/conditional

### 6. New Route
- Place in `app/routes/coach/` or `app/routes/athlete/` as appropriate
- Register in `app/routes.ts` under the correct layout
- Routes inside `/:locale` get locale prefix automatically (`/pl/coach/...`)
- Public routes without a locale (e.g. invite pages) register at the top level alongside `login`, outside the `':locale'` layout wrapper
- Run `pnpm typecheck` after adding routes to generate types

See `app/routes/invite.$token.tsx` for a locale-free public route example.

### 7. Adding Translations
Always add to BOTH language files simultaneously:
- `app/i18n/resources/en/<namespace>.json`
- `app/i18n/resources/pl/<namespace>.json`

Use namespace prefix in `useTranslation`: `useTranslation('training')` → `t('key')`

---

## Type Conventions

### Domain Types (`app/types/training.ts`)
- **PascalCase** for all types: `WeekPlan`, `TrainingSession`
- **Discriminated unions** keyed on `type` field: `type TypeSpecificData = RunData | CyclingData | ...` — each variant carries `{ type: 'run' | 'cycling' | ... }`
- **Input types** suffixed `Input`: `CreateSessionInput`, `UpdateSessionInput`
- **JSONB fields** typed as `Record<string, unknown>` at DB boundary, narrowed via row mappers

### TypeScript Rules
- Prefer `type` over `interface` for unions and computed types; use `interface` for component props and plain object shapes
- Import types with `import type { }` syntax
- `import.meta.env.VITE_X` — no casting needed; Vite types it automatically
- Dynamic i18n template-literal keys TypeScript cannot verify: cast `as never`
- **Zod 4**: use `.issues[0]?.message` (`.errors` was removed in v4)
- `as const` on all query keys

---

## Styling Rules

### Tailwind
Use `cn()` from `~/lib/utils` for all conditional class merging. Follow the sport color system — do NOT invent new color literals:

| Sport | Text | Background |
|---|---|---|
| run | `blue-700` | `bg-blue-100` |
| cycling | `green-700` | `bg-green-100` |
| strength | `orange-700` | `bg-orange-100` |
| yoga | `purple-700` | `bg-purple-100` |
| mobility | `teal-700` | `bg-teal-100` |
| swimming | `cyan-700` | `bg-cyan-100` |
| rest_day | `gray-500` | `bg-gray-100` |

Look up the full config in `app/lib/utils/training-types.ts` before touching colors.

### shadcn/ui
- Import from `~/components/ui/...`
- Never modify files in `app/components/ui/` — shadcn-managed
- Add new components only via `pnpm dlx shadcn@latest add <name>`

---

## Mock Mode
Mock mode activates automatically when Supabase credentials are missing or placeholders — no manual flag needed.
- Mock data lives in `app/lib/mock-data/` (split by domain: `sessions.ts`, `weeks.ts`, `profile.ts`, etc.)
- Implement the mock version first, then the real Supabase version
- Each mock module exports a `resetMockX()` function — call it in `beforeEach`; use deep clones on reset (`SEED.map(i => ({ ...i }))`) to prevent mutation bleed between tests

---

## Testing Patterns

### File Organisation
- `app/test/unit/` — pure function / mapper tests (no React, no module mocks)
- `app/test/integration/` — hook and component tests (render + TanStack Query wrapper)

### Mocking Supabase / Query Modules
```typescript
// Use vi.fn() inside the factory — avoids hoisting ReferenceError
vi.mock('~/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      signInWithPassword: vi.fn(),
    },
  },
  isMockMode: true,
}))

// Assign return values in beforeEach, not at module scope
beforeEach(() => {
  vi.mocked(supabase.auth.getSession).mockResolvedValue({
    data: { session: { access_token: 'tok' } },
  } as never)
})
```
- Never reference top-level variables inside `vi.mock()` factories — they run before initialisation
- For per-test overrides use `vi.spyOn(module, 'fn').mockRejectedValueOnce(...)` — `vi.doMock` does not affect already-loaded modules

### Mock Context
```typescript
let mockUser: AuthUser | null = null

vi.mock('~/lib/context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, logout: vi.fn() }),
}))

// Set before render:
mockUser = { id: '1', role: 'coach', name: 'Jane' }
```

### Interacting with `aria-hidden` Fields
`userEvent.type` skips elements with `aria-hidden="true"` (e.g. honeypot inputs). Use `fireEvent.change` instead:
```typescript
fireEvent.change(container.querySelector('[name="website"]')!, {
  target: { value: 'bot' },
})
```

### TDD Approach
1. Write the test → confirm it fails (red)
2. Implement minimal code → confirm it passes (green)
3. Refactor if needed

---

## Supabase Edge Functions

Pattern — follow `supabase/functions/strava-auth/index.ts` exactly:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  // ...
})
```
- Verify caller JWT via `anonClient.auth.getUser(jwt)` (not service role) before any mutation
- Use service role client only for admin operations (`createUser`, `deleteUser`, etc.)
- Always handle `OPTIONS` preflight for CORS

---

## Security Conventions

### Honeypot (all public-facing registration/action forms)
```tsx
<input name="website" tabIndex={-1} className="sr-only" aria-hidden="true"
       value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
```
Silently reject submissions where honeypot is non-empty.

### Auth & Destructive Actions
- After invite-based registration, call `signInWithPassword` to issue a fresh session (prevents session fixation)
- Two-step destructive actions (e.g. account deletion): step 1 explains consequences, step 2 requires typing the exact confirmation value before enabling submit

---

## Anti-Patterns (Never Do These)

- No `useEffect` for data fetching — use React Query hooks in `lib/hooks/`
- No default exports for components — named exports only (routes are the exception)
- No inline SQL or `supabase.from()` calls in components or hooks — only in `lib/queries/`
- No hardcoded English strings in JSX — always use `t('key')` from i18next
- No mutations without optimistic updates — `onMutate`/`onError`/`onSettled` are mandatory
- No manual edits to `app/components/ui/` — always use shadcn CLI
- No CSS modules or styled-components — Tailwind only
- No date arithmetic outside `date-fns` — never `new Date()` math directly
- No `npm` or `yarn` — always `pnpm`
- No `select('*')` in Supabase queries — always list columns explicitly
- No top-level variable references inside `vi.mock()` factories — `vi.fn()` inside factory, assign in `beforeEach`
- No `vi.doMock` for per-test overrides — use `vi.spyOn` instead
- No shallow array copies in mock resets — `.map(i => ({ ...i }))` deep clone required

---

## File & Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| Components | PascalCase | `SessionCard.tsx` |
| UI primitives (shadcn) | lowercase | `button.tsx` |
| Hooks | camelCase, `use` prefix | `useWeekPlan.ts` |
| Query files | kebab-case | `sessions.ts`, `week-view.ts` |
| Utility files | kebab-case | `training-types.ts` |
| Types | PascalCase | `WeekPlan`, `RunData` |
| DB columns | snake_case → camelCase in TS | `week_start` → `weekStart` |
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
