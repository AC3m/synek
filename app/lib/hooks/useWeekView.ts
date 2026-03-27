import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useParams } from 'react-router';
import { useWeekPlan, useGetOrCreateWeekPlan } from '~/lib/hooks/useWeekPlan';
import {
  useSessions,
  useCreateSession,
  useUpdateSession,
  useDeleteSession,
  useUpdateAthleteSession,
} from '~/lib/hooks/useSessions';
import { useSessionFormState } from '~/lib/hooks/useSessionFormState';
import { weekIdToMonday, parseWeekId } from '~/lib/utils/date';
import { groupSessionsByDay, computeWeekStats } from '~/lib/utils/week-view';
import type {
  CreateSessionInput,
  UpdateSessionInput,
  AthleteSessionUpdate,
  TrainingSession,
  WeekPlan,
  SessionsByDay,
  DayOfWeek,
} from '~/types/training';

export interface UseWeekViewOptions {
  /**
   * When true, the hook auto-creates a week plan if none exists.
   * Pass `true` for coach; pass `canSelfPlan` for athlete.
   */
  canAutoCreate: boolean;
  /**
   * Sessions to use for stats computation. When omitted, raw `sessions` are used.
   * Athlete passes Garmin-augmented sessions; coach omits.
   */
  sessionsForStats?: TrainingSession[];
}

export interface UseWeekViewResult {
  weekId: string;
  weekStart: string;
  year: number;
  weekNumber: number;
  weekPlan: WeekPlan | undefined;
  weekLoading: boolean;
  weekFetching: boolean;
  sessionsQuery: ReturnType<typeof useSessions>;
  sessions: TrainingSession[];
  getOrCreate: ReturnType<typeof useGetOrCreateWeekPlan>;
  createSession: ReturnType<typeof useCreateSession>;
  updateSession: ReturnType<typeof useUpdateSession>;
  deleteSessionMut: ReturnType<typeof useDeleteSession>;
  updateAthlete: ReturnType<typeof useUpdateAthleteSession>;
  formOpen: boolean;
  setFormOpen: (open: boolean) => void;
  formDay: DayOfWeek | undefined;
  editingSession: TrainingSession | null;
  deleteConfirmId: string | null;
  setDeleteConfirmId: (id: string | null) => void;
  handleAddSession: (day: DayOfWeek) => void;
  handleEditSession: (session: TrainingSession) => void;
  handleDeleteSession: (sessionId: string) => void;
  sessionsByDay: SessionsByDay;
  stats: ReturnType<typeof computeWeekStats>;
  isInitialLoad: boolean;
  isStaleWeek: boolean;
  isStaleSessions: boolean;
  showStaleContent: boolean;
  showSkeleton: boolean;
  handleFormSubmit: (data: CreateSessionInput | UpdateSessionInput) => void;
  handleToggleComplete: (sessionId: string, completed: boolean) => void;
  handleUpdateNotes: (sessionId: string, notes: string | null) => void;
  handleUpdatePerformance: (sessionId: string, update: Omit<AthleteSessionUpdate, 'id'>) => void;
}

export function useWeekView({
  canAutoCreate,
  sessionsForStats,
}: UseWeekViewOptions): UseWeekViewResult | null {
  const { weekId } = useParams();

  const weekStart = weekId ? weekIdToMonday(weekId) : '';
  const { year, weekNumber } = weekId ? parseWeekId(weekId) : { year: 0, weekNumber: 0 };

  const {
    data: weekPlan,
    isLoading: weekLoading,
    isFetching: weekFetching,
  } = useWeekPlan(weekStart);
  const getOrCreate = useGetOrCreateWeekPlan();
  const sessionsQuery = useSessions(weekPlan?.id);
  const sessions = sessionsQuery.data ?? [];

  const createSession = useCreateSession();
  const updateSession = useUpdateSession();
  const deleteSessionMut = useDeleteSession();
  const updateAthlete = useUpdateAthleteSession();

  // Auto-create week plan if it doesn't exist.
  // Use a ref to guard against repeated calls — the mutation object changes
  // reference every render, so it must not be in the dependency array.
  const mutatingRef = useRef(false);
  useEffect(() => {
    if (!canAutoCreate || !weekId || weekLoading || weekPlan || mutatingRef.current) return;
    mutatingRef.current = true;
    getOrCreate.mutate(
      { weekStart, year, weekNumber },
      {
        onSettled: () => {
          mutatingRef.current = false;
        },
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAutoCreate, weekId, weekLoading, weekPlan, weekStart, year, weekNumber]);

  const {
    formOpen,
    setFormOpen,
    formDay,
    editingSession,
    deleteConfirmId,
    setDeleteConfirmId,
    handleAddSession,
    handleEditSession,
    handleDeleteSession,
  } = useSessionFormState();

  const sessionsByDay = useMemo(() => groupSessionsByDay(sessions), [sessions]);
  const stats = useMemo(
    () => computeWeekStats(sessionsForStats ?? sessions),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessionsForStats, sessions],
  );

  const handleFormSubmit = useCallback(
    (data: CreateSessionInput | UpdateSessionInput) => {
      if ('weekPlanId' in data) {
        createSession.mutate(data);
      } else {
        updateSession.mutate(data);
      }
      setFormOpen(false);
    },
    [createSession, updateSession, setFormOpen],
  );

  const handleToggleComplete = useCallback(
    (sessionId: string, completed: boolean) => {
      updateAthlete.mutate({ id: sessionId, isCompleted: completed });
    },
    [updateAthlete],
  );

  const handleUpdateNotes = useCallback(
    (sessionId: string, notes: string | null) => {
      updateAthlete.mutate({ id: sessionId, athleteNotes: notes });
    },
    [updateAthlete],
  );

  const handleUpdatePerformance = useCallback(
    (sessionId: string, update: Omit<AthleteSessionUpdate, 'id'>) => {
      updateAthlete.mutate({ id: sessionId, ...update });
    },
    [updateAthlete],
  );

  // All hooks have been called — safe to return null for missing weekId
  if (!weekId) return null;

  const isInitialLoad = weekLoading && !weekPlan && !(canAutoCreate && getOrCreate.isPending);
  const isStaleWeek = weekFetching && weekPlan != null && weekPlan.weekStart !== weekStart;
  const isStaleSessions =
    !isStaleWeek &&
    weekPlan != null &&
    (sessionsQuery.isLoading ||
      (sessionsQuery.isFetching &&
        sessionsQuery.data != null &&
        sessionsQuery.data.some((s) => s.weekPlanId !== weekPlan.id)));
  const showStaleContent = isStaleWeek || isStaleSessions;
  const showSkeleton = isInitialLoad || (canAutoCreate && getOrCreate.isPending && !weekPlan);

  return {
    weekId,
    weekStart,
    year,
    weekNumber,
    weekPlan: weekPlan ?? undefined,
    weekLoading,
    weekFetching,
    sessionsQuery,
    sessions,
    getOrCreate,
    createSession,
    updateSession,
    deleteSessionMut,
    updateAthlete,
    formOpen,
    setFormOpen,
    formDay,
    editingSession,
    deleteConfirmId,
    setDeleteConfirmId,
    handleAddSession,
    handleEditSession,
    handleDeleteSession,
    sessionsByDay,
    stats,
    isInitialLoad,
    isStaleWeek,
    isStaleSessions,
    showStaleContent,
    showSkeleton,
    handleFormSubmit,
    handleToggleComplete,
    handleUpdateNotes,
    handleUpdatePerformance,
  };
}
