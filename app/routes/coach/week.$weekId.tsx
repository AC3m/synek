import { useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { WeekNavigation } from '~/components/calendar/WeekNavigation';
import { MultiWeekView } from '~/components/calendar/MultiWeekView';
import { WeekSummary } from '~/components/calendar/WeekSummary';
import { AppLoader } from '~/components/ui/app-loader';
import { StaggerIn } from '~/components/ui/stagger-in';
import { SessionForm } from '~/components/training/SessionForm';
import { DeleteConfirmationDialog } from '~/components/training/DeleteConfirmationDialog';
import { useSessionFormState } from '~/lib/hooks/useSessionFormState';
import { useWeekPlan, useGetOrCreateWeekPlan, useUpdateWeekPlan } from '~/lib/hooks/useWeekPlan';
import {
  useSessions,
  useCreateSession,
  useUpdateSession,
  useDeleteSession,
  useUpdateAthleteSession,
} from '~/lib/hooks/useSessions';
import { useAuth } from '~/lib/context/AuthContext';
import { weekIdToMonday, parseWeekId, getTodayDayOfWeek } from '~/lib/utils/date';
import { groupSessionsByDay, computeWeekStats } from '~/lib/utils/week-view';
import type {
  CreateSessionInput,
  UpdateSessionInput,
  AthleteSessionUpdate,
  WeekPlan,
} from '~/types/training';

export default function CoachWeekView() {
  const { weekId } = useParams();
  const { t } = useTranslation('coach');
  const { user, effectiveAthleteId } = useAuth();

  const selectedDay = getTodayDayOfWeek();

  const isViewingSelf = !!effectiveAthleteId && effectiveAthleteId === user?.id;

  const weekStart = weekId ? weekIdToMonday(weekId) : '';
  const { year, weekNumber } = weekId ? parseWeekId(weekId) : { year: 0, weekNumber: 0 };

  // Queries
  const {
    data: weekPlan,
    isLoading: weekLoading,
    isFetching: weekFetching,
  } = useWeekPlan(weekStart);
  const getOrCreate = useGetOrCreateWeekPlan();
  const updateWeek = useUpdateWeekPlan();
  const sessionsQuery = useSessions(weekPlan?.id);
  const sessions = sessionsQuery.data ?? [];

  // Mutations
  const createSession = useCreateSession();
  const updateSession = useUpdateSession();
  const deleteSessionMut = useDeleteSession();
  const updateAthlete = useUpdateAthleteSession();

  // Auto-create week plan if it doesn't exist.
  // Use a ref to guard against repeated calls — the mutation object changes
  // reference every render, so it must not be in the dependency array.
  const mutatingRef = useRef(false);
  useEffect(() => {
    if (!weekId || weekLoading || weekPlan || mutatingRef.current) return;
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
  }, [weekId, weekLoading, weekPlan, weekStart, year, weekNumber]);

  // Form state
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

  const handleFormSubmit = useCallback(
    (data: CreateSessionInput | UpdateSessionInput) => {
      if ('weekPlanId' in data) {
        createSession.mutate(data);
      } else {
        updateSession.mutate(data);
      }
    },
    [createSession, updateSession],
  );

  const handleWeekUpdate = useCallback(
    (
      updates: Partial<
        Pick<WeekPlan, 'loadType' | 'totalPlannedKm' | 'actualTotalKm' | 'coachComments'>
      >,
    ) => {
      if (!weekPlan) return;
      updateWeek.mutate({ id: weekPlan.id, ...updates });
    },
    [weekPlan, updateWeek],
  );

  const handleUpdateCoachPostFeedback = useCallback(
    (sessionId: string, feedback: string | null) => {
      updateSession.mutate({ id: sessionId, coachPostFeedback: feedback });
    },
    [updateSession],
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

  const sessionsByDay = useMemo(() => groupSessionsByDay(sessions), [sessions]);
  const stats = useMemo(() => computeWeekStats(sessions), [sessions]);

  if (!weekId) return null;

  const isInitialLoad = weekLoading && !weekPlan && !getOrCreate.isPending;
  const showSkeleton = isInitialLoad || (getOrCreate.isPending && !weekPlan);

  return (
    <>
      {showSkeleton && <AppLoader />}
      <div key={weekId} className="animate-in space-y-6 duration-200 fade-in">
        {!showSkeleton && weekPlan && (
          <>
            {/* Header with navigation */}
            <StaggerIn className="flex items-center gap-2">
              <h1 className="shrink-0 text-base font-bold whitespace-nowrap sm:text-xl">
                {t('title')}
              </h1>
              <WeekNavigation
                weekId={weekId}
                basePath="coach"
                selectedDay={selectedDay}
                isLoading={weekFetching}
              />
            </StaggerIn>

            {/* Week Summary */}
            <StaggerIn delay={60}>
              <WeekSummary weekPlan={weekPlan} stats={stats} onUpdate={handleWeekUpdate} />
            </StaggerIn>

            {/* Multi-Week View (current week + 4 history rows) */}
            <StaggerIn delay={120}>
              <MultiWeekView
                currentWeekId={weekId}
                currentWeekPlan={weekPlan}
                currentSessions={sessions}
                currentSessionsByDay={sessionsByDay}
                onAddSession={handleAddSession}
                onEditSession={handleEditSession}
                onDeleteSession={handleDeleteSession}
                onUpdateCoachPostFeedback={handleUpdateCoachPostFeedback}
                userRole={user?.role}
                showAthleteControls={isViewingSelf}
              />
            </StaggerIn>

            {/* Session Form Sheet */}
            <SessionForm
              open={formOpen}
              onClose={() => setFormOpen(false)}
              weekPlanId={weekPlan.id}
              day={formDay}
              session={editingSession}
              onSubmit={handleFormSubmit}
              isCoach={true}
            />
          </>
        )}

        {/* Delete session confirmation */}
        <DeleteConfirmationDialog
          open={!!deleteConfirmId}
          onOpenChange={(open) => {
            if (!open) setDeleteConfirmId(null);
          }}
          title={t('session.delete')}
          description={t('session.deleteConfirm')}
          confirmLabel={t('session.delete')}
          cancelLabel={t('common:actions.cancel' as never)}
          onConfirm={() => {
            deleteSessionMut.mutate(deleteConfirmId!, {
              onSettled: () => setDeleteConfirmId(null),
            });
          }}
          isPending={deleteSessionMut.isPending}
        />
      </div>
    </>
  );
}
