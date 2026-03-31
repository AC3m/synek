import { renderHook, act } from '@testing-library/react';
import { useWeekView } from '~/lib/hooks/useWeekView';
import type { TrainingSession, WeekPlan } from '~/types/training';

const { useWeekPlanMock, getOrCreateMutateMock, useSessionsMock, updateAthleteMutateMock } =
  vi.hoisted(() => ({
    useWeekPlanMock: vi.fn(),
    getOrCreateMutateMock: vi.fn(),
    useSessionsMock: vi.fn(),
    updateAthleteMutateMock: vi.fn(),
  }));

vi.mock('react-router', () => ({
  useParams: () => ({ weekId: '2026-W10' }),
}));

vi.mock('~/lib/hooks/useWeekPlan', () => ({
  useWeekPlan: useWeekPlanMock,
  useGetOrCreateWeekPlan: () => ({ isPending: false, mutate: getOrCreateMutateMock }),
}));

vi.mock('~/lib/hooks/useSessions', () => ({
  useSessions: useSessionsMock,
  useCreateSession: () => ({ mutate: vi.fn() }),
  useUpdateSession: () => ({ mutate: vi.fn() }),
  useDeleteSession: () => ({ mutate: vi.fn() }),
  useUpdateAthleteSession: () => ({ mutate: updateAthleteMutateMock }),
}));

const BASE_WEEK_PLAN: WeekPlan = {
  id: 'wp-1',
  athleteId: 'athlete-1',
  weekStart: '2026-03-02', // 2026-W10 Monday
  year: 2026,
  weekNumber: 10,
  loadType: null,
  totalPlannedKm: null,
  description: null,
  coachComments: null,
  actualTotalKm: null,
  createdAt: '',
  updatedAt: '',
};

