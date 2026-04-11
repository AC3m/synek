import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';
import { createTestQueryClient } from '~/test/utils/query-client';

vi.mock('~/components/landing/LandingNav', () => ({
  LandingNav: () => <nav data-testid="landing-nav" />,
}));

// ---------------------------------------------------------------------------
// Mock auth-callbacks query module
// ---------------------------------------------------------------------------

const mockResendFn = vi.fn();

vi.mock('~/lib/queries/auth-callbacks', () => ({
  resendConfirmationEmail: (...args: unknown[]) => mockResendFn(...args),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function importPage() {
  const mod = await import('~/routes/confirm-email');
  return mod.default;
}

function renderConfirmEmail(state?: Record<string, unknown>) {
  const queryClient = createTestQueryClient();
  const ConfirmEmailPage = ActualPage!;
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter
        initialEntries={[
          { pathname: '/pl/confirm-email', state: state ?? { email: 'user@example.com' } },
        ]}
      >
        <Routes>
          <Route path="/:locale/confirm-email" element={<ConfirmEmailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

let ActualPage: React.ComponentType | null = null;

beforeAll(async () => {
  ActualPage = (await importPage()) as React.ComponentType;
});

describe('ConfirmEmailPage', () => {
  beforeEach(() => {
    mockResendFn.mockReset();
  });

  it('renders the email address passed via navigation state', async () => {
    renderConfirmEmail({ email: 'coach@example.com' });
    await waitFor(() => {
      expect(screen.getByTestId('confirm-email-address')).toHaveTextContent('coach@example.com');
    });
  });

  it('"Resend" button calls resendConfirmationEmail and shows success text after resolve', async () => {
    mockResendFn.mockResolvedValueOnce(undefined);
    renderConfirmEmail({ email: 'user@example.com' });

    const user = userEvent.setup();
    const resendBtn = await screen.findByTestId('resend-button');
    await user.click(resendBtn);

    await waitFor(() => {
      expect(mockResendFn).toHaveBeenCalledWith('user@example.com');
    });
    await waitFor(() => {
      expect(screen.getByTestId('resend-success')).toBeInTheDocument();
    });
  });

  it('button is disabled while request is in-flight', async () => {
    let resolveResend!: () => void;
    mockResendFn.mockImplementationOnce(
      () =>
        new Promise<void>((res) => {
          resolveResend = res;
        }),
    );
    renderConfirmEmail({ email: 'user@example.com' });

    const user = userEvent.setup();
    const resendBtn = await screen.findByTestId('resend-button');
    await user.click(resendBtn);

    expect(resendBtn).toBeDisabled();
    resolveResend();
  });

  it('server error shows error message', async () => {
    mockResendFn.mockRejectedValueOnce(new Error('network_error'));
    renderConfirmEmail({ email: 'user@example.com' });

    const user = userEvent.setup();
    const resendBtn = await screen.findByTestId('resend-button');
    await user.click(resendBtn);

    await waitFor(() => {
      expect(screen.getByTestId('resend-error')).toBeInTheDocument();
    });
  });

  it('rate-limited: after rate_limited error button is disabled and wait message shown', async () => {
    // First 3 calls succeed, 4th is rate-limited
    mockResendFn
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('rate_limited'));

    // Re-render a fresh page that allows repeated resend (i.e. no success hide)
    // We need the button to remain visible — use a page that shows success then re-enables
    // Actually: the current UI hides the button after success. For this test we only need
    // one rate-limited rejection to trigger the wait state.
    mockResendFn.mockReset();
    mockResendFn.mockRejectedValueOnce(new Error('rate_limited'));

    renderConfirmEmail({ email: 'user@example.com' });

    const user = userEvent.setup();
    const resendBtn = await screen.findByTestId('resend-button');
    await user.click(resendBtn);

    await waitFor(() => {
      expect(screen.getByTestId('resend-rate-limited')).toBeInTheDocument();
    });
    expect(screen.getByTestId('resend-button')).toBeDisabled();
  });
});
