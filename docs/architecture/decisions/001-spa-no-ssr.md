# ADR-001: Single-Page Application (No SSR)

**Status**: Accepted
**Date**: 2025-01-01

## Context

Synek needed a frontend architecture decision early in the project. React Router 7 supports both SSR and SPA modes. The team evaluated both options given the product's nature: a dashboard-style tool used primarily by logged-in coaches and athletes.

## Decision

Build as a SPA (`ssr: false` in `react-router.config.ts`). No server-side rendering.

## Rationale

- The entire product is behind authentication — SEO and first-paint for crawlers provides no value
- Supabase handles auth and data; there is no Node.js server to run SSR on
- Deployment target is static hosting (Vercel) — simpler, cheaper, no cold starts
- Coach and athlete dashboards are highly interactive; client-side rendering suits the interaction model

## Consequences

- No server-rendered HTML — all routes are client-rendered after the JS bundle loads
- Route type generation (`pnpm typecheck`) is required after adding routes — React Router generates typed params in SPA mode via `typegen`
- Public marketing pages (e.g. landing page) must also be client-rendered, which is acceptable for this product's scale
- `react-router.config.ts` must always have `ssr: false`
