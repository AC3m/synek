# How to Add a Supabase Query

Every query file must export both a real Supabase implementation and a mock implementation usable without credentials. Write the mock first.

## Steps

### 1. Add a query key to `app/lib/queries/keys.ts`

```ts
export const myEntityKeys = {
  all: ['myEntity'] as const,
  byId: (id: string) => [...myEntityKeys.all, id] as const,
}
```

### 2. Write the query function in `app/lib/queries/my-entity.ts`

```ts
import { supabase, isMockMode } from '~/lib/supabase'
import type { MyEntity } from '~/types/training'

// ── Row mapper (snake_case DB → camelCase domain) ──
function toMyEntity(row: Record<string, unknown>): MyEntity {
  return {
    id: row.id as string,
    name: row.name as string,
    createdAt: row.created_at as string,
  }
}

// ── Mock store ──
let MOCK_STORE: MyEntity[] = [
  { id: '1', name: 'Example', createdAt: '2026-01-01' },
]

export function resetMockMyEntities() {
  MOCK_STORE = [{ id: '1', name: 'Example', createdAt: '2026-01-01' }]
}

// ── Real + mock implementations ──
export async function fetchMyEntity(id: string): Promise<MyEntity | null> {
  if (isMockMode) {
    return MOCK_STORE.find(e => e.id === id) ?? null
  }

  const { data, error } = await supabase
    .from('my_entities')
    .select('id, name, created_at')   // never select('*')
    .eq('id', id)
    .maybeSingle()                    // use maybeSingle() for nullable results

  if (error) throw error
  return data ? toMyEntity(data) : null
}
```

### 3. Write a React Query hook in `app/lib/hooks/useMyEntity.ts`

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { myEntityKeys } from '~/lib/queries/keys'
import { fetchMyEntity } from '~/lib/queries/my-entity'

export function useMyEntity(id: string) {
  return useQuery({
    queryKey: myEntityKeys.byId(id),
    queryFn: () => fetchMyEntity(id),
    enabled: !!id,   // guard on runtime value
  })
}
```

### 4. Mutations — mandatory optimistic update cycle

Every mutation must implement all three handlers:

```ts
export function useUpdateMyEntity() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: updateMyEntity,

    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: myEntityKeys.all })
      const previous = qc.getQueryData(myEntityKeys.byId(input.id))
      qc.setQueryData(myEntityKeys.byId(input.id), { ...previous, ...input })
      return { previous }
    },

    onError: (_err, input, ctx) => {
      qc.setQueryData(myEntityKeys.byId(input.id), ctx?.previous)
    },

    onSettled: (_data, _err, input) => {
      qc.invalidateQueries({ queryKey: myEntityKeys.byId(input.id) })
    },
  })
}
```

## Canonical examples

- `app/lib/queries/sessions.ts`
- `app/lib/queries/weeks.ts`
- `app/lib/hooks/useWeekPlan.ts`
- `app/lib/hooks/useSessions.ts`
