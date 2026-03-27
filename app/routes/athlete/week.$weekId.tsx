import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { WeekNavigation } from '~/components/calendar/WeekNavigation';
import { WeekGrid } from '~/components/calendar/WeekGrid';
import { WeekSummary } from '~/components/calendar/WeekSummary';
import { AppLoader } from '~/components/ui/app-loader';
import { StaggerIn } from '~/components/ui/stagger-in';
import { SessionForm } from '~/components/training/SessionForm';
import { DeleteConfirmationDialog } from '~/components/training/DeleteConfirmationDialog';
import { useSessionFormState } from '~/lib/hooks/useSessionFormState';
import { useWeekPlan, useGetOrCreateWeekPlan } from '~/lib/hooks/useWeekPlan';
import {
  useSessions,
  useUpdateAthleteSession,
  useCreateSession,
  useUpdateSession,
  useDeleteSession,
  useConfirmStravaSession,
  useBulkConfirmStravaSessions,
} from '~/lib/hooks/useSessions';
import { useQueryClient } from '@tanstack/react-query';
import { useStravaConnectionStatus, useStravaSync } from '~/lib/hooks/useStravaConnection';
import {
  useJunctionConnectionStatus,
  useJunctionWeekWorkouts,
} from '~/lib/hooks/useJunctionConnection';
import { useSelfPlanPermission } from '~/lib/hooks/useProfile';
import { useAuth } from '~/lib/context/AuthContext';
import { queryKeys } from '~/lib/queries/keys';
import { weekIdToMonday, parseWeekId, getTodayDayOfWeek } from '~/lib/utils/date';
import {
  groupSessionsByDay,
  computeWeekStats,
  augmentSessionsWithGarmin,
} from '~/lib/utils/week-view';
import { StravaActionsBar } from '~/components/calendar/StravaActionsBar';
import type {
  DayOfWeek,
  AthleteSessionUpdate,
  CreateSessionInput,
  UpdateSessionInput,
  SessionsByDay,
} from '~/types/training';

