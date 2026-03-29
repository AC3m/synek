# How to Add a Route

## Placement

| Route type | Directory |
|---|---|
| Coach-only page | `app/routes/coach/` |
| Athlete-only page | `app/routes/athlete/` |
| Public page (no auth, no locale) | `app/routes/` top-level |

## Steps

1. Create the route file (kebab-case, `$` prefix for dynamic segments):
   ```
   app/routes/coach/my-page.tsx          # /en/coach/my-page
   app/routes/athlete/week.$weekId.tsx   # /en/athlete/week/:weekId
   app/routes/invite.$token.tsx          # /invite/:token  (no locale)
   ```

2. Register in `app/routes.ts` under the correct layout:
   ```ts
   // Inside the ':locale' layout → gets /en/ or /pl/ prefix automatically
   route('coach/my-page', 'routes/coach/my-page.tsx'),

   // Outside ':locale' → no locale prefix
   route('invite/:token', 'routes/invite.$token.tsx'),
   ```

3. Run `pnpm typecheck` — this triggers `react-router typegen` and produces typed params.

## Route file shape

```tsx
import type { Route } from './+types/my-page'

export default function MyPage({ params }: Route.ComponentProps) {
  return <div>...</div>
}
```

Routes are the one place where default exports are acceptable.

## Canonical examples

- Locale-scoped: `app/routes/coach/week.$weekId.tsx`
- Locale-free public: `app/routes/invite.$token.tsx`
