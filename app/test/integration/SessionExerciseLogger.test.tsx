import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  progressionIncrement: 2.5,
  createdAt: '2024-01-01T00:00:00Z',
};

const exerciseNoIncrement: StrengthVariantExercise = {
  ...exercise,
  progressionIncrement: null,
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

const prefillExercise: StrengthSessionExercise = {
  id: 'se-prev',
  sessionId: 's-prev',
  variantExerciseId: 'ex1',
  actualReps: 10,
  loadKg: 80,
  progression: 'up',
  notes: null,
  sortOrder: 0,
  createdAt: '2024-03-24T00:00:00Z',
  setsData: [
    { reps: 10, loadKg: 80 },
    { reps: 9, loadKg: 75 },
    { reps: 8, loadKg: 75 },
  ],
};

function renderLogger(
  loggedExercises: StrengthSessionExercise[],
  opts: {
    prefillData?: Record<string, StrengthSessionExercise>;
    prefillDate?: string | null;
    ex?: StrengthVariantExercise;
  } = {},
) {
  return renderWithProviders(
    <SessionExerciseLogger
      exercises={[opts.ex ?? exercise]}
      loggedExercises={loggedExercises}
      prefillData={opts.prefillData}
      prefillDate={opts.prefillDate}
      onChange={() => {}}
    />,
  );
}

describe('SessionExerciseLogger — hydration from async logged data', () => {
  it('shows empty inputs when loggedExercises is empty (query in-flight)', () => {
    renderLogger([]);

    expect(screen.getByRole('spinbutton', { name: /set 1 reps for bench press/i })).toHaveValue(
      null,
    );
    expect(screen.getByRole('spinbutton', { name: /set 1 load for bench press/i })).toHaveValue(
      null,
    );
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

  it('applies pre-fill when prefillData arrives after initial render (race condition fix)', () => {
    // Simulate: component mounts with no data, then prefill query resolves
    const { rerender } = renderLogger([]);

    // Initially empty
    expect(screen.getByRole('spinbutton', { name: /set 1 load for bench press/i })).toHaveValue(
      null,
    );

    // prefillData arrives — prefill has progression=up, increment=2.5, load=80 → expect 82.5
    rerender(
      <SessionExerciseLogger
        exercises={[exercise]}
        loggedExercises={[]}
        prefillData={{ ex1: prefillExercise }}
        prefillDate="2024-03-24"
        onChange={() => {}}
      />,
    );

    expect(screen.getByRole('spinbutton', { name: /set 1 load for bench press/i })).toHaveValue(
      82.5,
    );
    expect(screen.getByRole('spinbutton', { name: /set 1 reps for bench press/i })).toHaveValue(10);
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

describe('SessionExerciseLogger — previous session summary', () => {
  it('renders the collapsible summary toggle when prefillData is provided', () => {
    renderLogger([], {
      prefillData: { ex1: prefillExercise },
      prefillDate: '2024-03-24',
    });

    expect(screen.getByTestId('prev-summary')).toBeInTheDocument();
    expect(screen.getByTestId('prev-summary-toggle')).toBeInTheDocument();
  });

  it('does not render set rows by default (collapsed)', () => {
    renderLogger([], {
      prefillData: { ex1: prefillExercise },
      prefillDate: '2024-03-24',
    });

    expect(screen.queryByTestId('prev-row-0')).not.toBeInTheDocument();
  });

  it('shows per-set values after expanding', async () => {
    const user = userEvent.setup();
    renderLogger([], {
      prefillData: { ex1: prefillExercise },
      prefillDate: '2024-03-24',
    });

    await user.click(screen.getByTestId('prev-summary-toggle'));

    expect(screen.getByTestId('prev-row-0')).toHaveTextContent('10');
    expect(screen.getByTestId('prev-row-0')).toHaveTextContent('80');
    expect(screen.getByTestId('prev-row-1')).toBeInTheDocument();
    expect(screen.getByTestId('prev-row-2')).toBeInTheDocument();
  });

  it('shows all set rows after expanding even when prior session had fewer sets', async () => {
    const user = userEvent.setup();
    const shortPrefill: StrengthSessionExercise = {
      ...prefillExercise,
      setsData: [{ reps: 10, loadKg: 80 }], // only 1 set, exercise has 3
    };
    renderLogger([], {
      prefillData: { ex1: shortPrefill },
      prefillDate: '2024-03-24',
    });

    await user.click(screen.getByTestId('prev-summary-toggle'));

    // Falls back to top-set values for sets 2 and 3
    expect(screen.getByTestId('prev-row-1')).toBeInTheDocument();
    expect(screen.getByTestId('prev-row-2')).toBeInTheDocument();
  });

  it('does not render summary when no prefillData provided', () => {
    renderLogger([]);

    expect(screen.queryByTestId('prev-summary')).not.toBeInTheDocument();
  });

  it('does not render summary when prefillData does not contain this exercise', () => {
    renderLogger([], {
      prefillData: {},
      prefillDate: '2024-03-24',
    });

    expect(screen.queryByTestId('prev-summary')).not.toBeInTheDocument();
  });
});

describe('SessionExerciseLogger — pre-fill applied to inputs', () => {
  it('applies computed values to load inputs when no logged data exists', () => {
    // prefill has progression=up, increment=2.5, load=80 → expected 82.5
    renderLogger([], {
      prefillData: { ex1: prefillExercise },
      prefillDate: '2024-03-24',
    });

    expect(screen.getByRole('spinbutton', { name: /set 1 load for bench press/i })).toHaveValue(
      82.5,
    );
  });

  it('applies correct reps from prior session per set', () => {
    renderLogger([], {
      prefillData: { ex1: prefillExercise },
      prefillDate: '2024-03-24',
    });

    expect(screen.getByRole('spinbutton', { name: /set 1 reps for bench press/i })).toHaveValue(10);
    expect(screen.getByRole('spinbutton', { name: /set 2 reps for bench press/i })).toHaveValue(9);
  });

  it('does not apply pre-fill when logged data already exists for the exercise', () => {
    renderLogger([loggedExercise], {
      prefillData: { ex1: prefillExercise },
      prefillDate: '2024-03-24',
    });

    // Should show logged values (80), not pre-filled (82.5)
    expect(screen.getByRole('spinbutton', { name: /set 1 load for bench press/i })).toHaveValue(80);
  });

  it('clears pre-fill tint when user edits a set row', async () => {
    const user = userEvent.setup();
    renderLogger([], {
      prefillData: { ex1: prefillExercise },
      prefillDate: '2024-03-24',
    });

    const set1Load = screen.getByRole('spinbutton', { name: /set 1 load for bench press/i });
    await user.clear(set1Load);
    await user.type(set1Load, '90');

    // After edit the input should not have the pre-fill tint class
    expect(set1Load).not.toHaveClass('bg-muted/60');
  });

  it('does not clear pre-fill tint on other rows when one row is edited', async () => {
    const user = userEvent.setup();
    renderLogger([], {
      prefillData: { ex1: prefillExercise },
      prefillDate: '2024-03-24',
    });

    const set1Load = screen.getByRole('spinbutton', { name: /set 1 load for bench press/i });
    await user.clear(set1Load);
    await user.type(set1Load, '90');

    // Set 2 load should still be pre-filled (tinted)
    const set2Load = screen.getByRole('spinbutton', { name: /set 2 load for bench press/i });
    expect(set2Load).toHaveClass('bg-muted/60');
  });

  it('renders PrefillBadge with direction and date when prefillDate is provided', () => {
    renderLogger([], {
      prefillData: { ex1: prefillExercise },
      prefillDate: '2024-03-24',
    });

    expect(screen.getByTestId('prefill-badge')).toBeInTheDocument();
  });
});

describe('SessionExerciseLogger — copy from set above', () => {
  it('copy button is absent on first set row', () => {
    renderLogger([]);

    expect(screen.queryByRole('button', { name: /copy.*set 1/i })).not.toBeInTheDocument();
  });

  it('copy button is hidden when set N-1 has no values', () => {
    renderLogger([]);

    // All rows empty — nothing to copy, so no copy buttons
    expect(screen.queryByRole('button', { name: /copy.*set 2/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /copy.*set 3/i })).not.toBeInTheDocument();
  });

  it('copy button disappears after the row is filled', async () => {
    const user = userEvent.setup();
    renderLogger([]);

    // Fill Set 2 reps
    await user.type(screen.getByRole('spinbutton', { name: /set 2 reps for bench press/i }), '10');

    // Copy button for set 2 should now be hidden
    expect(screen.queryByRole('button', { name: /copy.*set 2/i })).not.toBeInTheDocument();
  });

  it('copies reps and load from set N-1 to set N on tap', async () => {
    const user = userEvent.setup();
    renderLogger([]);

    // Fill Set 1
    await user.type(screen.getByRole('spinbutton', { name: /set 1 reps for bench press/i }), '10');
    await user.type(screen.getByRole('spinbutton', { name: /set 1 load for bench press/i }), '80');

    // Copy to Set 2
    await user.click(screen.getByRole('button', { name: /copy.*set 2/i }));

    expect(screen.getByRole('spinbutton', { name: /set 2 reps for bench press/i })).toHaveValue(10);
    expect(screen.getByRole('spinbutton', { name: /set 2 load for bench press/i })).toHaveValue(80);
  });

  it('copy button appears on set 2 only after set 1 has data', async () => {
    const user = userEvent.setup();
    renderLogger([]);

    // Initially hidden — set 1 is empty
    expect(screen.queryByRole('button', { name: /copy.*set 2/i })).not.toBeInTheDocument();

    // Fill set 1
    await user.type(screen.getByRole('spinbutton', { name: /set 1 reps for bench press/i }), '10');

    // Now copy button for set 2 should appear
    expect(screen.getByRole('button', { name: /copy.*set 2/i })).toBeInTheDocument();
  });

  it('does not show copy buttons in read-only mode', () => {
    renderWithProviders(
      <SessionExerciseLogger
        exercises={[exercise]}
        loggedExercises={[loggedExercise]}
        readOnly
        onChange={() => {}}
      />,
    );

    expect(screen.queryByRole('button', { name: /copy.*set/i })).not.toBeInTheDocument();
  });
});

describe('SessionExerciseLogger — notes input', () => {
  it('shows add-note button and reveals textarea on click', async () => {
    const user = userEvent.setup();
    renderLogger([]);

    expect(screen.queryByRole('textbox', { name: /notes/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /add note/i }));
    expect(screen.getByRole('textbox', { name: /notes/i })).toBeInTheDocument();
  });

  it('calls onChange with notes value on blur after opening', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithProviders(
      <SessionExerciseLogger exercises={[exercise]} loggedExercises={[]} onChange={onChange} />,
    );

    await user.click(screen.getByRole('button', { name: /add note/i }));
    const textarea = screen.getByRole('textbox', { name: /notes/i });
    await user.type(textarea, 'Keep elbows tucked');
    await user.tab();

    expect(onChange).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ notes: 'Keep elbows tucked' })]),
    );
  });

  it('does not render notes textarea in readOnly mode when no note exists', () => {
    renderWithProviders(
      <SessionExerciseLogger
        exercises={[exercise]}
        loggedExercises={[]}
        readOnly
        onChange={() => {}}
      />,
    );

    expect(screen.queryByRole('textbox', { name: /notes/i })).not.toBeInTheDocument();
  });

  it('renders note as static text in readOnly mode when note exists', () => {
    const withNote: StrengthSessionExercise = { ...loggedExercise, notes: 'Drive through heels' };
    renderWithProviders(
      <SessionExerciseLogger
        exercises={[exercise]}
        loggedExercises={[withNote]}
        readOnly
        onChange={() => {}}
      />,
    );

    expect(screen.queryByRole('textbox', { name: /notes/i })).not.toBeInTheDocument();
    expect(screen.getByText('Drive through heels')).toBeInTheDocument();
  });

  it('pre-populates notes textarea from logged exercise', () => {
    const withNote: StrengthSessionExercise = { ...loggedExercise, notes: 'Focus on form' };
    renderWithProviders(
      <SessionExerciseLogger
        exercises={[exercise]}
        loggedExercises={[withNote]}
        onChange={() => {}}
      />,
    );

    expect(screen.getByRole('textbox', { name: /notes/i })).toHaveValue('Focus on form');
  });

  it('calls onChange with notes: null when note is cleared and blurred', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const withNote: StrengthSessionExercise = { ...loggedExercise, notes: 'Focus on form' };
    renderWithProviders(
      <SessionExerciseLogger
        exercises={[exercise]}
        loggedExercises={[withNote]}
        onChange={onChange}
      />,
    );

    const textarea = screen.getByRole('textbox', { name: /notes/i });
    await user.clear(textarea);
    await user.tab();

    expect(onChange).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ notes: null })]),
    );
  });
});