function makeSession(overrides: Partial<TrainingSession> = {}): TrainingSession {
  return {
    id: 's1',
    weekPlanId: 'wp-1',
    dayOfWeek: 'monday',
    sortOrder: 0,
    trainingType: 'run',
    description: null,
    coachComments: null,
    plannedDurationMinutes: null,
    plannedDistanceKm: null,
    typeSpecificData: { type: 'run' },
    isCompleted: false,
    completedAt: null,
    actualDurationMinutes: null,
    actualDistanceKm: null,
    actualPace: null,
    avgHeartRate: null,
    maxHeartRate: null,
    rpe: null,
    calories: null,
    coachPostFeedback: null,
    athleteNotes: null,
    stravaActivityId: null,
    stravaSyncedAt: null,
    isStravaConfirmed: false,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

describe('useWeekView', () => {
  beforeEach(() => {
    getOrCreateMutateMock.mockReset();
    updateAthleteMutateMock.mockReset();
    useWeekPlanMock.mockReturnValue({
      data: BASE_WEEK_PLAN,
      isLoading: false,
      isFetching: false,
    });
    useSessionsMock.mockReturnValue({ data: [], isLoading: false, isFetching: false });
  });

  describe('canAutoCreate', () => {
    it('triggers auto-create when weekPlan is absent and canAutoCreate is true', () => {
      useWeekPlanMock.mockReturnValue({ data: undefined, isLoading: false, isFetching: false });

      renderHook(() => useWeekView({ canAutoCreate: true }));

      expect(getOrCreateMutateMock).toHaveBeenCalledWith(
        { weekStart: '2026-03-02', year: 2026, weekNumber: 10 },
        expect.any(Object),
      );
    });

    it('does not trigger auto-create when canAutoCreate is false', () => {
      useWeekPlanMock.mockReturnValue({ data: undefined, isLoading: false, isFetching: false });

      renderHook(() => useWeekView({ canAutoCreate: false }));

      expect(getOrCreateMutateMock).not.toHaveBeenCalled();
    });

    it('does not trigger auto-create when weekPlan already exists', () => {
      renderHook(() => useWeekView({ canAutoCreate: true }));

      expect(getOrCreateMutateMock).not.toHaveBeenCalled();
    });
  });

  describe('stale detection', () => {
    it('isStaleWeek is true when weekPlan.weekStart does not match current weekStart', () => {
      useWeekPlanMock.mockReturnValue({
        data: { ...BASE_WEEK_PLAN, weekStart: '2026-02-23' }, // previous week
        isLoading: false,
        isFetching: true,
      });

      const { result } = renderHook(() => useWeekView({ canAutoCreate: false }));

      expect(result.current?.isStaleWeek).toBe(true);
    });

    it('isStaleSessions is true when fetched sessions belong to a different weekPlanId', () => {
      useSessionsMock.mockReturnValue({
        data: [makeSession({ weekPlanId: 'wp-old' })],
        isLoading: false,
        isFetching: true,
      });

      const { result } = renderHook(() => useWeekView({ canAutoCreate: false }));

      expect(result.current?.isStaleSessions).toBe(true);
    });

    it('showStaleContent is true when isStaleWeek is true', () => {
      useWeekPlanMock.mockReturnValue({
        data: { ...BASE_WEEK_PLAN, weekStart: '2026-02-23' },
        isLoading: false,
        isFetching: true,
      });

      const { result } = renderHook(() => useWeekView({ canAutoCreate: false }));

      expect(result.current?.showStaleContent).toBe(true);
    });

    it('showStaleContent is true when isStaleSessions is true', () => {
      useSessionsMock.mockReturnValue({
        data: [makeSession({ weekPlanId: 'wp-old' })],
        isLoading: false,
        isFetching: true,
      });

      const { result } = renderHook(() => useWeekView({ canAutoCreate: false }));

      expect(result.current?.showStaleContent).toBe(true);
    });

    it('showStaleContent is false when weekPlan and sessions are current', () => {
      const { result } = renderHook(() => useWeekView({ canAutoCreate: false }));

      expect(result.current?.showStaleContent).toBe(false);
    });
  });

  describe('sessionsForStats', () => {
    it('uses raw sessions for stats when sessionsForStats is not provided', () => {
      useSessionsMock.mockReturnValue({
        data: [makeSession({ plannedDistanceKm: 10 })],
        isLoading: false,
        isFetching: false,
      });

      const { result } = renderHook(() => useWeekView({ canAutoCreate: false }));

      expect(result.current?.stats.totalPlannedKm).toBe(10);
    });

    it('uses sessionsForStats for stats when provided, overriding raw sessions', () => {
      useSessionsMock.mockReturnValue({
        data: [makeSession({ plannedDistanceKm: 10 })],
        isLoading: false,
        isFetching: false,
      });
      const augmented = [makeSession({ plannedDistanceKm: 15 })];

      const { result } = renderHook(() =>
        useWeekView({ canAutoCreate: false, sessionsForStats: augmented }),
      );

      expect(result.current?.stats.totalPlannedKm).toBe(15);
    });
  });

  describe('shared handlers', () => {
    it('handleToggleComplete calls updateAthlete.mutate with isCompleted', () => {
      const { result } = renderHook(() => useWeekView({ canAutoCreate: false }));

      act(() => {
        result.current?.handleToggleComplete('session-1', true);
      });

      expect(updateAthleteMutateMock).toHaveBeenCalledWith({ id: 'session-1', isCompleted: true });
    });

    it('handleUpdateNotes calls updateAthlete.mutate with athleteNotes', () => {
      const { result } = renderHook(() => useWeekView({ canAutoCreate: false }));

      act(() => {
        result.current?.handleUpdateNotes('session-1', 'felt strong');
      });

      expect(updateAthleteMutateMock).toHaveBeenCalledWith({
        id: 'session-1',
        athleteNotes: 'felt strong',
      });
    });

    it('handleUpdatePerformance calls updateAthlete.mutate with performance fields', () => {
      const { result } = renderHook(() => useWeekView({ canAutoCreate: false }));

      act(() => {
        result.current?.handleUpdatePerformance('session-1', { actualDistanceKm: 12, rpe: 7 });
      });

      expect(updateAthleteMutateMock).toHaveBeenCalledWith({
        id: 'session-1',
        actualDistanceKm: 12,
        rpe: 7,
      });
    });
  });
});
