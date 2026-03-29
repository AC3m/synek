import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { WeekNavigation } from '~/components/calendar/WeekNavigation';
import { MultiWeekView } from '~/components/calendar/MultiWeekView';
import { WeekSummary } from '~/components/calendar/WeekSummary';
import { GoalPrepBanner } from '~/components/calendar/GoalPrepBanner';
import { AppLoader } from '~/components/ui/app-loader';
import { StaggerIn } from '~/components/ui/stagger-in';
import { SessionForm } from '~/components/training/SessionForm';
import { DeleteConfirmationDialog } from '~/components/training/DeleteConfirmationDialog';
import { useUpdateWeekPlan } from '~/lib/hooks/useWeekPlan';
import { useGoals } from '~/lib/hooks/useGoals';
import { useAuth } from '~/lib/context/AuthContext';
import { getTodayDayOfWeek } from '~/lib/utils/date';
import { isCompetitionWeek } from '~/lib/utils/goals';
import { useWeekView } from '~/lib/hooks/useWeekView';
import { cn } from '~/lib/utils';
import type { WeekPlan, SessionsByDay } from '~/types/training';

export default function CoachWeekView() {
  const { t } = useTranslation('coach');
  const { user, effectiveAthleteId } = useAuth();
  const updateWeek = useUpdateWeekPlan();

  const weekView = useWeekView({ canAutoCreate: true });
  const athleteId = effectiveAthleteId ?? user?.id ?? '';
  const { data: goals = [] } = useGoals(athleteId);

  const handleWeekUpdate = useCallback(
    (
      updates: Partial<
        Pick<WeekPlan, 'loadType' | 'totalPlannedKm' | 'actualTotalKm' | 'coachComments'>
      >,
    ) => {
      if (!weekView?.weekPlan) return;
      updateWeek.mutate({ id: weekView.weekPlan.id, ...updates });
    },
    [weekView?.weekPlan, updateWeek],
  );

  const handleUpdateCoachPostFeedback = useCallback(
    (sessionId: string, feedback: string | null) => {
      weekView?.updateSession.mutate({ id: sessionId, coachPostFeedback: feedback });
    },
    [weekView?.updateSession],
  );

  if (!weekView) return null;

  const {
    weekId,
    weekStart,
    weekPlan,
    sessions,
    sessionsByDay,
    stats,
    weekFetching,
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

  const selectedDay = getTodayDayOfWeek();
  const isViewingSelf = !effectiveAthleteId || effectiveAthleteId === user?.id;

  const competitionGoal = useMemo(
    () => (weekStart ? (goals.find((g) => isCompetitionWeek(weekStart, g)) ?? null) : null),
    [goals, weekStart],
  );
  const competitionSession = useMemo(
    () => (competitionGoal ? (sessions.find((s) => s.goalId === competitionGoal.id) ?? null) : null),
    [competitionGoal, sessions],
  );

  const enrichedStats = useMemo(() => {
    if (!stats.competitionSessions.length || !goals.length) return stats;
    return {
      ...stats,
      competitionSessions: stats.competitionSessions.map((cs) => {
        const goal = goals.find((g) => g.id === cs.goalId);
        if (!goal) return cs;
        return { ...cs, goalName: goal.name, goalDistanceKm: goal.goalDistanceKm };
      }),
    };
  }, [stats, goals]);

  return (
    <>
      {showSkeleton && <AppLoader />}
      <div key={weekId} className="animate-in space-y-6 duration-200 fade-in">
        {!showSkeleton && weekPlan && (
          <>
            {/* Header with navigation */}
            <StaggerIn>
              <div className="flex items-center gap-2">
                <h1 className="shrink-0 text-base font-bold whitespace-nowrap sm:text-xl">
                  {t('title')}
                </h1>
                <WeekNavigation
                  weekId={weekId}
                  basePath="coach"
                  selectedDay={selectedDay}
                  isLoading={weekFetching}
                />
              </div>
            </StaggerIn>

            {/* Goal preparation banners */}
            {goals.length > 0 && weekStart && (
              <GoalPrepBanner goals={goals} weekStart={weekStart} />
            )}

            {/* Week Summary */}
            <StaggerIn delay={60}>
              <div
                className={cn('transition-opacity duration-300', showStaleContent && 'opacity-0')}
              >
                <WeekSummary
                  weekPlan={weekPlan}
                  stats={enrichedStats}
                  onUpdate={handleWeekUpdate}
                  competitionGoal={competitionGoal}
                  competitionSession={competitionSession}
                />
              </div>
            </StaggerIn>

            {/* Multi-Week View (current week + 4 history rows) */}
            <StaggerIn delay={120}>
              <div
                className={cn('transition-opacity duration-300', showStaleContent && 'opacity-0')}
              >
                <MultiWeekView
                  currentWeekId={weekId}
                  currentWeekPlan={showStaleContent ? null : weekPlan}
                  currentSessions={showStaleContent ? [] : sessions}
                  currentSessionsByDay={showStaleContent ? ({} as SessionsByDay) : sessionsByDay}
                  onAddSession={handleAddSession}
                  onEditSession={handleEditSession}
                  onDeleteSession={handleDeleteSession}
                  onUpdateCoachPostFeedback={handleUpdateCoachPostFeedback}
                  onToggleComplete={isViewingSelf ? handleToggleComplete : undefined}
                  onUpdateNotes={isViewingSelf ? handleUpdateNotes : undefined}
                  onUpdatePerformance={isViewingSelf ? handleUpdatePerformance : undefined}
                  userRole={user?.role}
                  showAthleteControls={isViewingSelf}
                />
              </div>
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
