import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '~/lib/queries/keys';
import {
  fetchStrengthVariants,
  fetchStrengthVariant,
  createStrengthVariant,
  updateStrengthVariant,
  deleteStrengthVariant,
  upsertVariantExercises,
  fetchStrengthSessionExercises,
  upsertSessionExercises,
  fetchLastSessionExercises,
  fetchVariantProgressLogs,
} from '~/lib/queries/strength-variants';
import type {
  StrengthVariant,
  StrengthVariantExercise,
  StrengthSessionExercise,
  ProgressLog,
  CreateStrengthVariantInput,
  UpdateStrengthVariantInput,
  UpsertVariantExercisesInput,
  UpsertSessionExercisesInput,
} from '~/types/training';

const keys = queryKeys.strengthVariants;

// ---------------------------------------------------------------------------
// Read hooks
// ---------------------------------------------------------------------------

export function useStrengthVariants(userId: string) {
  return useQuery({
    queryKey: keys.lists(userId),
    queryFn: () => fetchStrengthVariants(userId),
    enabled: !!userId,
  });
}

export function useStrengthVariant(id: string) {
  return useQuery({
    queryKey: keys.byId(id),
    queryFn: () => fetchStrengthVariant(id),
    enabled: !!id,
  });
}

export function useStrengthSessionExercises(sessionId: string) {
  return useQuery({
    queryKey: keys.sessionExercises(sessionId),
    queryFn: () => fetchStrengthSessionExercises(sessionId),
    enabled: !!sessionId,
  });
}

export function useLastSessionExercises(athleteId: string, exerciseIds: string[]) {
  return useQuery({
    queryKey: keys.lastSession(athleteId, exerciseIds),
    queryFn: () => fetchLastSessionExercises(athleteId, exerciseIds),
    enabled: athleteId.length > 0 && exerciseIds.length > 0,
  });
}

export function useVariantProgressLogs(variantId: string, athleteId: string) {
  return useQuery({
    queryKey: keys.progressLogs(variantId, athleteId),
    queryFn: () => fetchVariantProgressLogs(variantId, athleteId),
    enabled: !!variantId && !!athleteId,
  });
}

// ---------------------------------------------------------------------------
// Mutation: create variant
// ---------------------------------------------------------------------------

export function useCreateStrengthVariant(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateStrengthVariantInput) => createStrengthVariant(userId, input),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: keys.lists(userId) });
      const prev = qc.getQueryData<StrengthVariant[]>(keys.lists(userId));
      const optimistic: StrengthVariant = {
        id: `optimistic-${Date.now()}`,
        userId,
        name: input.name,
        description: input.description ?? null,
        exercises: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      qc.setQueryData<StrengthVariant[]>(keys.lists(userId), (old) => [optimistic, ...(old ?? [])]);
      return { prev };
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.prev !== undefined) qc.setQueryData(keys.lists(userId), ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: keys.lists(userId) });
    },
  });
}

// ---------------------------------------------------------------------------
// Mutation: update variant
// ---------------------------------------------------------------------------

export function useUpdateStrengthVariant(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateStrengthVariantInput) => updateStrengthVariant(input),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: keys.byId(input.id) });
      const prev = qc.getQueryData<StrengthVariant>(keys.byId(input.id));
      if (prev) {
        qc.setQueryData<StrengthVariant>(keys.byId(input.id), {
          ...prev,
          ...(input.name !== undefined && { name: input.name }),
          ...(input.description !== undefined && { description: input.description }),
        });
      }
      return { prev };
    },
    onError: (_err, input, ctx) => {
      if (ctx?.prev !== undefined) qc.setQueryData(keys.byId(input.id), ctx.prev);
    },
    onSettled: (_data, _err, input) => {
      qc.invalidateQueries({ queryKey: keys.byId(input.id) });
      qc.invalidateQueries({ queryKey: keys.lists(userId) });
    },
  });
}

// ---------------------------------------------------------------------------
// Mutation: delete variant
// ---------------------------------------------------------------------------

