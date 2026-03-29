import { describe, it, expect } from 'vitest';
import type { PerSetRep } from '~/types/training';

// ---------------------------------------------------------------------------
// Pure reimplementations of private helpers from strength-variants.ts
// These mirror the exact logic so we can unit-test the parsing and
// serialization without needing to export internal functions.
// ---------------------------------------------------------------------------

/** Mirrors `parsePerSetReps` in strength-variants.ts */
function parsePerSetReps(raw: unknown): PerSetRep[] | null {
  if (!Array.isArray(raw)) return null;
  return raw.map((entry: Record<string, unknown>) => ({
    repsMin: Number(entry.reps_min ?? entry.repsMin ?? 0),
    repsMax: Number(entry.reps_max ?? entry.repsMax ?? 0),
  }));
}

/** Mirrors the `toRow` serialization of `per_set_reps` */
function serializePerSetReps(
  perSetReps: PerSetRep[] | null,
): { reps_min: number; reps_max: number }[] | null {
  return perSetReps
    ? perSetReps.map((r) => ({ reps_min: r.repsMin, reps_max: r.repsMax }))
    : null;
}

// ---------------------------------------------------------------------------
// Pure reimplementations of VariantForm.tsx logic
// ---------------------------------------------------------------------------

/** Mirrors the sync logic inside `handleExerciseChange` */
function syncPerSetReps(
  perSetReps: PerSetRep[] | null,
  newSets: number,
  fallbackRepsMin: number,
  fallbackRepsMax: number,
): PerSetRep[] | null {
  if (!perSetReps) return null;
  const arr = [...perSetReps];
  if (arr.length < newSets) {
    const last = arr[arr.length - 1] ?? { repsMin: fallbackRepsMin, repsMax: fallbackRepsMax };
    while (arr.length < newSets) arr.push({ ...last });
  } else if (arr.length > newSets) {
    arr.length = newSets;
  }
  return arr;
}

/** Mirrors `enablePerSet` in ExerciseFields */
function enablePerSet(sets: number, repsMin: number, repsMax: number): PerSetRep[] {
  return Array.from({ length: sets }, () => ({ repsMin, repsMax }));
}

/** Mirrors `disablePerSet` in ExerciseFields */
function disablePerSet(
  perSetReps: PerSetRep[] | null,
  fallbackRepsMin: number,
  fallbackRepsMax: number,
): { repsMin: number; repsMax: number; perSetReps: null } {
  const first = perSetReps?.[0];
  return {
    repsMin: first?.repsMin ?? fallbackRepsMin,
    repsMax: first?.repsMax ?? fallbackRepsMax,
    perSetReps: null,
  };
}

// ===========================================================================
// Tests
// ===========================================================================

