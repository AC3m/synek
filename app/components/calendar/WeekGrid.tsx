import { DayColumn } from './DayColumn';
import { DAYS_OF_WEEK, type DayOfWeek, type TrainingSession, type SessionsByDay, type AthleteSessionUpdate } from '~/types/training';

interface WeekGridProps {
  sessionsByDay: SessionsByDay;
  weekStart?: string;
  readonly?: boolean;
  athleteMode?: boolean;
  /** Show completion/notes/performance controls even when athleteMode is false */
  showAthleteControls?: boolean;
  onAddSession?: (day: DayOfWeek) => void;
  onEditSession?: (session: TrainingSession) => void;
  onDeleteSession?: (sessionId: string) => void;
  onToggleComplete?: (sessionId: string, completed: boolean) => void;
  onUpdateNotes?: (sessionId: string, notes: string | null) => void;
  onUpdatePerformance?: (sessionId: string, update: Omit<AthleteSessionUpdate, 'id'>) => void;
  onUpdateCoachPostFeedback?: (sessionId: string, feedback: string | null) => void;
  stravaConnected?: boolean;
  onSyncStrava?: () => void;
}

export function WeekGrid({
  sessionsByDay,
  weekStart,
  readonly = false,
  athleteMode = false,
  showAthleteControls = false,
  onAddSession,
  onEditSession,
  onDeleteSession,
  onToggleComplete,
  onUpdateNotes,
  onUpdatePerformance,
  onUpdateCoachPostFeedback,
  stravaConnected,
  onSyncStrava,
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
          showAthleteControls={showAthleteControls}
          onAddSession={onAddSession}
          onEditSession={onEditSession}
          onDeleteSession={onDeleteSession}
          onToggleComplete={onToggleComplete}
          weekStart={weekStart}
          onUpdateNotes={onUpdateNotes}
          onUpdatePerformance={onUpdatePerformance}
          onUpdateCoachPostFeedback={onUpdateCoachPostFeedback}
          stravaConnected={stravaConnected}
          onSyncStrava={onSyncStrava}
        />
      ))}
    </div>
  );
}
