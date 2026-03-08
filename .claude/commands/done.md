# Post-implementation checklist

Run this after finishing any feature or bug fix. No arguments needed.

Review everything changed in this session and verify each item below. Report status (pass/fail/n-a) for each, then fix any failures before finishing.

## Checklist

**TypeScript**
- [ ] `pnpm typecheck` passes with zero errors
- [ ] No `any` types introduced — use `unknown` and narrow instead
- [ ] New types follow conventions: `PascalCase`, `Input` suffix for create/update payloads

**Data layer**
- [ ] Every new mutation has `onMutate` (optimistic update) + `onError` (rollback) + `onSettled` (invalidate)
- [ ] No `supabase.from()` calls outside `app/lib/queries/`
- [ ] Every new query function has both a real Supabase path and a mock path

**i18n**
- [ ] No hardcoded English strings in JSX — all use `t('key')`
- [ ] Every new translation key was added to BOTH `en/` and `pl/` JSON files
- [ ] Correct namespace used for each `useTranslation()` call

**Components**
- [ ] Named exports used (not default exports, except route files)
- [ ] New components accept `className?: string` and use `cn()` for merging
- [ ] No new shadcn components added without using `pnpm dlx shadcn@latest add`

**Patterns**
- [ ] No `useEffect` used for data fetching
- [ ] Sport color system respected — no new ad-hoc colors outside `training-types.ts`
- [ ] Date operations use `date-fns` or utilities from `~/lib/utils/date`

If everything passes, output: "✓ All checks passed — ready to commit."
If anything fails, fix it now, then rerun `pnpm typecheck` to confirm.