export default function AthleteWeekView() {
  const { weekId } = useParams();
  const { t } = useTranslation('athlete');
  const { user } = useAuth();

  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(() => getTodayDayOfWeek());

  const weekStart = weekId ? weekIdToMonday(weekId) : '';
  const { year, weekNumber } = weekId ? parseWeekId(weekId) : { year: 0, weekNumber: 0 };

  const { data: canSelfPlan = true } = useSelfPlanPermission(user?.id ?? '');

  // Queries
  const {
    data: weekPlan,
    isLoading: weekLoading,
    isFetching: weekFetching,
  } = useWeekPlan(weekStart);
  const sessionsQuery = useSessions(weekPlan?.id);
  const sessions = sessionsQuery.data ?? [];
  const updateAthlete = useUpdateAthleteSession();
  const qc = useQueryClient();
  const { data: stravaStatus } = useStravaConnectionStatus(user?.id ?? '');
  const { data: junctionConnection } = useJunctionConnectionStatus(user?.id ?? '');
  const stravaSyncSingle = useStravaSync();
  const stravaSyncBulk = useStravaSync();

  // Planning hooks — only used when canSelfPlan
  const getOrCreate = useGetOrCreateWeekPlan();
  const createSession = useCreateSession();
  const updateSession = useUpdateSession();
  const deleteSessionMut = useDeleteSession();
  const confirmStrava = useConfirmStravaSession();
  const bulkConfirmStrava = useBulkConfirmStravaSessions();

  // Auto-create week plan when self-planning is enabled and no plan exists
  const mutatingRef = useRef(false);
  useEffect(() => {
    if (!canSelfPlan || !weekId || weekLoading || weekPlan || mutatingRef.current) return;
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
  }, [canSelfPlan, weekId, weekLoading, weekPlan, weekStart, year, weekNumber]);

  // Planning form state
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

  const stravaConnected = stravaStatus?.connected ?? false;
  const junctionConnected = junctionConnection?.status === 'active';

  // PoC: Junction Garmin integration — remove after evaluation
  const { data: garminWeekWorkouts = [] } = useJunctionWeekWorkouts(
    user?.id ?? '',
    weekStart,
    junctionConnected,
  );

  const sessionsByDay = useMemo(() => groupSessionsByDay(sessions), [sessions]);
  // PoC: Junction Garmin integration — remove after evaluation
  const augmentedSessions = useMemo(
    () =>
      junctionConnected
        ? augmentSessionsWithGarmin(sessions, garminWeekWorkouts, weekStart)
        : sessions,
    [junctionConnected, sessions, garminWeekWorkouts, weekStart],
  );
  const stats = useMemo(() => computeWeekStats(augmentedSessions), [augmentedSessions]);

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

  const handleSyncStrava = useCallback(
    async (sessionId: string) => {
      if (!user) return;
      try {
        await stravaSyncSingle.mutateAsync({ weekStart, sessionId });
      } catch {
        // mutation errors are handled by useStravaSync's onError
      } finally {
        if (weekPlan?.id) {
          void qc.refetchQueries({ queryKey: queryKeys.sessions.byWeek(weekPlan.id) });
        }
      }
    },
    [stravaSyncSingle, user, weekStart, qc, weekPlan?.id],
  );

  const handleSyncAllStrava = useCallback(() => {
    stravaSyncBulk.mutate({ weekStart });
  }, [stravaSyncBulk, weekStart]);

  const handleConfirmStrava = useCallback(
    (sessionId: string) => confirmStrava.mutateAsync(sessionId),
    [confirmStrava],
  );

  const handleBulkConfirmStrava = useCallback(async () => {
    if (!weekPlan) return;
    try {
      await bulkConfirmStrava.mutateAsync(weekPlan.id);
    } catch {
      // handled by hook's onError
    } finally {
      void qc.refetchQueries({ queryKey: queryKeys.sessions.byWeek(weekPlan.id) });
    }
  }, [bulkConfirmStrava, weekPlan, qc]);

  const handleFormSubmit = useCallback(
    (data: CreateSessionInput | UpdateSessionInput) => {
      if ('weekPlanId' in data) {
        createSession.mutate(data);
      } else {
        updateSession.mutate(data);
      }
      setFormOpen(false);
    },
    [createSession, updateSession],
  );

  if (!weekId) return null;

  const isInitialLoad = weekLoading && !weekPlan && !(canSelfPlan && getOrCreate.isPending);
  const isStaleWeek = weekFetching && weekPlan != null && weekPlan.weekStart !== weekStart;
  const isStaleSessions =
    !isStaleWeek &&
    weekPlan != null &&
    (sessionsQuery.isLoading ||
      (sessionsQuery.isFetching &&
        sessionsQuery.data != null &&
        sessionsQuery.data.some((s) => s.weekPlanId !== weekPlan.id)));
  const showStaleContent = isStaleWeek || isStaleSessions;
  const showSkeleton = isInitialLoad || (canSelfPlan && getOrCreate.isPending && !weekPlan);

  return (
    <>
      {showSkeleton && <AppLoader />}
      <div key={weekId} className="animate-in space-y-6 duration-200 fade-in">
        {!showSkeleton &&
          (!weekPlan ? (
            <>
              <StaggerIn>
                <div className="flex items-center gap-2">
                  <h1 className="shrink-0 text-base font-bold whitespace-nowrap sm:text-xl">
                    {t('title')}
                  </h1>
                  <WeekNavigation
                    weekId={weekId}
                    basePath="athlete"
                    selectedDay={selectedDay}
                    isLoading={weekFetching}
                  />
                </div>
              </StaggerIn>
              <StaggerIn delay={60}>
                <div className="py-20 text-center text-muted-foreground">{t('noTrainingPlan')}</div>
              </StaggerIn>
            </>
          ) : (
            <>
              {/* Header with navigation */}
              <StaggerIn>
                <div className="flex items-center gap-2">
                  <h1 className="shrink-0 text-base font-bold whitespace-nowrap sm:text-xl">
                    {t('title')}
                  </h1>
                  <WeekNavigation
                    weekId={weekId}
                    basePath="athlete"
                    selectedDay={selectedDay}
                    isLoading={weekFetching}
                  />
                </div>
              </StaggerIn>

              {/* Week Summary (readonly with progress bar) */}
              <StaggerIn delay={60}>
                <WeekSummary weekPlan={weekPlan} stats={showStaleContent ? computeWeekStats([]) : stats} readonly />
              </StaggerIn>

              {/* Week Grid */}
              <StaggerIn delay={120}>
                <WeekGrid
                  sessionsByDay={showStaleContent ? {} as SessionsByDay : sessionsByDay}
                  weekStart={weekStart}
                  athleteMode
                  onToggleComplete={handleToggleComplete}
                  onUpdateNotes={handleUpdateNotes}
                  onUpdatePerformance={handleUpdatePerformance}
                  stravaConnected={stravaConnected}
                  junctionConnected={junctionConnected}
                  onSyncStrava={handleSyncStrava}
                  onConfirmStrava={handleConfirmStrava}
                  userRole={user?.role}
                  selectedDay={selectedDay}
                  onSelectDay={setSelectedDay}
                  {...(canSelfPlan && {
                    onAddSession: handleAddSession,
                    onEditSession: handleEditSession,
                    onDeleteSession: handleDeleteSession,
                  })}
                />
              </StaggerIn>

              {/* Session Form — only shown when self-planning is enabled */}
              {canSelfPlan && (
                <SessionForm
                  open={formOpen}
                  onClose={() => setFormOpen(false)}
                  weekPlanId={weekPlan.id}
                  day={formDay}
                  session={editingSession}
                  onSubmit={handleFormSubmit}
                  isCoach={false}
                />
              )}

              {/* Floating Action Bar — Strava bulk sync + bulk share */}
              <StravaActionsBar
                unsyncedCount={
                  stravaConnected
                    ? sessions.filter((s) => s.isCompleted && !s.stravaActivityId).length
                    : 0
                }
                unsharedCount={
                  sessions.filter((s) => s.stravaActivityId != null && !s.isStravaConfirmed).length
                }
                onSyncAll={handleSyncAllStrava}
                onShareAll={handleBulkConfirmStrava}
                isSyncPending={stravaSyncBulk.isPending}
                isSharePending={bulkConfirmStrava.isPending}
              />
            </>
          ))}

        {/* Delete session confirmation */}
        <DeleteConfirmationDialog
          open={!!deleteConfirmId}
          onOpenChange={(open) => {
            if (!open) setDeleteConfirmId(null);
          }}
          title={t('common:session.delete' as never)}
          description={t('common:session.deleteConfirm' as never)}
          confirmLabel={t('common:session.delete' as never)}
          cancelLabel={t('common:actions.cancel' as never)}
          onConfirm={() => {
            deleteSessionMut.mutate(deleteConfirmId!);
            setDeleteConfirmId(null);
          }}
          isPending={deleteSessionMut.isPending}
        />
      </div>
    </>
  );
}