describe('parsePerSetReps', () => {
  it('returns null for null input', () => {
    expect(parsePerSetReps(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(parsePerSetReps(undefined)).toBeNull();
  });

  it('returns null for a string input', () => {
    expect(parsePerSetReps('not-an-array')).toBeNull();
  });

  it('returns null for a number input', () => {
    expect(parsePerSetReps(42)).toBeNull();
  });

  it('returns null for a plain object input', () => {
    expect(parsePerSetReps({ reps_min: 8, reps_max: 12 })).toBeNull();
  });

  it('parses snake_case keys (reps_min, reps_max)', () => {
    const raw = [
      { reps_min: 10, reps_max: 12 },
      { reps_min: 8, reps_max: 10 },
    ];
    expect(parsePerSetReps(raw)).toEqual([
      { repsMin: 10, repsMax: 12 },
      { repsMin: 8, repsMax: 10 },
    ]);
  });

  it('parses camelCase keys (repsMin, repsMax) as fallback', () => {
    const raw = [
      { repsMin: 6, repsMax: 8 },
      { repsMin: 4, repsMax: 6 },
    ];
    expect(parsePerSetReps(raw)).toEqual([
      { repsMin: 6, repsMax: 8 },
      { repsMin: 4, repsMax: 6 },
    ]);
  });

  it('prefers snake_case when both key styles exist', () => {
    const raw = [{ reps_min: 10, reps_max: 12, repsMin: 99, repsMax: 99 }];
    expect(parsePerSetReps(raw)).toEqual([{ repsMin: 10, repsMax: 12 }]);
  });

  it('defaults to 0 when both key styles are absent', () => {
    const raw = [{}];
    expect(parsePerSetReps(raw)).toEqual([{ repsMin: 0, repsMax: 0 }]);
  });

  it('returns an empty array for an empty input array', () => {
    expect(parsePerSetReps([])).toEqual([]);
  });
});

describe('syncPerSetReps — array length sync with set count', () => {
  const a: PerSetRep = { repsMin: 10, repsMax: 12 };
  const b: PerSetRep = { repsMin: 8, repsMax: 10 };
  const c: PerSetRep = { repsMin: 6, repsMax: 8 };
  const d: PerSetRep = { repsMin: 5, repsMax: 6 };
  const e: PerSetRep = { repsMin: 4, repsMax: 5 };

  it('pads with last entry when sets increases (3 → 5)', () => {
    const result = syncPerSetReps([a, b, c], 5, 8, 12);
    expect(result).toEqual([a, b, c, c, c]);
  });

  it('truncates when sets decreases (5 → 3)', () => {
    const result = syncPerSetReps([a, b, c, d, e], 3, 8, 12);
    expect(result).toEqual([a, b, c]);
  });

  it('keeps null when perSetReps is null', () => {
    const result = syncPerSetReps(null, 5, 8, 12);
    expect(result).toBeNull();
  });

  it('does nothing when length already matches', () => {
    const result = syncPerSetReps([a, b, c], 3, 8, 12);
    expect(result).toEqual([a, b, c]);
  });

  it('uses fallback when array is empty and sets increases', () => {
    const result = syncPerSetReps([], 2, 8, 12);
    expect(result).toEqual([
      { repsMin: 8, repsMax: 12 },
      { repsMin: 8, repsMax: 12 },
    ]);
  });

  it('padded entries are independent copies (no shared references)', () => {
    const result = syncPerSetReps([a], 3, 8, 12)!;
    result[1].repsMin = 999;
    expect(result[2].repsMin).not.toBe(999);
  });
});

describe('enable/disable per-set mode', () => {
  it('enable: fills perSetReps from uniform repsMin/repsMax', () => {
    const result = enablePerSet(3, 8, 12);
    expect(result).toEqual([
      { repsMin: 8, repsMax: 12 },
      { repsMin: 8, repsMax: 12 },
      { repsMin: 8, repsMax: 12 },
    ]);
  });

  it('enable: creates entries equal to set count', () => {
    const result = enablePerSet(5, 10, 10);
    expect(result).toHaveLength(5);
  });

  it('enable: each entry is an independent object', () => {
    const result = enablePerSet(3, 8, 12);
    result[0].repsMin = 999;
    expect(result[1].repsMin).toBe(8);
  });

  it('disable: takes first set values as new uniform reps', () => {
    const perSetReps: PerSetRep[] = [
      { repsMin: 12, repsMax: 12 },
      { repsMin: 10, repsMax: 10 },
      { repsMin: 8, repsMax: 8 },
    ];
    const result = disablePerSet(perSetReps, 8, 12);
    expect(result).toEqual({
      repsMin: 12,
      repsMax: 12,
      perSetReps: null,
    });
  });

  it('disable: falls back to uniform values when perSetReps is null', () => {
    const result = disablePerSet(null, 8, 12);
    expect(result).toEqual({
      repsMin: 8,
      repsMax: 12,
      perSetReps: null,
    });
  });

  it('disable: falls back to uniform values when perSetReps is empty', () => {
    const result = disablePerSet([], 6, 10);
    expect(result).toEqual({
      repsMin: 6,
      repsMax: 10,
      perSetReps: null,
    });
  });
});

describe('serialization round-trip', () => {
  it('serialize then parse returns original PerSetRep array', () => {
    const original: PerSetRep[] = [
      { repsMin: 12, repsMax: 12 },
      { repsMin: 10, repsMax: 10 },
      { repsMin: 8, repsMax: 8 },
    ];
    const serialized = serializePerSetReps(original);
    const parsed = parsePerSetReps(serialized);
    expect(parsed).toEqual(original);
  });

  it('null round-trips correctly', () => {
    const serialized = serializePerSetReps(null);
    expect(serialized).toBeNull();
    const parsed = parsePerSetReps(serialized);
    expect(parsed).toBeNull();
  });

  it('serialized format uses snake_case keys', () => {
    const input: PerSetRep[] = [{ repsMin: 8, repsMax: 12 }];
    const serialized = serializePerSetReps(input);
    expect(serialized).toEqual([{ reps_min: 8, reps_max: 12 }]);
  });

  it('empty array round-trips correctly', () => {
    const original: PerSetRep[] = [];
    const serialized = serializePerSetReps(original);
    const parsed = parsePerSetReps(serialized);
    expect(parsed).toEqual([]);
  });

  it('multi-entry round-trip preserves order and values', () => {
    const original: PerSetRep[] = [
      { repsMin: 15, repsMax: 20 },
      { repsMin: 12, repsMax: 15 },
      { repsMin: 10, repsMax: 12 },
      { repsMin: 8, repsMax: 10 },
      { repsMin: 6, repsMax: 8 },
    ];
    const parsed = parsePerSetReps(serializePerSetReps(original));
    expect(parsed).toEqual(original);
  });
});
