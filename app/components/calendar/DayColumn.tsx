import { useTranslation } from 'react-i18next';
import { Plus, Copy } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { addDays, format, isToday, parseISO } from 'date-fns';
import { cn } from '~/lib/utils';
import { Button } from '~/components/ui/button';
import { SessionCard } from './SessionCard';
import { useSessionActions } from '~/lib/context/SessionActionsContext';
import { DAYS_OF_WEEK, type DayOfWeek, type TrainingSession } from '~/types/training';

interface DayColumnProps {
  day: DayOfWeek;
  sessions: TrainingSession[];
  weekStart?: string;
  onAddSession?: (day: DayOfWeek) => void;
  /** In read-only mode: copy this day's sessions to the target week */
  onCopyDay?: (day: DayOfWeek) => void;
  /** In read-only mode: opens day-picker to copy a single session */
  onCopySession?: (session: TrainingSession) => void;
  /** Enable this column as a drag-and-drop drop target */
  droppable?: boolean;
  /** Enable drag handles on session cards */
  draggableSessions?: boolean;
}

export function DayColumn({
  day,
  sessions,
  weekStart,
  onAddSession,
  onCopyDay,
  onCopySession,
  droppable = false,
  draggableSessions = false,
}: DayColumnProps) {
  const { t } = useTranslation();
  const { t: tCoach } = useTranslation('coach');
  const { readonly } = useSessionActions();

  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: day, disabled: !droppable });

  const isWeekend = day === 'saturday' || day === 'sunday';
  const hasRestDay = sessions.some((s) => s.trainingType === 'rest_day');

  const dayDate = weekStart ? addDays(parseISO(weekStart), DAYS_OF_WEEK.indexOf(day)) : null;

  const isCurrentDay = dayDate ? isToday(dayDate) : false;

  return (
    <div
      ref={droppable ? setDropRef : undefined}
      className={cn(
        'flex min-h-[200px] flex-col rounded-xl bg-surface-1 p-3 ring-1 ring-[color:var(--border)]',
        isWeekend && 'bg-surface-2/40',
        isOver && 'bg-primary/5 ring-2 ring-primary/40',
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <h3 className="text-[10px] font-semibold tracking-[0.08em] text-[color:var(--foreground-secondary)] uppercase">
            {t(`daysShort.${day}`)}
          </h3>
          {dayDate && (
            <span
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums',
                isCurrentDay
                  ? 'bg-foreground text-background'
                  : 'text-[color:var(--foreground-secondary)]',
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
        {readonly && !!onCopyDay && sessions.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={() => onCopyDay(day)}
            title={tCoach('history.copyDay')}
          >
            <Copy className="h-3 w-3" />
          </Button>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5">
        {sessions.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            weekStart={weekStart}
            onCopy={onCopySession}
            draggable={draggableSessions}
          />
        ))}

        {sessions.length === 0 && !readonly && !!onAddSession && (
          <button
            onClick={() => onAddSession(day)}
            className="flex min-h-[56px] w-full flex-1 items-center justify-center rounded-xl border border-dashed border-[color:var(--border)] text-xs text-[color:var(--foreground-tertiary)] transition-colors hover:border-foreground/20 hover:text-[color:var(--foreground-secondary)]"
          >
            <Plus className="mr-1 h-3 w-3" />
            {t('actions.add')}
          </button>
        )}

        {sessions.length === 0 && (readonly || !onAddSession) && (
          <div className="flex min-h-[60px] flex-1 items-center justify-center text-[10px] text-[color:var(--foreground-tertiary)]">
            —
          </div>
        )}
      </div>
    </div>
  );
}
