import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { createTestQueryClient } from '~/test/utils/query-client';
import { DeleteAccountDialog } from '~/components/settings/DeleteAccountDialog';

const mockNavigate = vi.fn();
const mockLogout = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('~/lib/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'coach-1', name: 'Alice Johnson', role: 'coach' },
    logout: mockLogout,
  }),
}));

const mockGetSession = vi.fn();
vi.mock('~/lib/supabase', () => ({
  supabase: {
    auth: { getSession: () => mockGetSession() },
  },
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

function renderDialog() {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <DeleteAccountDialog />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockNavigate.mockReset();
  mockLogout.mockReset();
  mockFetch.mockReset();
  mockGetSession.mockResolvedValue({
    data: { session: { access_token: 'test-token' } },
  });
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
});

describe('DeleteAccountDialog', () => {
  it('renders the trigger button', () => {
    renderDialog();
    expect(
      screen.getByRole('button', { name: /settings\.deleteAccount\.cta/i }),
    ).toBeInTheDocument();
  });

  it('opens step 1 dialog when trigger is clicked', async () => {
    renderDialog();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /settings\.deleteAccount\.cta/i }));
    expect(screen.getByText(/settings\.deleteAccount\.description/i)).toBeInTheDocument();
  });

  it('advances to step 2 when "Continue" is clicked', async () => {
    renderDialog();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /settings\.deleteAccount\.cta/i }));
    await user.click(screen.getByRole('button', { name: /settings\.deleteAccount\.confirmStep/i }));

    expect(screen.getByText(/settings\.deleteAccount\.typeUsername/i)).toBeInTheDocument();
  });

  it('submit button is disabled when input is empty', async () => {
    renderDialog();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /settings\.deleteAccount\.cta/i }));
    await user.click(screen.getByRole('button', { name: /settings\.deleteAccount\.confirmStep/i }));

    expect(screen.getByRole('button', { name: /settings\.deleteAccount\.submit/i })).toBeDisabled();
  });

  it('submit button is disabled when input does not match username', async () => {
    renderDialog();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /settings\.deleteAccount\.cta/i }));
    await user.click(screen.getByRole('button', { name: /settings\.deleteAccount\.confirmStep/i }));
    await user.type(
      screen.getByPlaceholderText(/settings\.deleteAccount\.typeUsernamePlaceholder/i),
      'alice',
    );

    expect(screen.getByRole('button', { name: /settings\.deleteAccount\.submit/i })).toBeDisabled();
  });

  it('submit button is enabled when input matches exact username', async () => {
    renderDialog();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /settings\.deleteAccount\.cta/i }));
    await user.click(screen.getByRole('button', { name: /settings\.deleteAccount\.confirmStep/i }));
    await user.type(
      screen.getByPlaceholderText(/settings\.deleteAccount\.typeUsernamePlaceholder/i),
      'Alice Johnson',
    );

    expect(
      screen.getByRole('button', { name: /settings\.deleteAccount\.submit/i }),
    ).not.toBeDisabled();
  });

  it('calls delete-account Edge Function with Authorization header on submit', async () => {
    renderDialog();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /settings\.deleteAccount\.cta/i }));
    await user.click(screen.getByRole('button', { name: /settings\.deleteAccount\.confirmStep/i }));
    await user.type(
      screen.getByPlaceholderText(/settings\.deleteAccount\.typeUsernamePlaceholder/i),
      'Alice Johnson',
    );
    await user.click(screen.getByRole('button', { name: /settings\.deleteAccount\.submit/i }));

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('delete-account');
    expect((options.headers as Record<string, string>)['Authorization']).toBe('Bearer test-token');
  });

  it('calls logout() and navigates to /login on successful deletion', async () => {
    renderDialog();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /settings\.deleteAccount\.cta/i }));
    await user.click(screen.getByRole('button', { name: /settings\.deleteAccount\.confirmStep/i }));
    await user.type(
      screen.getByPlaceholderText(/settings\.deleteAccount\.typeUsernamePlaceholder/i),
      'Alice Johnson',
    );
    await user.click(screen.getByRole('button', { name: /settings\.deleteAccount\.submit/i }));

    await waitFor(() => expect(mockLogout).toHaveBeenCalledTimes(1));
    expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
  });

  it('shows error and does NOT call logout() when fetch fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'internal_error' }),
    });

    renderDialog();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /settings\.deleteAccount\.cta/i }));
    await user.click(screen.getByRole('button', { name: /settings\.deleteAccount\.confirmStep/i }));
    await user.type(
      screen.getByPlaceholderText(/settings\.deleteAccount\.typeUsernamePlaceholder/i),
      'Alice Johnson',
    );
    await user.click(screen.getByRole('button', { name: /settings\.deleteAccount\.submit/i }));

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    expect(mockLogout).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