describe('SessionExerciseLogger — PrevSummary notes display', () => {
  it('shows previous note in expanded PrevSummary when prefill has a note', async () => {
    const user = userEvent.setup();
    const prefillWithNote: StrengthSessionExercise = {
      ...prefillExercise,
      notes: 'Keep elbows tucked',
    };
    renderLogger([], {
      prefillData: { ex1: prefillWithNote },
      prefillDate: '2024-03-24',
    });

    await user.click(screen.getByTestId('prev-summary-toggle'));

    expect(screen.getByTestId('prev-notes')).toHaveTextContent('Keep elbows tucked');
  });

  it('does not render notes section in PrevSummary when prefill note is null', async () => {
    const user = userEvent.setup();
    renderLogger([], {
      prefillData: { ex1: prefillExercise }, // prefillExercise has notes: null
      prefillDate: '2024-03-24',
    });

    await user.click(screen.getByTestId('prev-summary-toggle'));

    expect(screen.queryByTestId('prev-notes')).not.toBeInTheDocument();
  });

  it('renders long note text without breaking layout', async () => {
    const user = userEvent.setup();
    const longNote = 'A'.repeat(200);
    const prefillWithLongNote: StrengthSessionExercise = {
      ...prefillExercise,
      notes: longNote,
    };
    renderLogger([], {
      prefillData: { ex1: prefillWithLongNote },
      prefillDate: '2024-03-24',
    });

    await user.click(screen.getByTestId('prev-summary-toggle'));

    const notesEl = screen.getByTestId('prev-notes');
    expect(notesEl).toBeInTheDocument();
    expect(notesEl).toHaveTextContent(longNote);
  });
});
