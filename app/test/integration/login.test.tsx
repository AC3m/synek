import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import LoginPage from '~/routes/login';
import { createTestQueryClient } from '~/test/utils/query-client';

// LandingNav uses ThemeToggle/LanguageToggle which need context providers not
// relevant to login form tests — stub it out.
vi.mock('~/components/landing/LandingNav', () => ({
  LandingNav: () => <nav data-testid="landing-nav" />,
}));

// ---------------------------------------------------------------------------
// Auth mock — track login calls and simulate success/failure
// ---------------------------------------------------------------------------

const mockLoginFn = vi.fn();
const mockLoginWithGoogleFn = vi.fn();
const mockNavigate = vi.fn();

vi.mock('~/lib/context/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    login: mockLoginFn,
    loginWithGoogle: mockLoginWithGoogleFn,
    needsRoleSelection: false,
    effectiveAthleteId: null,
    selectedAthleteId: null,
    athletes: [],
    isLoading: false,
    logout: vi.fn(),
    selectAthlete: vi.fn(),
    clearSelectedAthlete: vi.fn(),
    updateProfile: vi.fn(),
    confirmRole: vi.fn(),
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
      <MemoryRouter initialEntries={['/pl/login']}>
        <LoginPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    mockLoginFn.mockReset();
    mockLoginWithGoogleFn.mockReset();
    mockNavigate.mockReset();
  });

  it('renders the login form with email and password fields', () => {
    renderLogin();
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
  });

  it('calls login() with the entered credentials on valid form submit', async () => {
    mockLoginFn.mockResolvedValueOnce(undefined);
    renderLogin();
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText('you@example.com'), 'coach@synek.app');
    await user.type(screen.getByPlaceholderText('••••••••'), 'coach123');
    await user.click(screen.getByRole('button', { name: 'auth.signIn' }));

    await waitFor(() => expect(mockLoginFn).toHaveBeenCalledWith('coach@synek.app', 'coach123'));
  });

  it('shows an error message when login() throws', async () => {
    mockLoginFn.mockRejectedValueOnce(new Error('Invalid credentials'));
    renderLogin();
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText('you@example.com'), 'wrong@example.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'badpassword');
    await user.click(screen.getByRole('button', { name: 'auth.signIn' }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Invalid credentials'));
  });

  it('does not show an error initially', () => {
    renderLogin();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders a link to the register page', () => {
    renderLogin();
    const registerLink = screen.getByRole('link', { name: 'auth.registerAccount' });
    expect(registerLink).toBeInTheDocument();
    expect(registerLink).toHaveAttribute('href', '/pl/register');
  });

  it('does not render a register form', () => {
    renderLogin();
    // No name field should exist — register form is on /register
    expect(screen.queryByPlaceholderText('Jane Smith')).not.toBeInTheDocument();
  });

  it('renders "Continue with Google" button', () => {
    renderLogin();
    expect(screen.getByTestId('google-signin-btn')).toBeInTheDocument();
  });

  it('clicking "Continue with Google" calls loginWithGoogle()', async () => {
    mockLoginWithGoogleFn.mockResolvedValueOnce(undefined);
    renderLogin();
    const user = userEvent.setup();

    await user.click(screen.getByTestId('google-signin-btn'));

    await waitFor(() => {
      expect(mockLoginWithGoogleFn).toHaveBeenCalled();
    });
  });

  it('renders "Forgot password?" link pointing to /pl/forgot-password', () => {
    renderLogin();
    const link = screen.getByRole('link', { name: 'auth.forgotPassword' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/pl/forgot-password');
  });

  it('shows email_not_confirmed UI when login throws email_not_confirmed', async () => {
    mockLoginFn.mockRejectedValueOnce(new Error('email_not_confirmed'));
    renderLogin();
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText('you@example.com'), 'coach@synek.app');
    await user.type(screen.getByPlaceholderText('••••••••'), 'coach123');
    await user.click(screen.getByRole('button', { name: 'auth.signIn' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent('auth.emailNotConfirmed');
    });
  });
});
