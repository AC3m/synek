import { useCallback } from 'react';
import { useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { WeekNavigation } from '~/components/calendar/WeekNavigation';
import { WeekGrid } from '~/components/calendar/WeekGrid';
import { WeekSummary } from '~/components/calendar/WeekSummary';
import { WeekSkeleton } from '~/components/calendar/WeekSkeleton';
import { useWeekPlan } from '~/lib/hooks/useWeekPlan';
import { useSessions, useUpdateAthleteSession } from '~/lib/hooks/useSessions';
import { weekIdToMonday } from '~/lib/utils/date';
import { groupSessionsByDay, computeWeekStats } from '~/lib/utils/week-view';

export default function AthleteWeekView() {
  const { weekId } = useParams();
  const { t } = useTranslation('athlete');

  const weekStart = weekId ? weekIdToMonday(weekId) : '';

  // Queries
  const { data: weekPlan, isLoading: weekLoading } = useWeekPlan(weekStart);
  const { data: sessions = [] } = useSessions(weekPlan?.id);
  const updateAthlete = useUpdateAthleteSession();

  const sessionsByDay = groupSessionsByDay(sessions);
  const stats = computeWeekStats(sessions);

  const handleToggleComplete = useCallback(
    (sessionId: string, completed: boolean) => {
      updateAthlete.mutate({ id: sessionId, isCompleted: completed });
    },
    [updateAthlete]
  );

  const handleUpdateNotes = useCallback(
    (sessionId: string, notes: string | null) => {
      updateAthlete.mutate({ id: sessionId, athleteNotes: notes });
    },
    [updateAthlete]
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
          <WeekNavigation weekId={weekId} basePath="athlete" />
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
        <WeekNavigation weekId={weekId} basePath="athlete" />
      </div>

      {/* Week Summary (readonly with progress bar) */}
      <WeekSummary weekPlan={weekPlan} stats={stats} readonly />

      {/* Week Grid (athlete mode: completion + feedback) */}
      <WeekGrid
        sessionsByDay={sessionsByDay}
        athleteMode
        onToggleComplete={handleToggleComplete}
        onUpdateNotes={handleUpdateNotes}
      />
    </div>
  );
}
