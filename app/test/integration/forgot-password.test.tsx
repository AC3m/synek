import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';
import { createTestQueryClient } from '~/test/utils/query-client';

vi.mock('~/components/landing/LandingNav', () => ({
  LandingNav: () => <nav data-testid="landing-nav" />,
}));

// ---------------------------------------------------------------------------
// Mock auth-callbacks
// ---------------------------------------------------------------------------

const mockRequestPasswordResetFn = vi.fn();

vi.mock('~/lib/queries/auth-callbacks', () => ({
  requestPasswordReset: (...args: unknown[]) => mockRequestPasswordResetFn(...args),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function importPage() {
  const mod = await import('~/routes/forgot-password');
  return mod.default;
}

function renderForgotPassword() {
  const queryClient = createTestQueryClient();
  const ForgotPasswordPage = ActualPage!;
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/pl/forgot-password']}>
        <Routes>
          <Route path="/:locale/forgot-password" element={<ForgotPasswordPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

let ActualPage: React.ComponentType | null = null;

beforeAll(async () => {
  ActualPage = await importPage();
});

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    mockRequestPasswordResetFn.mockReset();
  });

  it('renders email input and submit button', async () => {
    renderForgotPassword();
    expect(await screen.findByTestId('forgot-email-input')).toBeInTheDocument();
    expect(screen.getByTestId('forgot-submit-button')).toBeInTheDocument();
  });

  it('calls requestPasswordReset with the entered email on submit', async () => {
    mockRequestPasswordResetFn.mockResolvedValueOnce(undefined);
    renderForgotPassword();

    const user = userEvent.setup();
    await user.type(await screen.findByTestId('forgot-email-input'), 'user@example.com');
    await user.click(screen.getByTestId('forgot-submit-button'));

    await waitFor(() => {
      expect(mockRequestPasswordResetFn).toHaveBeenCalledWith('user@example.com');
    });
  });

  it('shows check-email success message after resolve', async () => {
    mockRequestPasswordResetFn.mockResolvedValueOnce(undefined);
    renderForgotPassword();

    const user = userEvent.setup();
    await user.type(await screen.findByTestId('forgot-email-input'), 'user@example.com');
    await user.click(screen.getByTestId('forgot-submit-button'));

    await waitFor(() => {
      expect(screen.getByTestId('forgot-success')).toBeInTheDocument();
    });
  });

  it('shows generic error message if requestPasswordReset rejects', async () => {
    mockRequestPasswordResetFn.mockRejectedValueOnce(new Error('network_error'));
    renderForgotPassword();

    const user = userEvent.setup();
    await user.type(await screen.findByTestId('forgot-email-input'), 'user@example.com');
    await user.click(screen.getByTestId('forgot-submit-button'));

    await waitFor(() => {
      expect(screen.getByTestId('forgot-error')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('forgot-success')).not.toBeInTheDocument();
  });

  it('shows Google sign-in prompt when requestPasswordReset rejects with google_only_account', async () => {
    mockRequestPasswordResetFn.mockRejectedValueOnce(new Error('google_only_account'));
    renderForgotPassword();

    const user = userEvent.setup();
    await user.type(await screen.findByTestId('forgot-email-input'), 'google@example.com');
    await user.click(screen.getByTestId('forgot-submit-button'));

    await waitFor(() => {
      expect(screen.getByTestId('forgot-google-only')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('forgot-success')).not.toBeInTheDocument();
  });
});
