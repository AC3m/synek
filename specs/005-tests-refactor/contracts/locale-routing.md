# Contract: Locale Routing

## URL Scheme

All application routes include a locale prefix as the first path segment:

| Locale | Pattern | Example |
|--------|---------|---------|
| Polish (default) | `/pl/<route>` | `/pl/coach/week/2026-W10` |
| English | `/en/<route>` | `/en/athlete/week/2026-W09` |

## Route Structure

```
/:locale                     → LocaleLayout (validates locale, sets i18n language)
  /                          → home.tsx (redirects to /:locale/coach or /:locale/athlete based on role)
  /coach                     → coach/layout.tsx (auth guard: role=coach)
    /                        → coach/week.tsx (redirects to current week)
    /week/:weekId            → coach/week.$weekId.tsx
  /athlete                   → athlete/layout.tsx (auth guard: role=athlete)
    /                        → athlete/week.tsx (redirects to current week)
    /week/:weekId            → athlete/week.$weekId.tsx
  /settings                  → settings.tsx
/login                       → login.tsx (no locale prefix — public)
```

## Redirect Rules

| Input URL | Redirect Target | Condition |
|-----------|----------------|-----------|
| `/` | `/pl/` or `/[stored-locale]/` | Always (no locale segment) |
| `/coach/week` | `/pl/coach/week` | Legacy URL without locale |
| `/de/coach/week` | `/pl/coach/week` | Unsupported locale |
| `/pl/coach/week` | No redirect | Valid |

## LocaleLayout Behaviour

```typescript
// app/routes/locale-layout.tsx
const SUPPORTED_LOCALES = ['pl', 'en'] as const
type SupportedLocale = typeof SUPPORTED_LOCALES[number]

export default function LocaleLayout() {
  const { locale } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  if (!SUPPORTED_LOCALES.includes(locale as SupportedLocale)) {
    // Replace unsupported locale segment with 'pl'
    const redirectPath = location.pathname.replace(`/${locale}/`, '/pl/')
    return <Navigate to={redirectPath} replace />
  }

  i18n.changeLanguage(locale)
  localStorage.setItem('locale', locale)

  return <Outlet />
}
```

## Language Toggle Contract

The `LanguageToggle` component:
- Reads current locale from `useParams().locale`
- On switch: constructs new URL by replacing locale segment
- Navigates with `useNavigate()` (no full page reload)
- Persists new locale to `localStorage`

```typescript
function handleLocaleSwitch(newLocale: string) {
  const currentPath = location.pathname
  const newPath = currentPath.replace(new RegExp(`^/${locale}/`), `/${newLocale}/`)
  navigate(newPath, { replace: false })
  localStorage.setItem('locale', newLocale)
}
```

## Locale Persistence Priority

1. URL param (highest priority — always respected)
2. `localStorage.getItem('locale')` (used for initial redirect at `/`)
3. `'pl'` (hardcoded fallback default)
