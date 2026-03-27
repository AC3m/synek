import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { StravaConfirmButton } from '~/components/training/StravaConfirmButton';
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
    userRole: 'athlete',
    ...overrides,
  };
}

function renderWithContext(ui: ReactNode, context: SessionActionsContextValue = makeContext()) {
  return render(<SessionActionsProvider value={context}>{ui}</SessionActionsProvider>);
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('StravaConfirmButton', () => {
  it('renders null when userRole is coach', () => {
    const { container } = renderWithContext(
      <StravaConfirmButton sessionId="s1" hasStravaActivity={true} isStravaConfirmed={false} />,
      makeContext({ userRole: 'coach' }),
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders null when isStravaConfirmed is true', () => {
    const { container } = renderWithContext(
      <StravaConfirmButton sessionId="s1" hasStravaActivity={true} isStravaConfirmed={true} />,
      makeContext({ userRole: 'athlete' }),
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders null when hasStravaActivity is false', () => {
    const { container } = renderWithContext(
      <StravaConfirmButton sessionId="s1" hasStravaActivity={false} isStravaConfirmed={false} />,
      makeContext({ userRole: 'athlete' }),
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the confirm button for athletes with unconfirmed strava activity', () => {
    renderWithContext(
      <StravaConfirmButton sessionId="s1" hasStravaActivity={true} isStravaConfirmed={false} />,
      makeContext({ userRole: 'athlete' }),
    );
    expect(screen.getByRole('button')).toBeTruthy();
  });

  it('calls onConfirmStrava with the correct sessionId when clicked', async () => {
    const onConfirmStrava = vi.fn().mockResolvedValue(undefined);
    renderWithContext(
      <StravaConfirmButton sessionId="s1" hasStravaActivity={true} isStravaConfirmed={false} />,
      makeContext({ userRole: 'athlete', onConfirmStrava }),
    );

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(onConfirmStrava).toHaveBeenCalledWith('s1');
    });
  });

  it('shows spinner while onConfirmStrava is pending', async () => {
    let resolve!: () => void;
    const onConfirmStrava = vi.fn(
      () =>
        new Promise<void>((r) => {
          resolve = r;
        }),
    );

    renderWithContext(
      <StravaConfirmButton sessionId="s1" hasStravaActivity={true} isStravaConfirmed={false} />,
      makeContext({ userRole: 'athlete', onConfirmStrava }),
    );

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).toBeTruthy();
    });

    resolve();
  });

  it('does not propagate click to parent element', async () => {
    const parentClick = vi.fn();
    const onConfirmStrava = vi.fn().mockResolvedValue(undefined);

    renderWithContext(
      <div onClick={parentClick}>
        <StravaConfirmButton sessionId="s1" hasStravaActivity={true} isStravaConfirmed={false} />
      </div>,
      makeContext({ userRole: 'athlete', onConfirmStrava }),
    );

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(onConfirmStrava).toHaveBeenCalled();
    });
    expect(parentClick).not.toHaveBeenCalled();
  });
});
