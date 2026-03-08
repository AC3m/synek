# Scaffold a new route

Scaffold a new page route. Arguments: `$ARGUMENTS` (e.g. `coach/analytics` or `athlete/history`).

## Steps

1. Parse the argument to determine:
   - Role: `coach` or `athlete`
   - Page slug (kebab-case)
   - Whether this is a parameterized route (contains `:param` or `$param`)

2. Create the route file at `app/routes/<role>/<page-slug>.tsx`:
   - Default export function (routes require default exports in React Router 7)
   - Import `useTranslation` with the role's namespace
   - Basic layout: container div, heading with a translation key
   - Import relevant hooks from `~/lib/hooks/` if the page has obvious data needs

3. Register the route in `app/routes.ts` under the correct parent layout:
   ```typescript
   route('<role>/<slug>', '<role>/<page-slug>.tsx')
   ```

4. Add placeholder translation keys:
   - `app/i18n/resources/en/<role>.json` — add `"<page-slug>": { "title": "Page Title" }`
   - `app/i18n/resources/pl/<role>.json` — add the Polish equivalent

5. Run `pnpm typecheck` to generate route types and confirm no type errors.

6. Output:
   - Files created/modified
   - Route path
   - Reminder to link to the route from navigation if needed
