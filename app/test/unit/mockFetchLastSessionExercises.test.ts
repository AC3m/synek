import { describe, expect, it } from 'vitest';
import { mockFetchLastSessionExercises } from '~/lib/mock-data/strength-variants';

describe('mockFetchLastSessionExercises', () => {
  it('only returns completed sessions strictly before beforeDate', async () => {
    const result = await mockFetchLastSessionExercises(
      'athlete-1',
      ['sve-pullups', 'sve-bb-row'],
      '2026-03-03',
    );

    expect(result.date).toBeNull();
    expect(result.data).toEqual({});
  });

  it('returns the latest eligible session before the cutoff date', async () => {
    const result = await mockFetchLastSessionExercises(
      'athlete-1',
      ['sve-pullups', 'sve-bb-row'],
      '2026-03-05',
    );

    expect(result.date?.split('T')[0]).toBe('2026-03-03');
  });
});
