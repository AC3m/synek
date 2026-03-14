import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import CoachWeekView from '~/routes/coach/week.$weekId'

const {
  useWeekPlanMock,
  useSessionsMock,
} = vi.hoisted(() => ({
  useWeekPlanMock: vi.fn(),
  useSessionsMock: vi.fn(),
}))

vi.mock('~/lib/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'coach-1', role: 'coach', name: 'Coach', email: 'coach@synek.app' },
    effectiveAthleteId: 'athlete-1',
  }),
}))

vi.mock('~/lib/hooks/useWeekPlan', () => ({
  useWeekPlan: useWeekPlanMock,
  useGetOrCreateWeekPlan: () => ({ isPending: false, mutate: vi.fn() }),
  useUpdateWeekPlan: () => ({ mutate: vi.fn() }),
}))

vi.mock('~/lib/hooks/useSessions', () => ({
  useSessions: useSessionsMock,
  useCreateSession: () => ({ mutate: vi.fn() }),
  useUpdateSession: () => ({ mutate: vi.fn() }),
  useDeleteSession: () => ({ mutate: vi.fn() }),
  useUpdateAthleteSession: () => ({ mutate: vi.fn() }),
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

vi.mock('~/components/calendar/WeekSkeleton', () => ({
  WeekSkeleton: () => <div data-testid="week-skeleton" />,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/coach/week/2026-W10']}>
      <Routes>
        <Route path="/coach/week/:weekId" element={<CoachWeekView />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('CoachWeekView loading state', () => {
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

  it('renders the week layout after the sessions query settles', () => {
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
