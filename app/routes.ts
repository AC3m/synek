import {
  type RouteConfig,
  index,
  route,
  layout,
  prefix,
} from '@react-router/dev/routes';

export default [
  // Bare / redirects to /${locale} using stored preference
  index('routes/root-redirect.tsx'),

  // Login is public and outside the locale wrapper
  route('login', 'routes/login.tsx'),

  // Invite landing page — public, no locale prefix
  route('invite/:token', 'routes/invite.$token.tsx'),

  // All authenticated routes live under /:locale (pl or en)
  route(':locale', 'routes/locale-layout.tsx', [
    index('routes/home.tsx'),

    ...prefix('coach', [
      layout('routes/coach/layout.tsx', [
        index('routes/coach/week.tsx'),
        route('week/:weekId', 'routes/coach/week.$weekId.tsx'),
      ]),
    ]),

    ...prefix('athlete', [
      layout('routes/athlete/layout.tsx', [
        index('routes/athlete/week.tsx'),
        route('week/:weekId', 'routes/athlete/week.$weekId.tsx'),
      ]),
    ]),

    route('settings', 'routes/settings.tsx'),
  ]),
] satisfies RouteConfig;
