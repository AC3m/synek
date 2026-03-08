# Scaffold a new data query + hook

Add a new React Query data layer for an entity. Arguments: `$ARGUMENTS` (e.g. `athlete-profile` or `weekly-stats`).

## Steps

### 1. Query key factory
In `app/lib/queries/keys.ts`, add:
```typescript
export const <entity>Keys = {
  all: ['<entity>'] as const,
  byId: (id: string) => [...<entity>Keys.all, id] as const,
  // add other variants as needed
}
```

### 2. Query file
Create `app/lib/queries/<entity>.ts`:
- Import `supabase` and `isMockMode` from `~/lib/supabase`
- Define the row mapper function: `to<Entity>(row): <Entity>`  (snake_case → camelCase)
- Export async fetch functions: `fetch<Entity>`, `create<Entity>`, `update<Entity>`, `delete<Entity>`
- Each function: real Supabase path + mock path (use `if (isMockMode) return mock...()`)
- Mock implementations using in-memory Map or array

### 3. Hook file
Create `app/lib/hooks/use<Entity>.ts`:
- `use<Entity>(id)` — useQuery with the key + fetch function
- `useCreate<Entity>()` — useMutation with optimistic update pattern:
  - `onMutate`: cancel queries, snapshot old data, apply optimistic update, return `{ prev }`
  - `onError`: restore from `ctx.prev`
  - `onSettled`: invalidate queries
- Repeat mutation pattern for update and delete hooks
- Add toast notifications via `toast.success` / `toast.error` from `sonner`

### 4. Types
If not already in `app/types/training.ts`, add:
- `<Entity>` — full domain model (camelCase)
- `Create<Entity>Input` — fields required to create
- `Update<Entity>Input` — partial fields + `id`

### 5. Verify
Run `pnpm typecheck` and confirm no errors.

### Output
List all files created/modified.
