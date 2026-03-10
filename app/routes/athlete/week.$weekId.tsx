import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Zap } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { WeekNavigation } from '~/components/calendar/WeekNavigation';
import { WeekGrid } from '~/components/calendar/WeekGrid';
import { WeekSummary } from '~/components/calendar/WeekSummary';
import { WeekSkeleton } from '~/components/calendar/WeekSkeleton';
import { SessionForm } from '~/components/training/SessionForm';
import { useWeekPlan, useGetOrCreateWeekPlan } from '~/lib/hooks/useWeekPlan';
import {
  useSessions,
  useUpdateAthleteSession,
  useCreateSession,
  useUpdateSession,
  useDeleteSession,
} from '~/lib/hooks/useSessions';
import { useStravaConnectionStatus, useStravaSync } from '~/lib/hooks/useStravaConnection';
import { useSelfPlanPermission } from '~/lib/hooks/useProfile';
import { useAuth } from '~/lib/context/AuthContext';
import { useLocalePath } from '~/lib/hooks/useLocalePath';
import { weekIdToMonday, parseWeekId } from '~/lib/utils/date';
import { groupSessionsByDay, computeWeekStats } from '~/lib/utils/week-view';
import type { DayOfWeek, TrainingSession, AthleteSessionUpdate, CreateSessionInput, UpdateSessionInput } from '~/types/training';

export default function AthleteWeekView() {
  const { weekId } = useParams();
  const { t } = useTranslation('athlete');
  const { user } = useAuth();
  const localePath = useLocalePath();

  const weekStart = weekId ? weekIdToMonday(weekId) : '';
  const { year, weekNumber } = weekId
    ? parseWeekId(weekId)
    : { year: 0, weekNumber: 0 };

  const { data: canSelfPlan = true } = useSelfPlanPermission(user?.id ?? '');

  // Queries
  const { data: weekPlan, isLoading: weekLoading } = useWeekPlan(weekStart);
  const { data: sessions = [] } = useSessions(weekPlan?.id);
  const updateAthlete = useUpdateAthleteSession();
  const { data: stravaStatus } = useStravaConnectionStatus(user?.id ?? '');
  const stravaSync = useStravaSync();

  // Planning hooks — only used when canSelfPlan
  const getOrCreate = useGetOrCreateWeekPlan();
  const createSession = useCreateSession();
  const updateSession = useUpdateSession();
  const deleteSessionMut = useDeleteSession();

  // Auto-create week plan when self-planning is enabled and no plan exists
  const mutatingRef = useRef(false);
  useEffect(() => {
    if (!canSelfPlan || !weekId || weekLoading || weekPlan || mutatingRef.current) return;
    mutatingRef.current = true;
    getOrCreate.mutate(
      { weekStart, year, weekNumber },
      { onSettled: () => { mutatingRef.current = false; } }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSelfPlan, weekId, weekLoading, weekPlan, weekStart, year, weekNumber]);

  // Planning form state
  const [formOpen, setFormOpen] = useState(false);
  const [formDay, setFormDay] = useState<DayOfWeek | undefined>();
  const [editingSession, setEditingSession] = useState<TrainingSession | null>(null);

  const sessionsByDay = groupSessionsByDay(sessions);
  const stats = computeWeekStats(sessions);

  const stravaConnected = stravaStatus?.connected ?? false;

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

  const handleUpdatePerformance = useCallback(
    (sessionId: string, update: Omit<AthleteSessionUpdate, 'id'>) => {
      updateAthlete.mutate({ id: sessionId, ...update });
    },
    [updateAthlete]
  );

  const handleSyncStrava = useCallback(() => {
    if (user) {
      stravaSync.mutate({ userId: user.id, weekStart });
    }
  }, [stravaSync, user, weekStart]);

  const handleAddSession = useCallback((day: DayOfWeek) => {
    setEditingSession(null);
    setFormDay(day);
    setFormOpen(true);
  }, []);

  const handleEditSession = useCallback((session: TrainingSession) => {
    setEditingSession(session);
    setFormDay(session.dayOfWeek);
    setFormOpen(true);
  }, []);

  const handleDeleteSession = useCallback(
    (sessionId: string) => {
      if (window.confirm(t('common:session.deleteConfirm' as never))) {
        deleteSessionMut.mutate(sessionId);
      }
    },
    [t, deleteSessionMut]
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
    [createSession, updateSession]
  );

  if (!weekId) return null;

  if (weekLoading || (canSelfPlan && getOrCreate.isPending && !weekPlan)) {
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
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold">{t('title')}</h1>
          {stravaConnected ? (
            <Button
              size="sm"
              variant="outline"
              disabled={stravaSync.isPending}
              onClick={handleSyncStrava}
              className="gap-1.5 text-orange-600 border-orange-300 hover:bg-orange-50 dark:text-orange-400 dark:border-orange-800 dark:hover:bg-orange-950"
            >
              <Zap className="h-3.5 w-3.5" />
              {stravaSync.isPending ? t('common:strava.syncing' as never) : t('common:strava.syncNow' as never)}
            </Button>
          ) : (
            <Link
              to={localePath('/settings')}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
            >
              {t('common:strava.connect' as never)}
            </Link>
          )}
        </div>
        <WeekNavigation weekId={weekId} basePath="athlete" />
      </div>

      {/* Week Summary (readonly with progress bar) */}
      <WeekSummary weekPlan={weekPlan} stats={stats} readonly />

      {/* Week Grid */}
      <WeekGrid
        sessionsByDay={sessionsByDay}
        weekStart={weekStart}
        athleteMode
        onToggleComplete={handleToggleComplete}
        onUpdateNotes={handleUpdateNotes}
        onUpdatePerformance={handleUpdatePerformance}
        stravaConnected={stravaConnected}
        onSyncStrava={handleSyncStrava}
        {...(canSelfPlan && {
          onAddSession: handleAddSession,
          onEditSession: handleEditSession,
          onDeleteSession: handleDeleteSession,
        })}
      />

      {/* Session Form — only shown when self-planning is enabled */}
      {canSelfPlan && (
        <SessionForm
          open={formOpen}
          onClose={() => setFormOpen(false)}
          weekPlanId={weekPlan.id}
          day={formDay}
          session={editingSession}
          onSubmit={handleFormSubmit}
        />
      )}
    </div>
  );
}
