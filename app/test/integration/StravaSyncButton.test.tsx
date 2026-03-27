import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { StravaSyncButton } from '~/components/training/StravaSyncButton';
import { SessionActionsProvider } from '~/lib/context/SessionActionsContext';
import type { SessionActionsContextValue } from '~/lib/context/SessionActionsContext';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeContext(
  overrides: Partial<SessionActionsContextValue> = {},
): SessionActionsContextValue {
  return {
    readonly: false,
    athleteMode: true,
    showAthleteControls: false,
    stravaConnected: true,
    junctionConnected: false,
    ...overrides,
  };
}

function renderWithContext(ui: ReactNode, context: SessionActionsContextValue = makeContext()) {
  return render(<SessionActionsProvider value={context}>{ui}</SessionActionsProvider>);
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('StravaSyncButton', () => {
  it('renders null when stravaConnected is false', () => {
    const { container } = renderWithContext(
      <StravaSyncButton sessionId="s1" isCompleted={true} hasStravaActivity={false} />,
      makeContext({ stravaConnected: false }),
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders null when isCompleted is false', () => {
    const { container } = renderWithContext(
      <StravaSyncButton sessionId="s1" isCompleted={false} hasStravaActivity={false} />,
      makeContext({ stravaConnected: true }),
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders null when hasStravaActivity is true', () => {
    const { container } = renderWithContext(
      <StravaSyncButton sessionId="s1" isCompleted={true} hasStravaActivity={true} />,
      makeContext({ stravaConnected: true }),
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the sync button when all conditions are met', () => {
    renderWithContext(
      <StravaSyncButton sessionId="s1" isCompleted={true} hasStravaActivity={false} />,
      makeContext({ stravaConnected: true }),
    );
    expect(screen.getByRole('button')).toBeTruthy();
  });

  it('calls onSyncStrava with the correct sessionId when clicked', async () => {
    const onSyncStrava = vi.fn().mockResolvedValue(undefined);
    renderWithContext(
      <StravaSyncButton sessionId="s1" isCompleted={true} hasStravaActivity={false} />,
      makeContext({ stravaConnected: true, onSyncStrava }),
    );

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(onSyncStrava).toHaveBeenCalledWith('s1');
    });
  });

  it('shows Loader2 spinner while onSyncStrava is pending', async () => {
    let resolve!: () => void;
    const onSyncStrava = vi.fn(
      () =>
        new Promise<void>((r) => {
          resolve = r;
        }),
    );

    renderWithContext(
      <StravaSyncButton sessionId="s1" isCompleted={true} hasStravaActivity={false} />,
      makeContext({ stravaConnected: true, onSyncStrava }),
    );

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).toBeTruthy();
    });

    resolve();
  });

  it('does not propagate click to parent element', async () => {
    const parentClick = vi.fn();
    const onSyncStrava = vi.fn().mockResolvedValue(undefined);

    renderWithContext(
      <div onClick={parentClick}>
        <StravaSyncButton sessionId="s1" isCompleted={true} hasStravaActivity={false} />
      </div>,
      makeContext({ stravaConnected: true, onSyncStrava }),
    );

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(onSyncStrava).toHaveBeenCalled();
    });
    expect(parentClick).not.toHaveBeenCalled();
  });
});
