import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import RegisterPage from '~/routes/register';
import { createTestQueryClient } from '~/test/utils/query-client';

vi.mock('~/components/landing/LandingNav', () => ({
  LandingNav: () => <nav data-testid="landing-nav" />,
}));

// Force real (non-mock) mode so the fetch path is exercised in tests
vi.mock('~/lib/supabase', () => ({
  isMockMode: false,
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

// ---------------------------------------------------------------------------
// Mock Turnstile — fires onSuccess immediately with a mock token
// ---------------------------------------------------------------------------

vi.mock('@marsidev/react-turnstile', () => ({
  Turnstile: ({ onSuccess }: { onSuccess: (token: string) => void }) => {
    onSuccess('mock-turnstile-token');
    return null;
  },
}));

// ---------------------------------------------------------------------------
// Mock AuthContext
// ---------------------------------------------------------------------------

const mockLoginFn = vi.fn();
const mockLoginWithGoogle = vi.fn();
const mockNavigate = vi.fn();

vi.mock('~/lib/context/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    login: mockLoginFn,
    loginWithGoogle: mockLoginWithGoogle,
    needsRoleSelection: false,
    isLoading: false,
    logout: vi.fn(),
    selectAthlete: vi.fn(),
    clearSelectedAthlete: vi.fn(),
    updateProfile: vi.fn(),
    confirmRole: vi.fn(),
    effectiveAthleteId: null,
    selectedAthleteId: null,
    athletes: [],
  }),
}));

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderRegister() {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/pl/register']}>
        <RegisterPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function fillAndSubmit(overrides?: { email?: string; password?: string }) {
  const user = userEvent.setup();
  // Select role
  await user.click(screen.getByRole('button', { name: 'beta.roleCoach' }));
  // Fill fields
  await user.type(screen.getByLabelText(/beta.name/i), 'Jane Smith');
  await user.type(screen.getByLabelText(/beta.email/i), overrides?.email ?? 'jane@example.com');
  await user.type(screen.getByLabelText(/beta.password/i), overrides?.password ?? 'Password1');
  // Submit
  await user.click(screen.getByRole('button', { name: 'beta.submit' }));
}

// ---------------------------------------------------------------------------
// Mock fetch globally
// ---------------------------------------------------------------------------

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('RegisterPage', () => {
  beforeEach(() => {
    mockLoginFn.mockReset();
    mockNavigate.mockReset();
    mockFetch.mockReset();
  });

  it('renders the registration form', () => {
    renderRegister();
    expect(screen.getByLabelText(/beta.name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/beta.email/i)).toBeInTheDocument();
  });

  it('Turnstile widget fires onSuccess and cfToken is set (submit button enabled after token)', async () => {
    renderRegister();
    // After Turnstile fires, submit button should not be disabled due to missing token
    const submitBtn = screen.getByRole('button', { name: 'beta.submit' });
    // Select role to satisfy role check
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'beta.roleCoach' }));
    expect(submitBtn).not.toBeDisabled();
  });

  it('submit button is disabled until role is selected', () => {
    renderRegister();
    const submitBtn = screen.getByRole('button', { name: 'beta.submit' });
    expect(submitBtn).toBeDisabled();
  });

  it('includes cfToken in the request body on submit', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });
    renderRegister();
    await fillAndSubmit();

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string) as Record<string, unknown>;
    expect(body.cfToken).toBe('mock-turnstile-token');
  });

  it('successful registration does NOT call login() and navigates to confirm-email', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });
    renderRegister();
    await fillAndSubmit();

    await waitFor(() => {
      expect(mockLoginFn).not.toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringContaining('/confirm-email'),
        expect.objectContaining({ state: expect.objectContaining({ email: 'jane@example.com' }) }),
      );
    });
  });

  it('shows turnstile_failed error message when server returns that code', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'turnstile_failed' }),
    });
    renderRegister();
    await fillAndSubmit();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('errors.turnstileFailed');
    });
  });

  it('shows rate_limited error message when server returns that code', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'rate_limited' }),
    });
    renderRegister();
    await fillAndSubmit();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('errors.rateLimited');
    });
  });
});
