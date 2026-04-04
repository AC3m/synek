import { describe, it, expect } from 'vitest';
import { computePrefillSets } from '~/lib/utils/strength';
import type { StrengthSessionExercise, StrengthVariantExercise } from '~/types/training';

function makeExercise(overrides: Partial<StrengthVariantExercise> = {}): StrengthVariantExercise {
  return {
    id: 'ex1',
    variantId: 'v1',
    name: 'Bench Press',
    videoUrl: null,
    sets: 3,
    repsMin: 8,
    repsMax: 12,
    perSetReps: null,
    loadUnit: 'kg',
    sortOrder: 0,
    supersetGroup: null,
    progressionIncrement: 2.5,
    createdAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

function makePrefill(overrides: Partial<StrengthSessionExercise> = {}): StrengthSessionExercise {
  return {
    id: 'se1',
    sessionId: 's1',
    variantExerciseId: 'ex1',
    actualReps: 10,
    loadKg: 80,
    progression: 'up',
    notes: null,
    sortOrder: 0,
    createdAt: '2024-01-01T00:00:00Z',
    setsData: [
      { reps: 10, loadKg: 80 },
      { reps: 9, loadKg: 75 },
      { reps: 8, loadKg: 75 },
    ],
    ...overrides,
  };
}

describe('computePrefillSets', () => {
  describe('progression: up', () => {
    it('applies positive load delta when intent is up', () => {
      const result = computePrefillSets(makePrefill({ progression: 'up' }), makeExercise({ progressionIncrement: 2.5 }));
      expect(result[0].load).toBe('82.5');
    });

    it('applies delta per-set when setsData is present', () => {
      const result = computePrefillSets(makePrefill({ progression: 'up' }), makeExercise({ progressionIncrement: 2.5 }));
      expect(result[0].load).toBe('82.5'); // 80 + 2.5
      expect(result[1].load).toBe('77.5'); // 75 + 2.5
      expect(result[2].load).toBe('77.5'); // 75 + 2.5
    });

    it('falls back to topSet load when setsData is empty', () => {
      const result = computePrefillSets(
        makePrefill({ progression: 'up', setsData: [] }),
        makeExercise({ progressionIncrement: 2.5 }),
      );
      // Falls back to prefill.loadKg (80) + 2.5 = 82.5
      expect(result[0].load).toBe('82.5');
      expect(result[1].load).toBe('82.5');
      expect(result[2].load).toBe('82.5');
    });

    it('falls back to topSet reps when setsData is empty', () => {
      const result = computePrefillSets(
        makePrefill({ progression: 'up', actualReps: 10, setsData: [] }),
        makeExercise({ progressionIncrement: 2.5 }),
      );
      expect(result[0].reps).toBe('10');
      expect(result[1].reps).toBe('10');
    });
  });

  describe('progression: down', () => {
    it('applies negative load delta when intent is down', () => {
      const result = computePrefillSets(
        makePrefill({ progression: 'down' }),
        makeExercise({ progressionIncrement: 2.5 }),
      );
      expect(result[0].load).toBe('77.5'); // 80 - 2.5
    });

    it('floors load at 0 when delta would go negative', () => {
      const result = computePrefillSets(
        makePrefill({ progression: 'down', setsData: [{ reps: 10, loadKg: 2 }, { reps: 9, loadKg: 2 }, { reps: 8, loadKg: 2 }] }),
        makeExercise({ progressionIncrement: 5 }),
      );
      // 2 - 5 = -3, floored to 0
      expect(result[0].load).toBe('0');
    });
  });

  describe('progression: maintain', () => {
    it('preserves load unchanged when intent is maintain', () => {
      const result = computePrefillSets(
        makePrefill({ progression: 'maintain' }),
        makeExercise({ progressionIncrement: 2.5 }),
      );
      expect(result[0].load).toBe('80');
      expect(result[1].load).toBe('75');
    });
  });

  describe('progression: null', () => {
    it('preserves load unchanged when intent is null', () => {
      const result = computePrefillSets(
        makePrefill({ progression: null }),
        makeExercise({ progressionIncrement: 2.5 }),
      );
      expect(result[0].load).toBe('80');
    });
  });

  describe('no increment configured', () => {
    it('preserves load when progressionIncrement is null and intent is up', () => {
      const result = computePrefillSets(
        makePrefill({ progression: 'up' }),
        makeExercise({ progressionIncrement: null }),
      );
      expect(result[0].load).toBe('80');
    });

    it('preserves load when progressionIncrement is null and intent is down', () => {
      const result = computePrefillSets(
        makePrefill({ progression: 'down' }),
        makeExercise({ progressionIncrement: null }),
      );
      expect(result[0].load).toBe('80');
    });
  });

  describe('isPreFilled flag', () => {
    it('marks all returned SetState entries as isPreFilled: true', () => {
      const result = computePrefillSets(makePrefill(), makeExercise());
      expect(result.every((s) => s.isPreFilled === true)).toBe(true);
    });
  });

  describe('missing data handling', () => {
    it('returns empty string for reps when actualReps is null', () => {
      const result = computePrefillSets(
        makePrefill({ actualReps: null, setsData: [] }),
        makeExercise(),
      );
      expect(result[0].reps).toBe('');
    });

    it('returns empty string for load when loadKg is null', () => {
      const result = computePrefillSets(
        makePrefill({ loadKg: null, setsData: [] }),
        makeExercise(),
      );
      expect(result[0].load).toBe('');
    });

    it('returns correct number of sets matching exercise.sets', () => {
      const result = computePrefillSets(makePrefill(), makeExercise({ sets: 4 }));
      expect(result).toHaveLength(4);
    });
  });
});