export function useDeleteStrengthVariant(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteStrengthVariant(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: keys.lists(userId) });
      const prev = qc.getQueryData<StrengthVariant[]>(keys.lists(userId));
      qc.setQueryData<StrengthVariant[]>(keys.lists(userId), (old) =>
        (old ?? []).filter((v) => v.id !== id),
      );
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev !== undefined) qc.setQueryData(keys.lists(userId), ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: keys.lists(userId) });
    },
  });
}

// ---------------------------------------------------------------------------
// Mutation: upsert variant exercises
// ---------------------------------------------------------------------------

export function useUpsertVariantExercises(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertVariantExercisesInput) => upsertVariantExercises(input),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: keys.byId(input.variantId) });
      const prev = qc.getQueryData<StrengthVariant>(keys.byId(input.variantId));
      if (prev) {
        const optimisticExercises: StrengthVariantExercise[] = input.exercises.map((ex) => ({
          id: ex.id ?? `optimistic-ex-${Date.now()}-${ex.sortOrder}`,
          variantId: input.variantId,
          name: ex.name,
          videoUrl: ex.videoUrl ?? null,
          sets: ex.sets,
          repsMin: ex.repsMin,
          repsMax: ex.repsMax,
          loadUnit: ex.loadUnit ?? 'kg',
          sortOrder: ex.sortOrder,
          supersetGroup: ex.supersetGroup ?? null,
          perSetReps: ex.perSetReps ?? null,
          createdAt: prev.createdAt,
        }));
        qc.setQueryData<StrengthVariant>(keys.byId(input.variantId), {
          ...prev,
          exercises: optimisticExercises,
        });
      }
      return { prev };
    },
    onError: (_err, input, ctx) => {
      if (ctx?.prev !== undefined) qc.setQueryData(keys.byId(input.variantId), ctx.prev);
    },
    onSettled: (_data, _err, input) => {
      qc.invalidateQueries({ queryKey: keys.byId(input.variantId) });
      qc.invalidateQueries({ queryKey: keys.lists(userId) });
    },
  });
}

// ---------------------------------------------------------------------------
// Mutation: upsert session exercises
// ---------------------------------------------------------------------------

export function useUpsertSessionExercises() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertSessionExercisesInput) => upsertSessionExercises(input),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: keys.sessionExercises(input.sessionId) });
      const prev = qc.getQueryData<StrengthSessionExercise[]>(
        keys.sessionExercises(input.sessionId),
      );
      const optimisticMap = new Map(
        input.exercises.map((ex) => [
          ex.variantExerciseId,
          {
            id: `optimistic-${ex.variantExerciseId}`,
            sessionId: input.sessionId,
            variantExerciseId: ex.variantExerciseId,
            actualReps: ex.actualReps ?? null,
            loadKg: ex.loadKg ?? null,
            progression: ex.progression ?? null,
            notes: ex.notes ?? null,
            sortOrder: ex.sortOrder,
            createdAt: new Date().toISOString(),
            setsData: ex.setsData ?? [],
          } satisfies StrengthSessionExercise,
        ]),
      );
      qc.setQueryData<StrengthSessionExercise[]>(keys.sessionExercises(input.sessionId), (old) => {
        // Merge: update existing rows in-place, append genuinely new ones.
        // Do NOT replace the entire array — onChange only sends exercises modified
        // in the current modal session, so replacing would wipe previously saved rows.
        const existing = old ?? [];
        const merged = existing.map((e) =>
          e.variantExerciseId && optimisticMap.has(e.variantExerciseId)
            ? optimisticMap.get(e.variantExerciseId)!
            : e,
        );
        for (const o of optimisticMap.values()) {
          if (!existing.some((e) => e.variantExerciseId === o.variantExerciseId)) {
            merged.push(o);
          }
        }
        return merged;
      });
      return { prev };
    },
    onError: (_err, input, ctx) => {
      if (ctx?.prev !== undefined)
        qc.setQueryData(keys.sessionExercises(input.sessionId), ctx.prev);
    },
    onSettled: (_data, _err, input) => {
      qc.invalidateQueries({ queryKey: keys.sessionExercises(input.sessionId) });
    },
  });
}
