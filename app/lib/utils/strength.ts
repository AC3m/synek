import type { StrengthSessionExercise, StrengthVariantExercise } from '~/types/training';

// ---------------------------------------------------------------------------
// Shared set state — used by SessionExerciseLogger and computePrefillSets
// ---------------------------------------------------------------------------

export interface SetState {
  reps: string;
  load: string;
  isPreFilled: boolean;
}

// ---------------------------------------------------------------------------
// Pre-fill computation — pure utility, called once at session open
// ---------------------------------------------------------------------------

/**
 * Computes the suggested set values for the next session.
 * Only called when the exercise has no existing logged data.
 *
 * @param prefill  Last completed session exercise data
 * @param exercise Variant exercise with optional progressionIncrement
 * @returns        Array of SetState (isPreFilled = true for all entries)
 */
export function computePrefillSets(
  prefill: StrengthSessionExercise,
  exercise: StrengthVariantExercise,
): SetState[] {
  const increment = exercise.progressionIncrement ?? 0;
  const loadDelta =
    prefill.progression === 'up'
      ? increment
      : prefill.progression === 'down'
        ? -increment
        : 0;

  return Array.from({ length: exercise.sets }, (_, i) => {
    const prevLoad = prefill.setsData?.[i]?.loadKg ?? prefill.loadKg;
    const prevReps = prefill.setsData?.[i]?.reps ?? prefill.actualReps;
    const newLoad = prevLoad != null ? Math.max(0, prevLoad + loadDelta) : null;

    return {
      reps: prevReps?.toString() ?? '',
      load: newLoad?.toString() ?? '',
      isPreFilled: true,
    };
  });
}

// ---------------------------------------------------------------------------
// Superset color palette — keyed by group ID, cycling if > 5 groups
// Used in SessionExerciseLogger and VariantExerciseList
// ---------------------------------------------------------------------------

export const SUPERSET_COLORS = [
  {
    container: 'border-orange-200',
    header: 'bg-orange-50  dark:bg-orange-950/20  border-b border-orange-200',
    label: 'text-orange-600',
  },
  {
    container: 'border-violet-200',
    header: 'bg-violet-50  dark:bg-violet-950/20  border-b border-violet-200',
    label: 'text-violet-600',
  },
  {
    container: 'border-emerald-200',
    header: 'bg-emerald-50 dark:bg-emerald-950/20 border-b border-emerald-200',
    label: 'text-emerald-600',
  },
  {
    container: 'border-rose-200',
    header: 'bg-rose-50    dark:bg-rose-950/20    border-b border-rose-200',
    label: 'text-rose-600',
  },
  {
    container: 'border-sky-200',
    header: 'bg-sky-50     dark:bg-sky-950/20     border-b border-sky-200',
    label: 'text-sky-600',
  },
] as const;

export function getSupersetColor(groupId: number) {
  return SUPERSET_COLORS[(groupId - 1) % SUPERSET_COLORS.length];
}

// ---------------------------------------------------------------------------
// Helpers shared between SessionExerciseLogger and VariantExerciseList
// ---------------------------------------------------------------------------

export function formatRepsTarget(repsMin: number, repsMax: number): string {
  return repsMin === repsMax ? `${repsMin}` : `${repsMin}–${repsMax}`;
}

export function groupExercises<T extends { supersetGroup: number | null }>(exercises: T[]): T[][] {
  const result: T[][] = [];
  let i = 0;
  while (i < exercises.length) {
    const ex = exercises[i];
    if (ex.supersetGroup === null) {
      result.push([ex]);
      i++;
    } else {
      const group: T[] = [ex];
      while (i + 1 < exercises.length && exercises[i + 1].supersetGroup === ex.supersetGroup) {
        i++;
        group.push(exercises[i]);
      }
      result.push(group);
      i++;
    }
  }
  return result;
}
