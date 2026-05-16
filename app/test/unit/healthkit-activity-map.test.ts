import { describe, expect, it } from 'vitest';
import {
  hkActivityToTrainingType,
  trainingTypeMatchesHk,
} from '~/lib/utils/healthkit-activity-map';

describe('hkActivityToTrainingType', () => {
  it.each([
    ['run', 'run'],
    ['walk', 'walk'],
    ['hike', 'hike'],
    ['bike', 'cycling'],
    ['swim', 'swimming'],
    ['elliptical', 'elliptical'],
    ['strength', 'strength'],
    ['yoga', 'yoga'],
  ] as const)('maps HK %s → training_type %s', (hk, expected) => {
    expect(hkActivityToTrainingType(hk)).toBe(expected);
  });

  it.each(['row', 'mixed-cardio', 'hiit', 'other', 'unknown-future-id'])(
    'falls back to "other" for %s',
    (id) => {
      expect(hkActivityToTrainingType(id)).toBe('other');
    },
  );
});

describe('trainingTypeMatchesHk', () => {
  it('matches when mapped training type equals session type', () => {
    expect(trainingTypeMatchesHk('run', 'run')).toBe(true);
    expect(trainingTypeMatchesHk('cycling', 'bike')).toBe(true);
    expect(trainingTypeMatchesHk('swimming', 'swim')).toBe(true);
  });

  it('does not match incompatible types', () => {
    expect(trainingTypeMatchesHk('run', 'bike')).toBe(false);
    expect(trainingTypeMatchesHk('strength', 'yoga')).toBe(false);
  });

  it('does not auto-link when either side resolves to "other"', () => {
    expect(trainingTypeMatchesHk('other', 'run')).toBe(false);
    expect(trainingTypeMatchesHk('run', 'hiit')).toBe(false);
    expect(trainingTypeMatchesHk('other', 'hiit')).toBe(false);
  });
});
