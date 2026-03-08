import {
  type RouteConfig,
  index,
  route,
  layout,
  prefix,
} from '@react-router/dev/routes';

export default [
  route('login', 'routes/login.tsx'),

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
] satisfies RouteConfig;
