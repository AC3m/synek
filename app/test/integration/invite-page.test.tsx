import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { createTestQueryClient } from '~/test/utils/query-client';
import InviteTokenPage from '~/routes/invite.$token';

const mockNavigate = vi.fn();
const mockUseParams = vi.fn(() => ({ token: 'valid-token-123' }));
const mockLogout = vi.fn();
let mockAuthUser: { id: string; name: string; role: string } | null = null;

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => mockUseParams(),
  };
});

vi.mock('~/lib/context/AuthContext', () => ({
  useAuth: () => ({ user: mockAuthUser, logout: mockLogout }),
}));

vi.mock('~/lib/supabase', () => ({
  supabase: {
    auth: { signInWithPassword: vi.fn() },
  },
  isMockMode: true,
}));

const mockUseInvitePreview = vi.fn();
vi.mock('~/lib/hooks/useInvites', () => ({
  useInvitePreview: (token: string) => mockUseInvitePreview(token),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

function renderInvitePage() {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/invite/valid-token-123']}>
        <InviteTokenPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(async () => {
  mockNavigate.mockReset();
  mockFetch.mockReset();
  mockLogout.mockReset();
  mockAuthUser = null;
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({ success: true }) });

  const { supabase } = await import('~/lib/supabase');
  vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
    data: { session: {} as never, user: {} as never },
    error: null,
  });
});

describe('InviteTokenPage — valid token', () => {
  beforeEach(() => {
    mockUseInvitePreview.mockReturnValue({
      data: { valid: true, coachName: 'Jane Smith' },
      isLoading: false,
    });
  });

  it('renders the registration form (not an error card) for a valid invite', () => {
    renderInvitePage();
    // Error card shows invite.invalidTitle; valid invite shows the form fields instead
    expect(screen.queryByText(/invite\.invalidTitle/)).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
  });

  it('renders name, email, and password fields', () => {
    renderInvitePage();
    expect(screen.getByPlaceholderText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
  });

  it('calls claim-invite Edge Function on valid form submit', async () => {
    renderInvitePage();
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText('Jane Smith'), 'Alice');
    await user.type(screen.getByPlaceholderText('you@example.com'), 'alice@test.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'Password1');
    // Submit button text is the i18n key in test (no real i18n resource loaded)
    await user.click(screen.getByRole('button', { name: /invite\.createAccount/i }));

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('claim-invite');
    const body = JSON.parse(options.body as string);
    expect(body.token).toBe('valid-token-123');
    expect(body.email).toBe('alice@test.com');
  });

  it('does not call fetch if honeypot is filled', async () => {
    renderInvitePage();
    const user = userEvent.setup();

    // Fill the honeypot using fireEvent (bypasses aria-hidden accessibility check)
    const honeypot = document.querySelector<HTMLInputElement>('input[name="website"]')!;
    fireEvent.change(honeypot, { target: { value: 'bot-fill' } });

    await user.type(screen.getByPlaceholderText('Jane Smith'), 'Bot');
    await user.type(screen.getByPlaceholderText('you@example.com'), 'bot@test.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'Password1');
    await user.click(screen.getByRole('button', { name: /invite\.createAccount/i }));

    // Give it a moment to fire if it was going to
    await new Promise((r) => setTimeout(r, 50));
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe('InviteTokenPage — invalid tokens', () => {
  it('shows error card when token is already used', () => {
    mockUseInvitePreview.mockReturnValue({
      data: { valid: false, reason: 'used' },
      isLoading: false,
    });
    renderInvitePage();
    expect(screen.getByText(/invite\.invalidTitle/)).toBeInTheDocument();
  });

  it('shows error card when token is expired', () => {
    mockUseInvitePreview.mockReturnValue({
      data: { valid: false, reason: 'expired' },
      isLoading: false,
    });
    renderInvitePage();
    expect(screen.getByText(/invite\.invalidTitle/)).toBeInTheDocument();
  });

  it('shows error card when token is revoked', () => {
    mockUseInvitePreview.mockReturnValue({
      data: { valid: false, reason: 'revoked' },
      isLoading: false,
    });
    renderInvitePage();
    expect(screen.getByText(/invite\.invalidTitle/)).toBeInTheDocument();
  });

  it('shows error card when token is not found', () => {
    mockUseInvitePreview.mockReturnValue({
      data: { valid: false, reason: 'not_found' },
      isLoading: false,
    });
    renderInvitePage();
    expect(screen.getByText(/invite\.invalidTitle/)).toBeInTheDocument();
  });
});

describe('InviteTokenPage — authenticated user', () => {
  it('shows logout prompt when user is already authenticated', () => {
    mockAuthUser = { id: 'coach-1', name: 'Coach', role: 'coach' };
    mockUseInvitePreview.mockReturnValue({
      data: { valid: true, coachName: 'Jane Smith' },
      isLoading: false,
    });
    renderInvitePage();
    expect(screen.getByText(/invite\.alreadySignedIn/)).toBeInTheDocument();
  });
});
