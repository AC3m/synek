import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { WeekNavigation } from '~/components/calendar/WeekNavigation';
import { GoalPrepBanner } from '~/components/calendar/GoalPrepBanner';
import { WeekGrid } from '~/components/calendar/WeekGrid';
import { WeekSummary } from '~/components/calendar/WeekSummary';
import { AppLoader } from '~/components/ui/app-loader';
import { StaggerIn } from '~/components/ui/stagger-in';
import { SessionForm } from '~/components/training/SessionForm';
import { DeleteConfirmationDialog } from '~/components/training/DeleteConfirmationDialog';
import { useConfirmStravaSession, useBulkConfirmStravaSessions } from '~/lib/hooks/useSessions';
import { useStravaConnectionStatus, useStravaSync } from '~/lib/hooks/useStravaConnection';
import {
  useJunctionConnectionStatus,
  useJunctionWeekWorkouts,
} from '~/lib/hooks/useJunctionConnection';
import { useSelfPlanPermission } from '~/lib/hooks/useProfile';
import { useGoals } from '~/lib/hooks/useGoals';
import { useAuth } from '~/lib/context/AuthContext';
import { queryKeys } from '~/lib/queries/keys';
import { weekIdToMonday, getTodayDayOfWeek } from '~/lib/utils/date';
import { isCompetitionWeek } from '~/lib/utils/goals';
import { computeWeekStats, augmentSessionsWithGarmin } from '~/lib/utils/week-view';
import { computeSportBreakdown } from '~/lib/utils/analytics';
import { StravaActionsBar } from '~/components/calendar/StravaActionsBar';
import { useWeekView } from '~/lib/hooks/useWeekView';
import { cn } from '~/lib/utils';
import type { DayOfWeek } from '~/types/training';
import { useParams, useLocation } from 'react-router';

