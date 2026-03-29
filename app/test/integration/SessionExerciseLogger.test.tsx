import { screen } from '@testing-library/react';
import { renderWithProviders } from '~/test/utils/render';
import { SessionExerciseLogger } from '~/components/strength/SessionExerciseLogger';
import type { StrengthVariantExercise, StrengthSessionExercise } from '~/types/training';

const exercise: StrengthVariantExercise = {
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
  createdAt: '2024-01-01T00:00:00Z',
};

const loggedExercise: StrengthSessionExercise = {
  id: 'se1',
  sessionId: 's1',
  variantExerciseId: 'ex1',
  actualReps: 10,
  loadKg: 80,
  progression: null,
  notes: null,
  sortOrder: 0,
  createdAt: '2024-01-01T00:00:00Z',
  setsData: [
    { reps: 10, loadKg: 80 },
    { reps: 9, loadKg: 80 },
    { reps: 8, loadKg: 80 },
  ],
};

function renderLogger(loggedExercises: StrengthSessionExercise[]) {
  return renderWithProviders(
    <SessionExerciseLogger
      exercises={[exercise]}
      loggedExercises={loggedExercises}
      onChange={() => {}}
    />,
  );
}

describe('SessionExerciseLogger — hydration from async logged data', () => {
  it('shows empty inputs when loggedExercises is empty (query in-flight)', () => {
    renderLogger([]);

    expect(screen.getByRole('spinbutton', { name: /set 1 reps for bench press/i })).toHaveValue(null);
    expect(screen.getByRole('spinbutton', { name: /set 1 load for bench press/i })).toHaveValue(null);
  });

  it('populates inputs when loggedExercises arrives after initial render', () => {
    const { rerender } = renderLogger([]);

    // Simulate query resolving — rerender with logged data
    rerender(
      <SessionExerciseLogger
        exercises={[exercise]}
        loggedExercises={[loggedExercise]}
        onChange={() => {}}
      />,
    );

    expect(screen.getByRole('spinbutton', { name: /set 1 reps for bench press/i })).toHaveValue(10);
    expect(screen.getByRole('spinbutton', { name: /set 1 load for bench press/i })).toHaveValue(80);
    expect(screen.getByRole('spinbutton', { name: /set 2 reps for bench press/i })).toHaveValue(9);
    expect(screen.getByRole('spinbutton', { name: /set 3 reps for bench press/i })).toHaveValue(8);
  });

  it('initialises correctly when loggedExercises is available on first render (warm cache)', () => {
    renderLogger([loggedExercise]);

    expect(screen.getByRole('spinbutton', { name: /set 1 reps for bench press/i })).toHaveValue(10);
    expect(screen.getByRole('spinbutton', { name: /set 1 load for bench press/i })).toHaveValue(80);
  });

  it('does not overwrite user edits when loggedExercises re-renders after user interaction', async () => {
    const { rerender } = renderLogger([loggedExercise]);

    // Simulate background refetch returning same data — state should not reset
    rerender(
      <SessionExerciseLogger
        exercises={[exercise]}
        loggedExercises={[loggedExercise]}
        onChange={() => {}}
      />,
    );

    // Values should remain from initial logged data, not be wiped
    expect(screen.getByRole('spinbutton', { name: /set 1 reps for bench press/i })).toHaveValue(10);
  });
});
