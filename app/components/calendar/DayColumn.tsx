import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { addDays, format, parseISO } from 'date-fns';
import { Button } from '~/components/ui/button';
import { SessionCard } from './SessionCard';
import { DAYS_OF_WEEK, type DayOfWeek, type TrainingSession, type AthleteSessionUpdate } from '~/types/training';

interface DayColumnProps {
  day: DayOfWeek;
  sessions: TrainingSession[];
  weekStart?: string;
  readonly?: boolean;
  athleteMode?: boolean;
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

export function DayColumn({
  day,
  sessions,
  weekStart,
  readonly = false,
  athleteMode = false,
  onAddSession,
  onEditSession,
  onDeleteSession,
  onToggleComplete,
  onUpdateNotes,
  onUpdatePerformance,
  onUpdateCoachPostFeedback,
  stravaConnected,
  onSyncStrava,
}: DayColumnProps) {
  const { t } = useTranslation();

  const isWeekend = day === 'saturday' || day === 'sunday';

  const dayDate = weekStart
    ? addDays(parseISO(weekStart), DAYS_OF_WEEK.indexOf(day))
    : null;

  return (
    <div
      className={`rounded-lg border bg-card p-2 min-h-[200px] flex flex-col ${
        isWeekend ? 'bg-muted/30' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {t(`daysShort.${day}`)}
          {dayDate && (
            <span className="ml-1 normal-case">{format(dayDate, 'dd-MM-yy')}</span>
          )}
        </h3>
        {!readonly && !athleteMode && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={() => onAddSession?.(day)}
          >
            <Plus className="h-3 w-3" />
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-1.5 flex-1">
        {sessions.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            readonly={readonly}
            athleteMode={athleteMode}
            onEdit={onEditSession}
            onDelete={onDeleteSession}
            onToggleComplete={onToggleComplete}
            onUpdateNotes={onUpdateNotes}
            onUpdatePerformance={onUpdatePerformance}
            onUpdateCoachPostFeedback={onUpdateCoachPostFeedback}
            stravaConnected={stravaConnected}
            onSyncStrava={onSyncStrava}
          />
        ))}

        {sessions.length === 0 && !readonly && !athleteMode && (
          <button
            onClick={() => onAddSession?.(day)}
            className="flex-1 flex items-center justify-center border border-dashed rounded-md text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors min-h-[60px]"
          >
            <Plus className="h-3 w-3 mr-1" />
            {t('actions.add')}
          </button>
        )}

        {sessions.length === 0 && (readonly || athleteMode) && (
          <div className="flex-1 flex items-center justify-center text-[10px] text-muted-foreground min-h-[60px]">
            -
          </div>
        )}
      </div>
    </div>
  );
}
