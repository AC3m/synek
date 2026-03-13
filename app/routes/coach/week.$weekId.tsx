import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { WeekNavigation } from '~/components/calendar/WeekNavigation';
import { WeekGrid } from '~/components/calendar/WeekGrid';
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
  const { data: sessions = [] } = useSessions(weekPlan?.id);

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
  const [editingSession, setEditingSession] = useState<TrainingSession | null>(
    null
  );

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
      if (window.confirm(t('session.deleteConfirm'))) {
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

  if (weekLoading || (getOrCreate.isPending && !weekPlan)) {
    return <WeekSkeleton />;
  }

  if (!weekPlan) return null;

  const sessionsByDay = groupSessionsByDay(sessions);
  const stats = computeWeekStats(sessions);

  return (
    <div className="space-y-6">
      {/* Header with navigation */}
      <div className="flex items-center gap-2">
        <h1 className="text-base sm:text-xl font-bold whitespace-nowrap shrink-0">{t('title')}</h1>
        <WeekNavigation weekId={weekId} basePath="coach" selectedDay={selectedDay} />
      </div>

      {/* Week Summary */}
      <WeekSummary
        weekPlan={weekPlan}
        stats={stats}
        onUpdate={handleWeekUpdate}
      />

      {/* Week Grid */}
      <WeekGrid
        sessionsByDay={sessionsByDay}
        weekStart={weekStart}
        onAddSession={handleAddSession}
        onEditSession={handleEditSession}
        onDeleteSession={handleDeleteSession}
        onUpdateCoachPostFeedback={handleUpdateCoachPostFeedback}
        userRole={user?.role}
        selectedDay={selectedDay}
        onSelectDay={setSelectedDay}
        {...(isViewingSelf && {
          showAthleteControls: true,
          onToggleComplete: handleToggleComplete,
          onUpdateNotes: handleUpdateNotes,
          onUpdatePerformance: handleUpdatePerformance,
        })}
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
    </div>
  );
}
