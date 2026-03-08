import { DayColumn } from './DayColumn';
import { DAYS_OF_WEEK, type DayOfWeek, type TrainingSession, type SessionsByDay } from '~/types/training';

interface WeekGridProps {
  sessionsByDay: SessionsByDay;
  weekStart?: string;
  readonly?: boolean;
  athleteMode?: boolean;
  onAddSession?: (day: DayOfWeek) => void;
  onEditSession?: (session: TrainingSession) => void;
  onDeleteSession?: (sessionId: string) => void;
  onToggleComplete?: (sessionId: string, completed: boolean) => void;
  onUpdateNotes?: (sessionId: string, notes: string | null) => void;
  onUpdateCoachPostFeedback?: (sessionId: string, feedback: string | null) => void;
}

export function WeekGrid({
  sessionsByDay,
  weekStart,
  readonly = false,
  athleteMode = false,
  onAddSession,
  onEditSession,
  onDeleteSession,
  onToggleComplete,
  onUpdateNotes,
  onUpdateCoachPostFeedback,
}: WeekGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
      {DAYS_OF_WEEK.map((day) => (
        <DayColumn
          key={day}
          day={day}
          sessions={sessionsByDay[day] ?? []}
          readonly={readonly}
          athleteMode={athleteMode}
          onAddSession={onAddSession}
          onEditSession={onEditSession}
          onDeleteSession={onDeleteSession}
          onToggleComplete={onToggleComplete}
          weekStart={weekStart}
          onUpdateNotes={onUpdateNotes}
          onUpdateCoachPostFeedback={onUpdateCoachPostFeedback}
        />
      ))}
    </div>
  );
}
