import { supabase, isMockMode } from '~/lib/supabase';
import type {
  StrengthVariant,
  StrengthVariantExercise,
  StrengthSessionExercise,
  SetEntry,
  ProgressionIntent,
  ProgressLog,
  LoadUnit,
  PerSetRep,
  CreateStrengthVariantInput,
  UpdateStrengthVariantInput,
  UpsertVariantExercisesInput,
  UpsertSessionExercisesInput,
} from '~/types/training';
import {
  mockFetchStrengthVariants,
  mockFetchStrengthVariant,
  mockCreateStrengthVariant,
  mockUpdateStrengthVariant,
  mockDeleteStrengthVariant,
  mockUpsertVariantExercises,
  mockFetchStrengthSessionExercises,
  mockUpsertSessionExercises,
  mockFetchLastSessionExercises,
  mockFetchVariantProgressLogs,
} from '~/lib/mock-data/strength-variants';

// ---------------------------------------------------------------------------
// Row mappers — snake_case DB → camelCase TS
// ---------------------------------------------------------------------------

function parsePerSetReps(raw: unknown): PerSetRep[] | null {
  if (!Array.isArray(raw)) return null;
  return raw.map((entry: Record<string, unknown>) => ({
    repsMin: Number(entry.reps_min ?? entry.repsMin ?? 0),
    repsMax: Number(entry.reps_max ?? entry.repsMax ?? 0),
  }));
}

function toStrengthVariantExercise(row: Record<string, unknown>): StrengthVariantExercise {
  return {
    id: row.id as string,
    variantId: row.variant_id as string,
    name: row.name as string,
    videoUrl: row.video_url as string | null,
    sets: row.sets as number,
    repsMin: row.reps_min as number,
    repsMax: row.reps_max as number,
    perSetReps: parsePerSetReps(row.per_set_reps),
    loadUnit: (row.load_unit as LoadUnit | null) ?? 'kg',
    sortOrder: row.sort_order as number,
    supersetGroup: row.superset_group as number | null,
    progressionIncrement:
      row.progression_increment != null ? Number(row.progression_increment) : null,
    createdAt: row.created_at as string,
  };
}

