import {
  type RouteConfig,
  index,
  route,
  layout,
  prefix,
} from '@react-router/dev/routes';

export default [
  index('routes/home.tsx'),

  ...prefix('coach', [
    layout('routes/coach/layout.tsx', [
      index('routes/coach/week.tsx'),
      route('week/:weekId', 'routes/coach/week.$weekId.tsx'),
    ]),
  ]),

  ...prefix('trainee', [
    layout('routes/trainee/layout.tsx', [
      index('routes/trainee/week.tsx'),
      route('week/:weekId', 'routes/trainee/week.$weekId.tsx'),
    ]),
  ]),
] satisfies RouteConfig;
