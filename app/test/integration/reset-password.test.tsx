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

const mockUpdatePasswordFn = vi.fn();

vi.mock('~/lib/queries/auth-callbacks', () => ({
  updatePassword: (...args: unknown[]) => mockUpdatePasswordFn(...args),
}));

// ---------------------------------------------------------------------------
// Mock useNavigate
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
// Mock AuthContext
// ---------------------------------------------------------------------------

let mockUserRole: string | null = 'athlete';

vi.mock('~/lib/context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUserRole ? { role: mockUserRole } : null,
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
  const mod = await import('~/routes/reset-password');
  return mod.default;
}

function renderResetPassword() {
  const queryClient = createTestQueryClient();
  const ResetPasswordPage = ActualPage!;
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/pl/reset-password']}>
        <Routes>
          <Route path="/:locale/reset-password" element={<ResetPasswordPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

let ActualPage: React.ComponentType | null = null;

beforeAll(async () => {
  ActualPage = await importPage();
});

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    mockUpdatePasswordFn.mockReset();
    mockNavigate.mockReset();
    mockUserRole = 'athlete';
  });

  it('renders new-password and confirm-password fields', async () => {
    renderResetPassword();
    expect(await screen.findByTestId('reset-password-input')).toBeInTheDocument();
    expect(screen.getByTestId('reset-confirm-input')).toBeInTheDocument();
    expect(screen.getByTestId('reset-submit-button')).toBeInTheDocument();
  });

  it('shows validation error if passwords do not match', async () => {
    renderResetPassword();

    const user = userEvent.setup();
    await user.type(await screen.findByTestId('reset-password-input'), 'Password1');
    await user.type(screen.getByTestId('reset-confirm-input'), 'Password2');
    await user.click(screen.getByTestId('reset-submit-button'));

    await waitFor(() => {
      expect(screen.getByTestId('reset-confirm-error')).toBeInTheDocument();
    });
    expect(mockUpdatePasswordFn).not.toHaveBeenCalled();
  });

  it('shows validation error for weak password (no uppercase)', async () => {
    renderResetPassword();

    const user = userEvent.setup();
    await user.type(await screen.findByTestId('reset-password-input'), 'password1');
    await user.type(screen.getByTestId('reset-confirm-input'), 'password1');
    await user.click(screen.getByTestId('reset-submit-button'));

    await waitFor(() => {
      expect(screen.getByTestId('reset-password-error')).toBeInTheDocument();
    });
    expect(mockUpdatePasswordFn).not.toHaveBeenCalled();
  });

  it('calls updatePassword with the new password on valid submit', async () => {
    mockUpdatePasswordFn.mockResolvedValueOnce(undefined);
    renderResetPassword();

    const user = userEvent.setup();
    await user.type(await screen.findByTestId('reset-password-input'), 'NewPass1');
    await user.type(screen.getByTestId('reset-confirm-input'), 'NewPass1');
    await user.click(screen.getByTestId('reset-submit-button'));

    await waitFor(() => {
      expect(mockUpdatePasswordFn).toHaveBeenCalledWith('NewPass1');
    });
  });

  it('shows error message if updatePassword rejects', async () => {
    mockUpdatePasswordFn.mockRejectedValueOnce(new Error('auth_error'));
    renderResetPassword();

    const user = userEvent.setup();
    await user.type(await screen.findByTestId('reset-password-input'), 'NewPass1');
    await user.type(screen.getByTestId('reset-confirm-input'), 'NewPass1');
    await user.click(screen.getByTestId('reset-submit-button'));

    await waitFor(() => {
      expect(screen.getByTestId('reset-error')).toBeInTheDocument();
    });
  });

  it('navigates to athlete dashboard on success', async () => {
    mockUpdatePasswordFn.mockResolvedValueOnce(undefined);
    mockUserRole = 'athlete';
    renderResetPassword();

    const user = userEvent.setup();
    await user.type(await screen.findByTestId('reset-password-input'), 'NewPass1');
    await user.type(screen.getByTestId('reset-confirm-input'), 'NewPass1');
    await user.click(screen.getByTestId('reset-submit-button'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringContaining('/athlete'),
        expect.anything(),
      );
    });
  });
});