function toStrengthVariant(
  row: Record<string, unknown>,
  exercises: StrengthVariantExercise[] = [],
): StrengthVariant {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    name: row.name as string,
    description: row.description as string | null,
    exercises,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function toStrengthSessionExercise(row: Record<string, unknown>): StrengthSessionExercise {
  const rawSets = row.sets_data;
  const setsData: SetEntry[] = Array.isArray(rawSets)
    ? rawSets.map((s: Record<string, unknown>) => ({
        reps: s.reps != null ? Number(s.reps) : null,
        loadKg: s.load_kg != null ? Number(s.load_kg) : null,
      }))
    : [];
  return {
    id: row.id as string,
    sessionId: row.session_id as string,
    variantExerciseId: row.variant_exercise_id as string | null,
    actualReps: row.actual_reps as number | null,
    loadKg: row.load_kg != null ? Number(row.load_kg) : null,
    progression: row.progression as ProgressionIntent | null,
    notes: row.notes as string | null,
    sortOrder: row.sort_order as number,
    createdAt: row.created_at as string,
    setsData,
  };
}

// ---------------------------------------------------------------------------
// Variant CRUD
// ---------------------------------------------------------------------------

// Nested select that fetches variant + exercises in one round-trip.
const VARIANT_WITH_EXERCISES_SELECT =
  'id, user_id, name, description, created_at, updated_at, ' +
  'strength_variant_exercises(id, variant_id, name, video_url, sets, reps_min, reps_max, per_set_reps, sort_order, load_unit, superset_group, progression_increment, created_at)';

function exercisesFromRow(row: Record<string, unknown>): StrengthVariantExercise[] {
  const exRows = (row.strength_variant_exercises as Record<string, unknown>[] | null) ?? [];
  return exRows.map(toStrengthVariantExercise).sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function fetchStrengthVariants(userId: string): Promise<StrengthVariant[]> {
  if (isMockMode) return mockFetchStrengthVariants(userId);

  const { data, error } = await supabase
    .from('strength_variants')
    .select(VARIANT_WITH_EXERCISES_SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;

  return (data ?? []).map((r) => {
    const row = r as unknown as Record<string, unknown>;
    return toStrengthVariant(row, exercisesFromRow(row));
  });
}

export async function fetchStrengthVariant(id: string): Promise<StrengthVariant | null> {
  if (isMockMode) return mockFetchStrengthVariant(id);

  const { data, error } = await supabase
    .from('strength_variants')
    .select(VARIANT_WITH_EXERCISES_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row = data as unknown as Record<string, unknown>;
  return toStrengthVariant(row, exercisesFromRow(row));
}

export async function createStrengthVariant(
  userId: string,
  input: CreateStrengthVariantInput,
): Promise<StrengthVariant> {
  if (isMockMode) return mockCreateStrengthVariant({ userId, ...input });

  const { data: variantRow, error } = await supabase
    .from('strength_variants')
    .insert({ user_id: userId, name: input.name, description: input.description ?? null })
    .select('id, user_id, name, description, created_at, updated_at')
    .single();
  if (error) throw error;

  const variantId = variantRow.id as string;
  const exerciseInserts = input.exercises.map((ex) => ({
    variant_id: variantId,
    name: ex.name,
    video_url: ex.videoUrl ?? null,
    sets: ex.sets,
    reps_min: ex.repsMin,
    reps_max: ex.repsMax,
    per_set_reps: ex.perSetReps
      ? ex.perSetReps.map((r) => ({ reps_min: r.repsMin, reps_max: r.repsMax }))
      : null,
    load_unit: ex.loadUnit ?? 'kg',
    sort_order: ex.sortOrder,
    superset_group: ex.supersetGroup ?? null,
    progression_increment: ex.progressionIncrement ?? null,
  }));

  const { data: exRows, error: exError } = await supabase
    .from('strength_variant_exercises')
    .insert(exerciseInserts)
    .select(
      'id, variant_id, name, video_url, sets, reps_min, reps_max, per_set_reps, sort_order, load_unit, superset_group, progression_increment, created_at',
    );
  if (exError) throw exError;

  const exercises = (exRows ?? []).map((r) =>
    toStrengthVariantExercise(r as Record<string, unknown>),
  );
  return toStrengthVariant(variantRow as Record<string, unknown>, exercises);
}

export async function updateStrengthVariant(
  input: UpdateStrengthVariantInput,
): Promise<StrengthVariant> {
  if (isMockMode) return mockUpdateStrengthVariant(input);

  const { data, error } = await supabase
    .from('strength_variants')
    .update({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
    })
    .eq('id', input.id)
    .select(VARIANT_WITH_EXERCISES_SELECT)
    .single();
  if (error) throw error;

  const row = data as unknown as Record<string, unknown>;
  return toStrengthVariant(row, exercisesFromRow(row));
}

export async function deleteStrengthVariant(id: string): Promise<void> {
  if (isMockMode) return mockDeleteStrengthVariant(id);

  const { error } = await supabase.from('strength_variants').delete().eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Variant exercises upsert
// ---------------------------------------------------------------------------

export async function upsertVariantExercises(
  input: UpsertVariantExercisesInput,
): Promise<StrengthVariantExercise[]> {
  if (isMockMode) return mockUpsertVariantExercises(input);

  // Determine IDs to keep — delete the rest
  const keepIds = input.exercises.filter((ex) => !!ex.id).map((ex) => ex.id as string);
  if (keepIds.length > 0) {
    const { error: delError } = await supabase
      .from('strength_variant_exercises')
      .delete()
      .eq('variant_id', input.variantId)
      .not('id', 'in', `(${keepIds.join(',')})`);
    if (delError) throw delError;
  } else {
    // Delete all exercises for this variant (replacing entirely)
    const { error: delError } = await supabase
      .from('strength_variant_exercises')
      .delete()
      .eq('variant_id', input.variantId);
    if (delError) throw delError;
  }

  if (input.exercises.length === 0) return [];

  const existing = input.exercises.filter((ex) => !!ex.id);
  const created = input.exercises.filter((ex) => !ex.id);

  function toRow(ex: (typeof input.exercises)[number], includeId: boolean) {
    return {
      ...(includeId && { id: ex.id }),
      variant_id: input.variantId,
      name: ex.name,
      video_url: ex.videoUrl ?? null,
      sets: ex.sets,
      reps_min: ex.repsMin,
      reps_max: ex.repsMax,
      per_set_reps: ex.perSetReps
        ? ex.perSetReps.map((r) => ({ reps_min: r.repsMin, reps_max: r.repsMax }))
        : null,
      load_unit: ex.loadUnit ?? 'kg',
      sort_order: ex.sortOrder,
      superset_group: ex.supersetGroup ?? null,
      progression_increment: ex.progressionIncrement ?? null,
    };
  }

  const results: StrengthVariantExercise[] = [];
  const cols =
    'id, variant_id, name, video_url, sets, reps_min, reps_max, per_set_reps, sort_order, load_unit, superset_group, progression_increment, created_at';

  if (existing.length > 0) {
    const { data, error } = await supabase
      .from('strength_variant_exercises')
      .upsert(existing.map((ex) => toRow(ex, true)))
      .select(cols);
    if (error) throw error;
    results.push(
      ...(data ?? []).map((r) => toStrengthVariantExercise(r as Record<string, unknown>)),
    );
  }

  if (created.length > 0) {
    const { data, error } = await supabase
      .from('strength_variant_exercises')
      .insert(created.map((ex) => toRow(ex, false)))
      .select(cols);
    if (error) throw error;
    results.push(
      ...(data ?? []).map((r) => toStrengthVariantExercise(r as Record<string, unknown>)),
    );
  }

  return results.sort((a, b) => a.sortOrder - b.sortOrder);
}

// ---------------------------------------------------------------------------
// Session exercise logging
// ---------------------------------------------------------------------------

export async function fetchStrengthSessionExercises(
  sessionId: string,
): Promise<StrengthSessionExercise[]> {
  if (isMockMode) return mockFetchStrengthSessionExercises(sessionId);

  const { data, error } = await supabase
    .from('strength_session_exercises')
    .select(
      'id, session_id, variant_exercise_id, actual_reps, load_kg, progression, notes, sort_order, created_at, sets_data',
    )
    .eq('session_id', sessionId)
    .order('sort_order', { ascending: true });
  if (error) throw error;

  return (data ?? []).map((r) => toStrengthSessionExercise(r as Record<string, unknown>));
}

export async function upsertSessionExercises(
  input: UpsertSessionExercisesInput,
): Promise<StrengthSessionExercise[]> {
  if (isMockMode) return mockUpsertSessionExercises(input);

  const upsertRows = input.exercises.map((ex) => ({
    session_id: input.sessionId,
    variant_exercise_id: ex.variantExerciseId,
    actual_reps: ex.actualReps ?? null,
    load_kg: ex.loadKg ?? null,
    progression: ex.progression ?? null,
    notes: ex.notes ?? null,
    sort_order: ex.sortOrder,
    sets_data: (ex.setsData ?? []).map((s) => ({ reps: s.reps, load_kg: s.loadKg })),
  }));

  // Upsert on the composite unique key — idempotent under concurrent mutations.
  // Never delete: onChange only sends exercises modified in the current modal session,
  // not all exercises for the session, so deleting "unlisted" rows would wipe previously
  // saved exercises that the user simply didn't touch this time.
  const { data, error } = await supabase
    .from('strength_session_exercises')
    .upsert(upsertRows, { onConflict: 'session_id,variant_exercise_id' })
    .select(
      'id, session_id, variant_exercise_id, actual_reps, load_kg, progression, notes, sort_order, created_at, sets_data',
    );
  if (error) throw error;

  return (data ?? []).map((r) => toStrengthSessionExercise(r as Record<string, unknown>));
}

// ---------------------------------------------------------------------------
// Pre-fill: last session exercises per variant
// ---------------------------------------------------------------------------

export async function fetchLastSessionExercises(
  athleteId: string,
  exerciseIds: string[],
): Promise<{ data: Record<string, StrengthSessionExercise>; date: string | null }> {
  if (isMockMode) return mockFetchLastSessionExercises(athleteId, exerciseIds);

  const { data, error } = await supabase.rpc('get_last_session_exercises', {
    p_athlete_id: athleteId,
    p_exercise_ids: exerciseIds,
  });
  if (error) throw error;

  const result: Record<string, StrengthSessionExercise> = {};
  let lastDate: string | null = null;

  for (const row of data ?? []) {
    const r = row as Record<string, unknown>;
    const exerciseId = r.variant_exercise_id as string;
    result[exerciseId] = toStrengthSessionExercise({
      id: `prefill-${exerciseId}`,
      session_id: '',
      variant_exercise_id: exerciseId,
      actual_reps: r.actual_reps,
      load_kg: r.load_kg,
      sets_data: r.sets_data,
      progression: r.progression,
      notes: null,
      sort_order: 0,
      created_at: r.completed_at,
    });
    const rowDate = r.last_session_date as string | null;
    if (rowDate && (!lastDate || rowDate > lastDate)) lastDate = rowDate;
  }

  return { data: result, date: lastDate };
}

// ---------------------------------------------------------------------------
// Progress logs for chart
// ---------------------------------------------------------------------------

export async function fetchVariantProgressLogs(
  variantId: string,
  athleteId: string,
): Promise<ProgressLog[]> {
  if (isMockMode) return mockFetchVariantProgressLogs(variantId, athleteId);

  const { data, error } = await supabase
    .from('strength_session_exercises')
    .select(
      `id,
       session_id,
       variant_exercise_id,
       actual_reps,
       load_kg,
       progression,
       sort_order,
       created_at,
       training_sessions!inner(
         id,
         completed_at,
         is_completed,
         week_plans!inner(athlete_id)
       ),
       strength_variant_exercises!inner(
         id,
         name,
         sets
       )`,
    )
    .eq('training_sessions.is_completed', true)
    .eq('training_sessions.week_plans.athlete_id', athleteId)
    .eq('strength_variant_exercises.variant_id', variantId);
  if (error) throw error;

  const logs = (data ?? [])
    .map((row) => {
      const r = row as Record<string, unknown>;
      const ts = r.training_sessions as Record<string, unknown>;
      const sve = r.strength_variant_exercises as Record<string, unknown>;
      return {
        id: r.id as string,
        sessionId: r.session_id as string,
        sessionDate: ((ts.completed_at as string) ?? '').split('T')[0],
        exerciseId: r.variant_exercise_id as string,
        exerciseName: sve.name as string,
        actualReps: r.actual_reps as number | null,
        loadKg: r.load_kg != null ? Number(r.load_kg) : null,
        progression: r.progression as ProgressionIntent | null,
        sets: sve.sets as number,
      };
    })
    .sort((a, b) => a.sessionDate.localeCompare(b.sessionDate));

  // Deduplicate defensively — the unique constraint makes true duplicates impossible,
  // but guard against any historical data written before the constraint was added.
  const seen = new Set<string>();
  return logs.filter((log) => {
    const key = `${log.sessionId}-${log.exerciseId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
