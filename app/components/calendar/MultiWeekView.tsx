import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { cn } from '~/lib/utils';
import { StaggerIn } from '~/components/ui/stagger-in';
import { WeekGrid } from './WeekGrid';
import { HistoryWeekRow } from './HistoryWeekRow';
import { useWeekHistory } from '~/lib/hooks/useWeekHistory';
import {
  useCopyWeekSessions,
  useCopyDaySessions,
  useCopySession,
  useUpdateSession,
} from '~/lib/hooks/useSessions';
import { getWeekDateRange, getTodayDayOfWeek, parseWeekId } from '~/lib/utils/date';
import type { UserRole } from '~/lib/auth';
import type {
  DayOfWeek,
  TrainingSession,
  WeekPlan,
  SessionsByDay,
  ReorderSessionInput,
  CopyDayInput,
} from '~/types/training';

interface MultiWeekViewProps {
  currentWeekId: string;
  currentWeekPlan: WeekPlan | null;
  currentSessions: TrainingSession[];
  currentSessionsByDay: SessionsByDay;
  onAddSession: (day: DayOfWeek) => void;
  onEditSession: (session: TrainingSession) => void;
  onDeleteSession: (sessionId: string) => void;
  onUpdateCoachPostFeedback: (sessionId: string, feedback: string | null) => void;
  userRole?: UserRole;
  showAthleteControls?: boolean;
  className?: string;
}

export function MultiWeekView({
  currentWeekId,
  currentWeekPlan,
  currentSessions,
  currentSessionsByDay,
  onAddSession,
  onEditSession,
  onDeleteSession,
  onUpdateCoachPostFeedback,
  userRole,
  showAthleteControls,
  className,
}: MultiWeekViewProps) {
  const { t } = useTranslation('coach');
  const location = useLocation();
  const history = useWeekHistory(currentWeekId, 4);
  const [expandedWeekIds, setExpandedWeekIds] = useState<Set<string>>(() => new Set());
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(() => getTodayDayOfWeek());

  // Reset to today's day when the user navigates to a different week
  useEffect(() => {
    setSelectedDay(getTodayDayOfWeek());
  }, [currentWeekId, location.state?.resetToToday]);

  const currentWeekLabel = getWeekDateRange(currentWeekId).formatted;
  const { weekNumber: currentWeekNumber } = parseWeekId(currentWeekId);

  const copyWeekMutation = useCopyWeekSessions();
  const copyDayMutation = useCopyDaySessions();
  const copySessionMutation = useCopySession();
  const updateSessionMutation = useUpdateSession();

  const targetWeekPlanId = currentWeekPlan?.id ?? '';

  const currentRestDays = useMemo(
    () =>
      new Set(
        Object.entries(currentSessionsByDay)
          .filter(([, sessions]) => sessions.some((s) => s.trainingType === 'rest_day'))
          .map(([day]) => day as DayOfWeek),
      ),
    [currentSessionsByDay],
  );

  function handleCopyWeek(sourceWeekPlanId: string) {
    if (!targetWeekPlanId) return;
    copyWeekMutation.mutate({ sourceWeekPlanId, targetWeekPlanId });
  }

  function handleCopyDay(input: CopyDayInput) {
    if (!targetWeekPlanId) return;
    copyDayMutation.mutate(input, {
      onSuccess: () => setSelectedDay(input.targetDay),
    });
  }

  function handleCopySession(session: TrainingSession, targetDay: DayOfWeek) {
    if (!targetWeekPlanId || session.trainingType === 'rest_day' || currentRestDays.has(targetDay))
      return;
    copySessionMutation.mutate(
      { session, targetWeekPlanId, targetDay },
      {
        onSuccess: () => setSelectedDay(targetDay),
      },
    );
  }

  const reversedHistory = useMemo(() => [...history].reverse(), [history]);

  function handleReorderSession(input: ReorderSessionInput) {
    updateSessionMutation.mutate({
      id: input.sessionId,
      dayOfWeek: input.dayOfWeek,
      sortOrder: input.sortOrder,
    });
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {/* History weeks (oldest first) */}
      <div data-testid="history-section" className="flex flex-col gap-1.5">
        {reversedHistory.map((hw, i) => (
          <StaggerIn key={hw.weekId} delay={i * 60}>
            <HistoryWeekRow
              weekId={hw.weekId}
              weekPlan={hw.weekPlan}
              sessions={hw.sessions}
              isLoading={hw.isLoading}
              isExpanded={expandedWeekIds.has(hw.weekId)}
              onToggleExpand={() =>
                setExpandedWeekIds((prev) => {
                  const next = new Set(prev);
                  next.has(hw.weekId) ? next.delete(hw.weekId) : next.add(hw.weekId);
                  return next;
                })
              }
              onCopyWeek={handleCopyWeek}
              onCopyDay={handleCopyDay}
              onCopySession={handleCopySession}
              targetWeekPlanId={targetWeekPlanId}
              targetRestDays={currentRestDays}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
            />
          </StaggerIn>
        ))}
      </div>

      {/* Current week header */}
      <div className="flex items-center gap-2 pt-1">
        <div className="h-px flex-1 bg-[color:var(--border)]" />
        <span className="px-2 text-[10px] font-semibold tracking-widest text-primary uppercase">
          {t('history.currentWeek')} {currentWeekNumber} · {currentWeekLabel}
        </span>
        <div className="h-px flex-1 bg-[color:var(--border)]" />
      </div>

      {/* Current week — full editable grid */}
      <div data-testid="current-week-section">
        <WeekGrid
          sessionsByDay={currentSessionsByDay}
          weekStart={currentWeekPlan?.weekStart}
          readonly={false}
          onAddSession={onAddSession}
          onEditSession={onEditSession}
          onDeleteSession={onDeleteSession}
          onUpdateCoachPostFeedback={onUpdateCoachPostFeedback}
          onReorderSession={handleReorderSession}
          userRole={userRole}
          showAthleteControls={showAthleteControls}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
        />
      </div>
    </div>
  );
}
