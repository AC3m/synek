import { assertEquals } from 'jsr:@std/assert';
import { checkAndIncrementRateLimit } from './rate-limit.ts';

function makeSupabase(overrides?: {
  upsertData?: { attempt_count: number } | null;
  upsertError?: Error | null;
  selectData?: { attempt_count: number } | null;
  updateError?: Error | null;
}) {
  const opts = {
    upsertData: overrides?.upsertData ?? { attempt_count: 1 },
    upsertError: overrides?.upsertError ?? null,
    selectData: overrides?.selectData ?? null,
    updateError: overrides?.updateError ?? null,
  };

  return {
    from: (_table: string) => ({
      upsert: (_row: unknown, _conf: unknown) => ({
        select: (_cols: string) => ({
          single: () => Promise.resolve({ data: opts.upsertData, error: opts.upsertError }),
        }),
      }),
      select: (_cols: string) => ({
        eq: (_col: string, _val: unknown) => ({
          eq: (_col2: string, _val2: unknown) => ({
            eq: (_col3: string, _val3: unknown) => ({
              single: () => Promise.resolve({ data: opts.selectData, error: null }),
            }),
          }),
        }),
      }),
      update: (_vals: unknown) => ({
        eq: (_col: string, _val: unknown) => ({
          eq: (_col2: string, _val2: unknown) => ({
            eq: (_col3: string, _val3: unknown) => Promise.resolve({ error: opts.updateError }),
          }),
        }),
      }),
    }),
  };
}

Deno.test('allows first attempt (count=1, max=5)', async () => {
  const sb = makeSupabase({ upsertData: { attempt_count: 1 } });
  const allowed = await checkAndIncrementRateLimit(sb, '1.2.3.4', 'register', 10, 5);
  assertEquals(allowed, true);
});

Deno.test('allows attempt at exactly the limit (count=5, max=5)', async () => {
  const sb = makeSupabase({ upsertData: { attempt_count: 5 } });
  const allowed = await checkAndIncrementRateLimit(sb, '1.2.3.4', 'register', 10, 5);
  assertEquals(allowed, true);
});

Deno.test('blocks attempt over the limit (count=6, max=5)', async () => {
  const sb = makeSupabase({ upsertData: { attempt_count: 6 } });
  const allowed = await checkAndIncrementRateLimit(sb, '1.2.3.4', 'register', 10, 5);
  assertEquals(allowed, false);
});

Deno.test('upsert error path: increments and blocks when existing count >= max', async () => {
  const sb = makeSupabase({
    upsertData: null,
    upsertError: new Error('conflict'),
    selectData: { attempt_count: 5 },
  });
  const allowed = await checkAndIncrementRateLimit(sb, '1.2.3.4', 'register', 10, 5);
  // existing count (5) is NOT < max (5) — blocked
  assertEquals(allowed, false);
});

Deno.test('upsert error path: allows when existing count < max', async () => {
  const sb = makeSupabase({
    upsertData: null,
    upsertError: new Error('conflict'),
    selectData: { attempt_count: 3 },
  });
  const allowed = await checkAndIncrementRateLimit(sb, '1.2.3.4', 'register', 10, 5);
  assertEquals(allowed, true);
});

Deno.test('fail open: returns true when upsert fails and row not found', async () => {
  const sb = makeSupabase({
    upsertData: null,
    upsertError: new Error('db down'),
    selectData: null,
  });
  const allowed = await checkAndIncrementRateLimit(sb, '1.2.3.4', 'register', 10, 5);
  assertEquals(allowed, true);
});
