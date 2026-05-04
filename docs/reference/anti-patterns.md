# Reference: Anti-Patterns

Things that must never appear in this codebase. Each entry below is a rule that causes bugs, type failures, or policy violations when violated.

## Data Fetching

| Anti-pattern                     | Correct approach                  |
| -------------------------------- | --------------------------------- |
| `useEffect` for data fetching    | React Query hooks in `lib/hooks/` |
| `supabase.from()` in a component | Move to `lib/queries/`            |
| `supabase.from()` in a hook      | Move to `lib/queries/`            |
| `select('*')` in any query       | Always list columns explicitly    |

## Components & Exports

| Anti-pattern                                             | Correct approach                             |
| -------------------------------------------------------- | -------------------------------------------- |
| Default export for a component                           | Named export (routes are the only exception) |
| Hardcoded English string in JSX                          | `t('key')` via `useTranslation`              |
| Manually editing `app/components/ui/`                    | `pnpm dlx shadcn@latest add <name>`          |
| Inline sport color literal (e.g. `text-blue-700` in JSX) | Use token from `training-types.ts`           |

## State & Mutations

| Anti-pattern                                | Correct approach                                          |
| ------------------------------------------- | --------------------------------------------------------- |
| Mutation without `onMutate`                 | Required for optimistic update                            |
| Mutation without `onError` rollback         | Required for optimistic update                            |
| `onSuccess` for cache invalidation          | Use `onSettled` instead — fires on both success and error |
| Lifting state to global context prematurely | Keep state at the lowest sensible scope                   |

## Styling

| Anti-pattern                | Correct approach                                 |
| --------------------------- | ------------------------------------------------ |
| CSS Modules                 | Tailwind only                                    |
| styled-components           | Tailwind only                                    |
| Raw `new Date()` arithmetic | `date-fns` functions via `app/lib/utils/date.ts` |

## Testing

| Anti-pattern                                   | Correct approach                                   |
| ---------------------------------------------- | -------------------------------------------------- |
| Top-level variable inside `vi.mock()` factory  | `vi.fn()` inside factory, assign in `beforeEach`   |
| `vi.doMock` for per-test overrides             | `vi.spyOn(module, 'fn').mockRejectedValueOnce(…)`  |
| Shallow array copy in mock reset (`[...SEED]`) | Deep clone: `SEED.map(i => ({ ...i }))`            |
| `userEvent.type` on `aria-hidden` input        | `fireEvent.change(el, { target: { value: '…' } })` |

## TypeScript

| Anti-pattern                                   | Correct approach                            |
| ---------------------------------------------- | ------------------------------------------- |
| `as any`                                       | `unknown` + explicit narrowing              |
| `@ts-ignore` without comment                   | Explain why type system cannot be satisfied |
| Raw DB row flowing into domain type            | Pass through `toMyType(row)` row mapper     |
| Unvalidated external input entering core logic | Zod 4 at the system boundary                |

## Tooling & Packages

| Anti-pattern                                | Correct approach                                                      |
| ------------------------------------------- | --------------------------------------------------------------------- |
| `npm install` or `yarn add`                 | `pnpm add` always                                                     |
| New dependency without bundle evaluation    | Document gzipped size in `research.md`; >50 KB requires justification |
| Committing `.env.local` or Supabase secrets | `.env.local` is gitignored; never commit secrets                      |
