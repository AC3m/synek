// app/test/unit/sessions-queries.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type QueryResult = { data: unknown; error: unknown };

type Call = {
  table: string;
  op: 'select' | 'insert' | 'update' | 'delete';
  columns?: string;
  payload?: unknown;
  filters: Array<[string, unknown]>;
  terminal?: 'single' | 'maybeSingle';
};

type QueryBuilder = {
  select(columns: string): QueryBuilder;
  insert(payload: unknown): QueryBuilder;
  update(payload: unknown): QueryBuilder;
  delete(): QueryBuilder;
  eq(col: string, val: unknown): QueryBuilder;
  order(col?: string, opts?: unknown): QueryBuilder;
  single(): Promise<QueryResult>;
  maybeSingle(): Promise<QueryResult>;
  then<TResult1 = QueryResult, TResult2 = never>(
    onFulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onRejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2>;
};

const harness = vi.hoisted(() => {
  const calls: Call[] = [];
  const nextResults: QueryResult[] = [];

  function takeNextResult(): QueryResult {
    if (nextResults.length === 0) {
      return { data: { id: 'session-1' }, error: null };
    }
    return nextResults.shift()!;
  }

  function makeBuilder(call: Call): QueryBuilder {
    const resolveValue = takeNextResult();
    const builder: QueryBuilder = {
      select(columns: string) {
        call.columns = columns;
        return builder;
      },
      insert(payload: unknown) {
        call.op = 'insert';
        call.payload = payload;
        return builder;
      },
      update(payload: unknown) {
        call.op = 'update';
        call.payload = payload;
        return builder;
      },
      delete() {
        call.op = 'delete';
        return builder;
      },
      eq(col: string, val: unknown) {
        call.filters.push([col, val]);
        return builder;
      },
      order() {
        return builder;
      },
      single() {
        call.terminal = 'single';
        return Promise.resolve(resolveValue);
      },
      maybeSingle() {
        call.terminal = 'maybeSingle';
        return Promise.resolve(resolveValue);
      },
      then(onFulfilled, onRejected) {
        return Promise.resolve(resolveValue).then(onFulfilled, onRejected);
      },
    };
    return builder;
  }

  const fromMock = (table: string) => {
    const call: Call = { table, op: 'select', filters: [] };
    calls.push(call);
    return makeBuilder(call);
  };

  return { calls, nextResults, fromMock };
});

vi.mock('~/lib/supabase', () => ({
  supabase: { from: harness.fromMock },
  isMockMode: false,
}));

beforeEach(() => {
  harness.calls.length = 0;
  harness.nextResults.length = 0;
});

afterEach(() => {
  vi.clearAllMocks();
});

const calls = harness.calls;
function pushResult(value: QueryResult) {
  harness.nextResults.push(value);
}

const FULL_ROW = {
  id: 'session-1',
  week_plan_id: 'wp-1',
  day_of_week: 'monday',
  sort_order: 0,
  training_type: 'run',
  description: null,
  coach_comments: null,
  planned_duration_minutes: null,
  planned_distance_km: null,
  type_specific_data: { type: 'run' },
  is_completed: true,
  completed_at: '2026-05-05T08:00:00Z',
  actual_duration_minutes: null,
  actual_distance_km: null,
  actual_pace: null,
  avg_heart_rate: null,
  max_heart_rate: null,
  rpe: null,
  calories: null,
  coach_post_feedback: null,
  trainee_notes: null,
  strava_activity_id: null,
  strava_synced_at: null,
  goal_id: null,
  result_distance_km: null,
  result_time_seconds: null,
  result_pace: null,
  is_strava_confirmed: false,
  created_at: '2026-05-05T00:00:00Z',
  updated_at: '2026-05-05T08:00:00Z',
};

describe('sessions queries — table/view targeting', () => {
  it('createSession writes to training_sessions with id-only return then reads from secure_training_sessions', async () => {
    pushResult({ data: { id: 'session-1' }, error: null });
    pushResult({ data: FULL_ROW, error: null });

    const { createSession } = await import('~/lib/queries/sessions');
    const result = await createSession({
      weekPlanId: 'wp-1',
      dayOfWeek: 'monday',
      trainingType: 'run',
    });

    expect(calls).toHaveLength(2);
    expect(calls[0].table).toBe('training_sessions');
    expect(calls[0].op).toBe('insert');
    expect(calls[0].columns).toBe('id');
    expect(calls[0].payload).toMatchObject({ week_plan_id: 'wp-1', training_type: 'run' });
    expect(calls[1].table).toBe('secure_training_sessions');
    expect(calls[1].op).toBe('select');
    expect(calls[1].filters).toContainEqual(['id', 'session-1']);
    expect(calls[1].terminal).toBe('single');
    expect(result.id).toBe('session-1');
  });

  it('updateSession writes to training_sessions with id-only return then reads from secure_training_sessions', async () => {
    pushResult({ data: { id: 'session-1' }, error: null });
    pushResult({ data: FULL_ROW, error: null });

    const { updateSession } = await import('~/lib/queries/sessions');
    const result = await updateSession({ id: 'session-1', coachComments: 'nice' });

    expect(calls).toHaveLength(2);
    expect(calls[0].table).toBe('training_sessions');
    expect(calls[0].op).toBe('update');
    expect(calls[0].columns).toBe('id');
    expect(calls[0].payload).toMatchObject({ coach_comments: 'nice' });
    expect(calls[1].table).toBe('secure_training_sessions');
    expect(calls[1].op).toBe('select');
    expect(calls[1].filters).toContainEqual(['id', 'session-1']);
    expect(result.id).toBe('session-1');
  });

  it('updateAthleteSession writes to training_sessions with id-only return then reads from secure_training_sessions', async () => {
    pushResult({ data: { id: 'session-1' }, error: null });
    pushResult({ data: FULL_ROW, error: null });

    const { updateAthleteSession } = await import('~/lib/queries/sessions');
    const result = await updateAthleteSession({ id: 'session-1', isCompleted: true });

    expect(calls).toHaveLength(2);
    expect(calls[0].table).toBe('training_sessions');
    expect(calls[0].op).toBe('update');
    expect(calls[0].columns).toBe('id');
    expect(calls[0].payload).toMatchObject({ is_completed: true });
    expect(calls[1].table).toBe('secure_training_sessions');
    expect(calls[1].op).toBe('select');
    expect(calls[1].filters).toContainEqual(['id', 'session-1']);
    expect(calls[1].terminal).toBe('single');
    expect(result.id).toBe('session-1');
    expect(result.isStravaConfirmed).toBe(false);
  });

  it('fetchSessionByGoalId reads from secure_training_sessions', async () => {
    pushResult({ data: FULL_ROW, error: null });

    const { fetchSessionByGoalId } = await import('~/lib/queries/sessions');
    const result = await fetchSessionByGoalId('goal-1');

    expect(calls).toHaveLength(1);
    expect(calls[0].table).toBe('secure_training_sessions');
    expect(calls[0].op).toBe('select');
    expect(calls[0].filters).toContainEqual(['goal_id', 'goal-1']);
    expect(calls[0].terminal).toBe('maybeSingle');
    expect(result?.id).toBe('session-1');
  });
});
