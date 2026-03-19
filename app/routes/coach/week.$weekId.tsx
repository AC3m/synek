import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '~/components/ui/dialog';
import { Button } from '~/components/ui/button';
import { WeekNavigation } from '~/components/calendar/WeekNavigation';
import { MultiWeekView } from '~/components/calendar/MultiWeekView';
import { WeekSummary } from '~/components/calendar/WeekSummary';
import { WeekSkeleton } from '~/components/calendar/WeekSkeleton';
import { SessionForm } from '~/components/training/SessionForm';
import { useWeekPlan, useGetOrCreateWeekPlan, useUpdateWeekPlan } from '~/lib/hooks/useWeekPlan';
import { useSessions, useCreateSession, useUpdateSession, useDeleteSession, useUpdateAthleteSession } from '~/lib/hooks/useSessions';
import { useAuth } from '~/lib/context/AuthContext';
import { weekIdToMonday, parseWeekId, getTodayDayOfWeek } from '~/lib/utils/date';
import { groupSessionsByDay, computeWeekStats } from '~/lib/utils/week-view';
import type {
  DayOfWeek,
  TrainingSession,
  CreateSessionInput,
  UpdateSessionInput,
  AthleteSessionUpdate,
  WeekPlan,
} from '~/types/training';

export default function CoachWeekView() {
  const { weekId } = useParams();
  const { t } = useTranslation('coach');
  const { user, effectiveAthleteId } = useAuth();

  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(() => getTodayDayOfWeek());

  const isViewingSelf = !!effectiveAthleteId && effectiveAthleteId === user?.id;

  const weekStart = weekId ? weekIdToMonday(weekId) : '';
  const { year, weekNumber } = weekId
    ? parseWeekId(weekId)
    : { year: 0, weekNumber: 0 };

  // Queries
  const { data: weekPlan, isLoading: weekLoading } = useWeekPlan(weekStart);
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
      { onSettled: () => { mutatingRef.current = false; } }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekId, weekLoading, weekPlan, weekStart, year, weekNumber]);

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [formDay, setFormDay] = useState<DayOfWeek | undefined>();
  const [editingSession, setEditingSession] = useState<TrainingSession | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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
    (sessionId: string) => { setDeleteConfirmId(sessionId); },
    []
  );

  const handleFormSubmit = useCallback(
    (data: CreateSessionInput | UpdateSessionInput) => {
      if ('weekPlanId' in data) {
        createSession.mutate(data);
      } else {
        updateSession.mutate(data);
      }
    },
    [createSession, updateSession]
  );

  const handleWeekUpdate = useCallback(
    (
      updates: Partial<
        Pick<WeekPlan, 'loadType' | 'totalPlannedKm' | 'actualTotalKm' | 'coachComments'>
      >
    ) => {
      if (!weekPlan) return;
      updateWeek.mutate({ id: weekPlan.id, ...updates });
    },
    [weekPlan, updateWeek]
  );

  const handleUpdateCoachPostFeedback = useCallback(
    (sessionId: string, feedback: string | null) => {
      updateSession.mutate({ id: sessionId, coachPostFeedback: feedback });
    },
    [updateSession]
  );

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

  if (!weekId) return null;

  const isInitialLoad = weekLoading && !weekPlan && !getOrCreate.isPending;
  const showSkeleton = isInitialLoad || (getOrCreate.isPending && !weekPlan);

  const sessionsByDay = !showSkeleton && weekPlan ? groupSessionsByDay(sessions) : null;
  const stats = !showSkeleton && weekPlan ? computeWeekStats(sessions) : null;

  return (
    <div key={weekId} className="space-y-6 animate-in fade-in duration-200">
      {showSkeleton ? <WeekSkeleton /> : weekPlan && sessionsByDay && stats && (
        <>
          {/* Header with navigation */}
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-xl font-bold whitespace-nowrap shrink-0">{t('title')}</h1>
            <WeekNavigation weekId={weekId} basePath="coach" selectedDay={selectedDay} isLoading={weekLoading} />
          </div>

          {/* Week Summary */}
          <WeekSummary
            weekPlan={weekPlan}
            stats={stats}
            onUpdate={handleWeekUpdate}
          />

          {/* Multi-Week View (current week + 4 history rows) */}
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
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
        <DialogContent showCloseButton={false} className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('session.delete')}</DialogTitle>
            <DialogDescription>{t('session.deleteConfirm')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setDeleteConfirmId(null)}>
              {t('common:actions.cancel' as never)}
            </Button>
            <Button variant="destructive" size="sm" onClick={() => { deleteSessionMut.mutate(deleteConfirmId!); setDeleteConfirmId(null); }}>
              {t('session.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
