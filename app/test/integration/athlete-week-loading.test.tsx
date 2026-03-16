import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AthleteWeekView from '~/routes/athlete/week.$weekId'

const {
  useWeekPlanMock,
  useSessionsMock,
  useStravaConnectionStatusMock,
  useSelfPlanPermissionMock,
} = vi.hoisted(() => ({
  useWeekPlanMock: vi.fn(),
  useSessionsMock: vi.fn(),
  useStravaConnectionStatusMock: vi.fn(),
  useSelfPlanPermissionMock: vi.fn(),
}))

vi.mock('~/lib/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'athlete-1', role: 'athlete', name: 'Alice', email: 'alice@synek.app' },
    effectiveAthleteId: 'athlete-1',
  }),
}))

vi.mock('~/lib/hooks/useWeekPlan', () => ({
  useWeekPlan: useWeekPlanMock,
  useGetOrCreateWeekPlan: () => ({ isPending: false, mutate: vi.fn() }),
}))

vi.mock('~/lib/hooks/useSessions', () => ({
  useSessions: useSessionsMock,
  useUpdateAthleteSession: () => ({ mutate: vi.fn() }),
  useCreateSession: () => ({ mutate: vi.fn() }),
  useUpdateSession: () => ({ mutate: vi.fn() }),
  useDeleteSession: () => ({ mutate: vi.fn() }),
  useConfirmStravaSession: () => ({ mutate: vi.fn() }),
  useBulkConfirmStravaSessions: () => ({ mutate: vi.fn(), isPending: false }),
}))

vi.mock('~/lib/hooks/useStravaConnection', () => ({
  useStravaConnectionStatus: useStravaConnectionStatusMock,
  useStravaSync: () => ({ mutate: vi.fn() }),
}))

vi.mock('~/lib/hooks/useJunctionConnection', () => ({
  useJunctionConnectionStatus: () => ({ data: null }),
  useJunctionConnect: () => ({ mutate: vi.fn(), isPending: false }),
  useJunctionDisconnect: () => ({ mutate: vi.fn(), isPending: false }),
  useJunctionWorkout: () => ({ data: null }),
}))

vi.mock('~/lib/hooks/useProfile', () => ({
  useSelfPlanPermission: useSelfPlanPermissionMock,
}))

vi.mock('~/components/calendar/WeekNavigation', () => ({
  WeekNavigation: () => <div data-testid="week-navigation" />,
}))

vi.mock('~/components/calendar/WeekSummary', () => ({
  WeekSummary: () => <div data-testid="week-summary" />,
}))

vi.mock('~/components/calendar/WeekGrid', () => ({
  WeekGrid: () => <div data-testid="week-grid" />,
}))

vi.mock('~/components/training/SessionForm', () => ({
  SessionForm: () => null,
}))

vi.mock('~/components/calendar/StravaBulkShareBar', () => ({
  StravaBulkShareBar: () => null,
}))

vi.mock('~/components/calendar/WeekSkeleton', () => ({
  WeekSkeleton: () => <div data-testid="week-skeleton" />,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/athlete/week/2026-W10']}>
        <Routes>
          <Route path="/athlete/week/:weekId" element={<AthleteWeekView />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('AthleteWeekView loading state', () => {
  beforeEach(() => {
    useStravaConnectionStatusMock.mockReturnValue({ data: { connected: false } })
    useSelfPlanPermissionMock.mockReturnValue({ data: true })
  })

  it('keeps the skeleton visible while sessions are still pending for a resolved week plan', () => {
    useWeekPlanMock.mockReturnValue({
      data: { id: 'week-plan-1' },
      isLoading: false,
    })
    useSessionsMock.mockReturnValue({
      data: undefined,
      isPending: true,
    })

    renderPage()

    expect(screen.getByTestId('week-skeleton')).toBeInTheDocument()
    expect(screen.queryByTestId('week-grid')).not.toBeInTheDocument()
  })

  it('renders the week layout after the sessions query settles, even for an empty week', () => {
    useWeekPlanMock.mockReturnValue({
      data: { id: 'week-plan-1' },
      isLoading: false,
    })
    useSessionsMock.mockReturnValue({
      data: [],
      isPending: false,
    })

    renderPage()

    expect(screen.queryByTestId('week-skeleton')).not.toBeInTheDocument()
    expect(screen.getByTestId('week-grid')).toBeInTheDocument()
  })
})
