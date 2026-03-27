import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AthletePicker } from '~/components/coach/AthletePicker';

const mockSelectAthlete = vi.fn();

vi.mock('~/lib/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'coach-1', role: 'coach', name: 'Coach', email: 'coach@synek.app' },
    athletes: [
      { id: 'athlete-1', name: 'Alice Johnson', email: 'alice@synek.app' },
      { id: 'athlete-2', name: 'Bob Smith', email: 'bob@synek.app' },
    ],
    selectAthlete: mockSelectAthlete,
    selectedAthleteId: null,
    effectiveAthleteId: null,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    clearSelectedAthlete: vi.fn(),
    updateProfile: vi.fn(),
  }),
}));

vi.mock('~/lib/hooks/useLocalePath', () => ({
  useLocalePath: () => (path: string) => `/pl${path}`,
}));

function renderPicker() {
  return render(
    <MemoryRouter>
      <AthletePicker />
    </MemoryRouter>,
  );
}

describe('AthletePicker', () => {
  beforeEach(() => {
    mockSelectAthlete.mockClear();
  });

  it('renders the "Myself" card before athlete cards', () => {
    renderPicker();

    const myselfCard = screen.getByTestId('myself-card');
    const aliceText = screen.getByText('Alice Johnson');

    expect(myselfCard).toBeInTheDocument();
    // DOCUMENT_POSITION_FOLLOWING means aliceText comes after myselfCard
    expect(
      myselfCard.compareDocumentPosition(aliceText) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('shows the "You" badge on the Myself card', () => {
    renderPicker();
    // i18n returns keys in test mode
    expect(screen.getByText('athletePicker.myselfBadge')).toBeInTheDocument();
  });

  it('calls selectAthlete with the coach id when Myself card is clicked', () => {
    renderPicker();
    const myselfCard = screen.getByTestId('myself-card');
    fireEvent.click(myselfCard);
    expect(mockSelectAthlete).toHaveBeenCalledWith('coach-1');
  });

  it('calls selectAthlete with athlete id when athlete card is clicked', () => {
    renderPicker();
    fireEvent.click(screen.getByText('Alice Johnson').closest('[class*="cursor-pointer"]')!);
    expect(mockSelectAthlete).toHaveBeenCalledWith('athlete-1');
  });

  it('still shows the Myself card when athlete list is empty', () => {
    // Override mock for this test
    vi.doMock('~/lib/context/AuthContext', () => ({
      useAuth: () => ({
        user: { id: 'coach-1', role: 'coach', name: 'Coach', email: 'coach@synek.app' },
        athletes: [],
        selectAthlete: mockSelectAthlete,
        selectedAthleteId: null,
        effectiveAthleteId: null,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        clearSelectedAthlete: vi.fn(),
        updateProfile: vi.fn(),
      }),
    }));
    renderPicker();
    expect(screen.getByTestId('myself-card')).toBeInTheDocument();
  });
});