export default function AthleteWeekView() {
  const { weekId } = useParams();
  const location = useLocation();
  const { t } = useTranslation('athlete');
  const { user } = useAuth();
  const qc = useQueryClient();

  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(() => getTodayDayOfWeek());

  useEffect(() => {
    if (location.state?.resetToToday) {
      setSelectedDay(getTodayDayOfWeek());
    }
  }, [location.state?.resetToToday]);

  // Derive weekStart before the hook call — needed for useJunctionWeekWorkouts below
  const weekStart = weekId ? weekIdToMonday(weekId) : '';

  const { data: canSelfPlan = true } = useSelfPlanPermission(user?.id ?? '');
  const { data: goals = [] } = useGoals(user?.id ?? '');

  // Athlete-only: Strava + Garmin
  const { data: stravaStatus } = useStravaConnectionStatus(user?.id ?? '');
  const { data: junctionConnection } = useJunctionConnectionStatus(user?.id ?? '');
  const stravaSyncSingle = useStravaSync();
  const stravaSyncBulk = useStravaSync();
  const confirmStrava = useConfirmStravaSession();
  const bulkConfirmStrava = useBulkConfirmStravaSessions();

  const stravaConnected = stravaStatus?.connected ?? false;
  const junctionConnected = junctionConnection?.status === 'active';

  // PoC: Junction Garmin integration — remove after evaluation
  const { data: garminWeekWorkouts = [] } = useJunctionWeekWorkouts(
    user?.id ?? '',
    weekStart,
    junctionConnected,
  );

  // Garmin-augmented sessions fed into the hook for stats computation
  // The hook provides raw `sessions`; augmentation is athlete-only
  const weekView = useWeekView({ canAutoCreate: canSelfPlan });

  const competitionGoal = useMemo(
    () => (weekStart ? (goals.find((g) => isCompetitionWeek(weekStart, g)) ?? null) : null),
    [goals, weekStart],
  );

  const augmentedSessions = useMemo(
    () =>
      weekView && junctionConnected
        ? augmentSessionsWithGarmin(weekView.sessions, garminWeekWorkouts, weekStart)
        : (weekView?.sessions ?? []),
    [junctionConnected, weekView?.sessions, garminWeekWorkouts, weekStart],
  );

  const stats = useMemo(() => {
    const base = computeWeekStats(augmentedSessions);
    const breakdown = computeSportBreakdown(augmentedSessions);
    const competitionSessions = breakdown.competitionSessions.map((cs) => {
      const goal = goals.find((g) => g.id === cs.goalId);
      if (!goal) return cs;
      return { ...cs, goalName: goal.name, goalDistanceKm: goal.goalDistanceKm };
    });
    return { ...base, byType: breakdown.byType, competitionSessions };
  }, [augmentedSessions, goals]);

  // Strava handlers — athlete only
  const handleSyncStrava = useCallback(
    async (sessionId: string) => {
      if (!user) return;
      try {
        await stravaSyncSingle.mutateAsync({ weekStart, sessionId });
      } catch {
        // mutation errors are handled by useStravaSync's onError
      } finally {
        if (weekView?.weekPlan?.id) {
          void qc.refetchQueries({ queryKey: queryKeys.sessions.byWeek(weekView.weekPlan.id) });
        }
      }
    },
    [stravaSyncSingle, user, weekStart, qc, weekView?.weekPlan?.id],
  );

  const handleSyncAllStrava = useCallback(() => {
    stravaSyncBulk.mutate({ weekStart });
  }, [stravaSyncBulk, weekStart]);

  const handleConfirmStrava = useCallback(
    (sessionId: string) => confirmStrava.mutateAsync(sessionId),
    [confirmStrava],
  );

  const handleBulkConfirmStrava = useCallback(async () => {
    if (!weekView?.weekPlan) return;
    try {
      await bulkConfirmStrava.mutateAsync(weekView.weekPlan.id);
    } catch {
      // handled by hook's onError
    } finally {
      void qc.refetchQueries({ queryKey: queryKeys.sessions.byWeek(weekView.weekPlan.id) });
    }
  }, [bulkConfirmStrava, weekView?.weekPlan, qc]);

  if (!weekView) return null;

  const {
    weekId: currentWeekId,
    weekPlan,
    weekFetching,
    sessions,
    sessionsByDay,
    showStaleContent,
    showSkeleton,
    formOpen,
    setFormOpen,
    formDay,
    editingSession,
    deleteConfirmId,
    setDeleteConfirmId,
    handleAddSession,
    handleEditSession,
    handleDeleteSession,
    handleFormSubmit,
    handleToggleComplete,
    handleUpdateNotes,
    handleUpdatePerformance,
    deleteSessionMut,
  } = weekView;

  const competitionSession = competitionGoal
    ? (sessions.find((s) => s.goalId === competitionGoal.id) ?? null)
    : null;

  return (
    <>
      {showSkeleton && <AppLoader />}
      <div key={currentWeekId} className="animate-in space-y-6 duration-200 fade-in">
        {!showSkeleton &&
          (!weekPlan ? (
            <>
              <StaggerIn>
                <div className="flex items-center gap-2">
                  <h1 className="shrink-0 text-base font-bold whitespace-nowrap sm:text-xl">
                    {t('title')}
                  </h1>
                  <WeekNavigation
                    weekId={currentWeekId}
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
                    weekId={currentWeekId}
                    basePath="athlete"
                    selectedDay={selectedDay}
                    isLoading={weekFetching}
                  />
                </div>
              </StaggerIn>

              {/* Goal preparation banners */}
              {goals.length > 0 && weekStart && (
                <GoalPrepBanner goals={goals} weekStart={weekStart} />
              )}

              {/* Week Summary (readonly with progress bar) */}
              <StaggerIn delay={60}>
                <div
                  className={cn('transition-opacity duration-300', showStaleContent && 'opacity-0')}
                >
                  <WeekSummary
                    weekPlan={weekPlan}
                    stats={stats}
                    readonly
                    competitionGoal={competitionGoal}
                    competitionSession={competitionSession}
                  />
                </div>
              </StaggerIn>

              {/* Week Grid */}
              <StaggerIn delay={120}>
                <div
                  className={cn('transition-opacity duration-300', showStaleContent && 'opacity-0')}
                >
                  <WeekGrid
                    sessionsByDay={sessionsByDay}
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
                </div>
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
