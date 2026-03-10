import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { addDays, format, isToday, parseISO } from 'date-fns';
import { cn } from '~/lib/utils';
import { Button } from '~/components/ui/button';
import { SessionCard } from './SessionCard';
import { DAYS_OF_WEEK, type DayOfWeek, type TrainingSession, type AthleteSessionUpdate } from '~/types/training';

interface DayColumnProps {
  day: DayOfWeek;
  sessions: TrainingSession[];
  weekStart?: string;
  readonly?: boolean;
  athleteMode?: boolean;
  /** Show completion/notes/performance controls even when athleteMode is false (e.g. coach viewing own plan) */
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

export function DayColumn({
  day,
  sessions,
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
}: DayColumnProps) {
  const { t } = useTranslation();

  const isWeekend = day === 'saturday' || day === 'sunday';
  const hasRestDay = sessions.some((s) => s.trainingType === 'rest_day');

  const dayDate = weekStart
    ? addDays(parseISO(weekStart), DAYS_OF_WEEK.indexOf(day))
    : null;

  const isCurrentDay = dayDate ? isToday(dayDate) : false;

  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-2 min-h-[200px] flex flex-col',
        isWeekend && 'bg-muted/30',
        isCurrentDay && 'border-primary ring-1 ring-primary/20',
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {t(`daysShort.${day}`)}
        </h3>
        <div className="flex items-center gap-1">
          {dayDate && (
            <span className={cn('text-xs normal-case', isCurrentDay ? 'text-primary font-semibold' : 'text-muted-foreground')}>
              {format(dayDate, 'dd-MM-yy')}
            </span>
          )}
          {!readonly && !!onAddSession && !hasRestDay && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 sm:h-5 sm:w-5"
              onClick={() => onAddSession(day)}
            >
              <Plus className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5 flex-1">
        {sessions.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            readonly={readonly}
            athleteMode={athleteMode}
            showAthleteControls={showAthleteControls}
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

        {sessions.length === 0 && !readonly && !!onAddSession && (
          <button
            onClick={() => onAddSession(day)}
            className="flex-1 flex items-center justify-center border border-dashed rounded-md text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors min-h-[60px]"
          >
            <Plus className="h-3 w-3 mr-1" />
            {t('actions.add')}
          </button>
        )}

        {sessions.length === 0 && (readonly || !onAddSession) && (
          <div className="flex-1 flex items-center justify-center text-[10px] text-muted-foreground min-h-[60px]">
            -
          </div>
        )}
      </div>
    </div>
  );
}
