import { useCallback } from 'react';
import { useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { WeekNavigation } from '~/components/calendar/WeekNavigation';
import { WeekGrid } from '~/components/calendar/WeekGrid';
import { WeekSummary } from '~/components/calendar/WeekSummary';
import { WeekSkeleton } from '~/components/calendar/WeekSkeleton';
import { useWeekPlan } from '~/lib/hooks/useWeekPlan';
import { useSessions, useUpdateTraineeSession } from '~/lib/hooks/useSessions';
import { weekIdToMonday } from '~/lib/utils/date';
import { groupSessionsByDay, computeWeekStats } from '~/lib/utils/week-view';

export default function TraineeWeekView() {
  const { weekId } = useParams();
  const { t } = useTranslation('trainee');

  const weekStart = weekId ? weekIdToMonday(weekId) : '';

  // Queries
  const { data: weekPlan, isLoading: weekLoading } = useWeekPlan(weekStart);
  const { data: sessions = [] } = useSessions(weekPlan?.id);
  const updateTrainee = useUpdateTraineeSession();

  const sessionsByDay = groupSessionsByDay(sessions);
  const stats = computeWeekStats(sessions);

  const handleToggleComplete = useCallback(
    (sessionId: string, completed: boolean) => {
      updateTrainee.mutate({ id: sessionId, isCompleted: completed });
    },
    [updateTrainee]
  );

  const handleUpdateNotes = useCallback(
    (sessionId: string, notes: string | null) => {
      updateTrainee.mutate({ id: sessionId, traineeNotes: notes });
    },
    [updateTrainee]
  );

  if (!weekId) return null;

  if (weekLoading) {
    return <WeekSkeleton />;
  }

  if (!weekPlan) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="text-xl sm:text-2xl font-bold">{t('title')}</h1>
          <WeekNavigation weekId={weekId} basePath="trainee" />
        </div>
        <div className="text-center py-20 text-muted-foreground">
          {t('noTrainingPlan')}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold">{t('title')}</h1>
        <WeekNavigation weekId={weekId} basePath="trainee" />
      </div>

      {/* Week Summary (readonly with progress bar) */}
      <WeekSummary weekPlan={weekPlan} stats={stats} readonly />

      {/* Week Grid (trainee mode: completion + feedback) */}
      <WeekGrid
        sessionsByDay={sessionsByDay}
        traineeMode
        onToggleComplete={handleToggleComplete}
        onUpdateNotes={handleUpdateNotes}
      />
    </div>
  );
}
