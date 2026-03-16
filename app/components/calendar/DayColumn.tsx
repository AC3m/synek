import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { addDays, format, isToday, parseISO } from 'date-fns';
import { cn } from '~/lib/utils';
import { Button } from '~/components/ui/button';
import { SessionCard } from './SessionCard';
import type { UserRole } from '~/lib/auth';
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
  junctionConnected?: boolean;
  onSyncStrava?: (sessionId: string) => Promise<void>;
  onConfirmStrava?: (sessionId: string) => Promise<void>;
  userRole?: UserRole;
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
  junctionConnected,
  onSyncStrava,
  onConfirmStrava,
  userRole,
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
        'rounded-xl bg-surface-1 p-3 min-h-[200px] flex flex-col ring-1 ring-[color:var(--border)]',
        isWeekend && 'bg-surface-2/40',
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <h3 className="text-[10px] font-semibold text-[color:var(--foreground-secondary)] uppercase tracking-[0.08em]">
            {t(`daysShort.${day}`)}
          </h3>
          {dayDate && (
            <span
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums',
                isCurrentDay
                  ? 'bg-foreground text-background'
                  : 'text-[color:var(--foreground-secondary)]'
              )}
            >
              {format(dayDate, 'd')}
            </span>
          )}
        </div>
        {!readonly && !!onAddSession && (
          <Button
            variant="ghost"
            size="icon"
            disabled={hasRestDay}
            className="h-8 w-8 sm:h-6 sm:w-6"
            onClick={() => onAddSession(day)}
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
            weekStart={weekStart}
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
            junctionConnected={junctionConnected}
            onSyncStrava={onSyncStrava}
            onConfirmStrava={onConfirmStrava}
            userRole={userRole}
          />
        ))}

        {sessions.length === 0 && !readonly && !!onAddSession && (
          <button
            onClick={() => onAddSession(day)}
            className="flex-1 flex items-center justify-center border border-dashed border-[color:var(--border)] rounded-xl text-xs text-[color:var(--foreground-tertiary)] hover:border-foreground/20 hover:text-[color:var(--foreground-secondary)] transition-colors min-h-[56px] w-full"
          >
            <Plus className="h-3 w-3 mr-1" />
            {t('actions.add')}
          </button>
        )}

        {sessions.length === 0 && (readonly || !onAddSession) && (
          <div className="flex-1 flex items-center justify-center text-[10px] text-[color:var(--foreground-tertiary)] min-h-[60px]">
            —
          </div>
        )}
      </div>
    </div>
  );
}
