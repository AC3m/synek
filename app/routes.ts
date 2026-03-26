import {
  type RouteConfig,
  index,
  route,
  layout,
  prefix,
} from '@react-router/dev/routes';

export default [
  // Root: redirect / → /:locale
  index('routes/root-redirect.tsx'),

  // Invite landing page — stays at top level (links sent via email, locale-independent)
  route('invite/:token', 'routes/invite.$token.tsx'),

  // All routes under /:locale
  route(':locale', 'routes/locale-bare-layout.tsx', [
    // Public pages — each has its own nav (LandingNav), no app chrome
    index('routes/landing.tsx'),
    route('login', 'routes/login.tsx'),
    route('register', 'routes/register.tsx'),

    // App pages — wrapped with Header + BottomNav
    layout('routes/locale-layout.tsx', [
      route('home', 'routes/home.tsx'),

      ...prefix('coach', [
        layout('routes/coach/layout.tsx', [
          index('routes/coach/week.tsx'),
          route('week/:weekId', 'routes/coach/week.$weekId.tsx'),
          route('strength', 'routes/coach/strength.tsx'),
          route('strength/:variantId', 'routes/coach/strength.$variantId.tsx'),
        ]),
      ]),

      ...prefix('athlete', [
        layout('routes/athlete/layout.tsx', [
          index('routes/athlete/week.tsx'),
          route('week/:weekId', 'routes/athlete/week.$weekId.tsx'),
          route('strength', 'routes/athlete/strength.tsx'),
          route('strength/:variantId', 'routes/athlete/strength.$variantId.tsx'),
        ]),
      ]),

      route('settings', 'routes/settings.tsx'),
    ]),
  ]),
] satisfies RouteConfig;
