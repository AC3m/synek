import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { createTestQueryClient } from '~/test/utils/query-client';

vi.mock('~/components/landing/LandingNav', () => ({
  LandingNav: () => <nav data-testid="landing-nav" />,
}));

// ---------------------------------------------------------------------------
// Mock AuthContext — confirmRole can be overridden per-test
// ---------------------------------------------------------------------------

const mockConfirmRoleFn = vi.fn();
const mockNavigate = vi.fn();

vi.mock('~/lib/context/AuthContext', () => ({
  useAuth: () => ({
    user: { role: null, id: 'user-123' },
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    loginWithGoogle: vi.fn(),
    needsRoleSelection: true,
    confirmRole: mockConfirmRoleFn,
    selectAthlete: vi.fn(),
    clearSelectedAthlete: vi.fn(),
    updateProfile: vi.fn(),
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

async function importPage() {
  const mod = await import('~/routes/select-role');
  return mod.default;
}

function renderSelectRole() {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/pl/select-role']}>
        <SelectRolePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

let SelectRolePage: React.ComponentType;

beforeAll(async () => {
  SelectRolePage = await importPage();
});

describe('SelectRolePage', () => {
  beforeEach(() => {
    mockConfirmRoleFn.mockReset();
    mockNavigate.mockReset();
  });

  it('renders Coach and Athlete role buttons', () => {
    renderSelectRole();
    expect(screen.getByTestId('role-btn-coach')).toBeInTheDocument();
    expect(screen.getByTestId('role-btn-athlete')).toBeInTheDocument();
  });

  it('clicking Coach calls confirmRole("coach")', async () => {
    mockConfirmRoleFn.mockResolvedValueOnce(undefined);
    renderSelectRole();
    const user = userEvent.setup();

    await user.click(screen.getByTestId('role-btn-coach'));

    await waitFor(() => {
      expect(mockConfirmRoleFn).toHaveBeenCalledWith('coach');
    });
  });

  it('clicking Athlete calls confirmRole("athlete")', async () => {
    mockConfirmRoleFn.mockResolvedValueOnce(undefined);
    renderSelectRole();
    const user = userEvent.setup();

    await user.click(screen.getByTestId('role-btn-athlete'));

    await waitFor(() => {
      expect(mockConfirmRoleFn).toHaveBeenCalledWith('athlete');
    });
  });

  it('both buttons are disabled while confirmRole is in-flight', async () => {
    let resolveConfirm!: () => void;
    mockConfirmRoleFn.mockImplementationOnce(
      () =>
        new Promise<void>((res) => {
          resolveConfirm = res;
        }),
    );
    renderSelectRole();
    const user = userEvent.setup();

    await user.click(screen.getByTestId('role-btn-coach'));

    expect(screen.getByTestId('role-btn-coach')).toBeDisabled();
    expect(screen.getByTestId('role-btn-athlete')).toBeDisabled();

    resolveConfirm();
  });

  it('navigates to coach dashboard after confirmRole("coach") resolves', async () => {
    mockConfirmRoleFn.mockResolvedValueOnce(undefined);
    renderSelectRole();
    const user = userEvent.setup();

    await user.click(screen.getByTestId('role-btn-coach'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringContaining('/coach'),
        expect.anything(),
      );
    });
  });

  it('navigates to athlete dashboard after confirmRole("athlete") resolves', async () => {
    mockConfirmRoleFn.mockResolvedValueOnce(undefined);
    renderSelectRole();
    const user = userEvent.setup();

    await user.click(screen.getByTestId('role-btn-athlete'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringContaining('/athlete'),
        expect.anything(),
      );
    });
  });
});
