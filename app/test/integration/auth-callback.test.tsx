import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { createTestQueryClient } from '~/test/utils/query-client';

vi.mock('~/components/landing/LandingNav', () => ({
  LandingNav: () => <nav data-testid="landing-nav" />,
}));

// ---------------------------------------------------------------------------
// Mock auth-callbacks query module
// ---------------------------------------------------------------------------

const mockVerifyEmailTokenFn = vi.fn();

vi.mock('~/lib/queries/auth-callbacks', () => ({
  verifyEmailToken: (...args: unknown[]) => mockVerifyEmailTokenFn(...args),
  resendConfirmationEmail: vi.fn().mockResolvedValue(undefined),
}));

// ---------------------------------------------------------------------------
// Mock useNavigate and useSearchParams
// ---------------------------------------------------------------------------

const mockNavigate = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// ---------------------------------------------------------------------------
// Mock AuthContext — mockUser can be overridden per-test
// ---------------------------------------------------------------------------

let mockUser: { role: string } | null = { role: 'coach' };

vi.mock('~/lib/context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    loginWithGoogle: vi.fn(),
    needsRoleSelection: false,
    confirmRole: vi.fn(),
    selectAthlete: vi.fn(),
    clearSelectedAthlete: vi.fn(),
    updateProfile: vi.fn(),
    effectiveAthleteId: null,
    selectedAthleteId: null,
    athletes: [],
  }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function importPage() {
  const mod = await import('~/routes/auth-callback');
  return mod.default;
}

function renderWithParams(search: string) {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/pl/auth/callback${search}`]}>
        <AuthCallbackPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

let AuthCallbackPage: React.ComponentType;

beforeAll(async () => {
  AuthCallbackPage = await importPage();
});

describe('AuthCallbackPage', () => {
  beforeEach(() => {
    mockVerifyEmailTokenFn.mockReset();
    mockNavigate.mockReset();
    sessionStorage.clear();
    mockUser = { role: 'coach' };
  });

  describe('type=email', () => {
    it('calls verifyEmailToken and navigates to coach dashboard on success', async () => {
      mockVerifyEmailTokenFn.mockResolvedValueOnce({
        user: { user_metadata: { role: 'coach' } },
        session: null,
      });
      renderWithParams('?type=email&token_hash=abc123');

      await waitFor(() => {
        expect(mockVerifyEmailTokenFn).toHaveBeenCalledWith('abc123', 'email');
      });
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          expect.stringContaining('/coach'),
          expect.anything(),
        );
      });
    });

    it('shows expired-link card when verifyEmailToken rejects with otp_expired', async () => {
      const error = { code: 'otp_expired', message: 'OTP expired' };
      mockVerifyEmailTokenFn.mockRejectedValueOnce(error);
      renderWithParams('?type=email&token_hash=expired');

      await waitFor(() => {
        expect(screen.getByTestId('expired-link-card')).toBeInTheDocument();
      });
    });

    it('shows already-confirmed card for otp_disabled error', async () => {
      const error = { code: 'otp_disabled', message: 'already confirmed' };
      mockVerifyEmailTokenFn.mockRejectedValueOnce(error);
      renderWithParams('?type=email&token_hash=used');

      await waitFor(() => {
        expect(screen.getByTestId('already-confirmed-card')).toBeInTheDocument();
      });
    });

    it('shows generic error card for other errors', async () => {
      mockVerifyEmailTokenFn.mockRejectedValueOnce(new Error('network_error'));
      renderWithParams('?type=email&token_hash=bad');

      await waitFor(() => {
        expect(screen.getByTestId('generic-error-card')).toBeInTheDocument();
      });
    });
  });

  describe('type=recovery', () => {
    it('sets sessionStorage and navigates to reset-password (does not call verifyEmailToken)', async () => {
      renderWithParams('?type=recovery&token_hash=rec123');

      await waitFor(() => {
        expect(mockVerifyEmailTokenFn).not.toHaveBeenCalled();
        expect(sessionStorage.getItem('auth_callback_type')).toBe('recovery');
        expect(mockNavigate).toHaveBeenCalledWith(
          expect.stringContaining('/reset-password'),
          expect.anything(),
        );
      });
    });
  });

  describe('no params (OAuth callback)', () => {
    it('renders completing sign-in spinner initially', () => {
      // user = null so the second effect doesn't immediately navigate
      mockUser = null;
      renderWithParams('');

      expect(screen.getByTestId('completing-signin-spinner')).toBeInTheDocument();
    });

    it('shows error card after 10-second timeout if no session arrives', async () => {
      // user = null so the timeout is not cleared by the navigation effect
      mockUser = null;
      vi.useFakeTimers();
      try {
        renderWithParams('');

        await act(async () => {
          vi.advanceTimersByTime(10_000);
        });

        expect(screen.getByTestId('oauth-timeout-error-card')).toBeInTheDocument();
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
