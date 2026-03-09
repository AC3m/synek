import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import LoginPage from '~/routes/login';
import { createTestQueryClient } from '~/test/utils/query-client';

// ---------------------------------------------------------------------------
// Auth mock — track login calls and simulate success/failure
// ---------------------------------------------------------------------------

const mockLoginFn = vi.fn();
const mockNavigate = vi.fn();

vi.mock('~/lib/context/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    login: mockLoginFn,
    effectiveAthleteId: null,
    selectedAthleteId: null,
    athletes: [],
    isLoading: false,
    logout: vi.fn(),
    selectAthlete: vi.fn(),
    clearSelectedAthlete: vi.fn(),
    updateProfile: vi.fn(),
  }),
}));

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderLogin() {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    mockLoginFn.mockReset();
    mockNavigate.mockReset();
  });

  it('renders the login form with email and password fields', () => {
    renderLogin();
    // Use placeholders (hardcoded, not i18n keys) as stable selectors
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
  });

  it('calls login() with the entered credentials on valid form submit', async () => {
    mockLoginFn.mockResolvedValueOnce(undefined);
    renderLogin();
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText('you@example.com'), 'coach@synek.app');
    await user.type(screen.getByPlaceholderText('••••••••'), 'coach123');
    // In tests, t('auth.signIn') returns the key 'auth.signIn'
    await user.click(screen.getByRole('button', { name: 'auth.signIn' }));

    await waitFor(() =>
      expect(mockLoginFn).toHaveBeenCalledWith('coach@synek.app', 'coach123')
    );
  });

  it('shows an error message when login() throws', async () => {
    mockLoginFn.mockRejectedValueOnce(new Error('Invalid credentials'));
    renderLogin();
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText('you@example.com'), 'wrong@example.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'badpassword');
    await user.click(screen.getByRole('button', { name: 'auth.signIn' }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid credentials')
    );
  });

  it('does not show an error initially', () => {
    renderLogin();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
