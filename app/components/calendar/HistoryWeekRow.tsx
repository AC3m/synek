import { useState, useEffect } from 'react';
import { ChevronRight, Copy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '~/lib/utils';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { WeekGrid } from './WeekGrid';
import { WeekSkeleton } from './WeekSkeleton';
import { getWeekDateRange, parseWeekId } from '~/lib/utils/date';
import { DAYS_OF_WEEK, type DayOfWeek, type TrainingSession, type WeekPlan, type SessionsByDay, type CopyDayInput } from '~/types/training';

interface HistoryWeekRowProps {
  weekId: string;
  weekPlan: WeekPlan | null;
  sessions: TrainingSession[];
  isLoading?: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onCopyWeek: (sourceWeekPlanId: string) => void;
  onCopyDay: (input: CopyDayInput) => void;
  onCopySession: (session: TrainingSession, targetDay: DayOfWeek) => void;
  targetWeekPlanId: string;
  selectedDay?: DayOfWeek;
  onSelectDay?: (day: DayOfWeek) => void;
  className?: string;
}

export function HistoryWeekRow({
  weekId,
  weekPlan,
  sessions,
  isLoading = false,
  isExpanded,
  onToggleExpand,
  onCopyWeek,
  onCopyDay,
  onCopySession,
  targetWeekPlanId,
  selectedDay,
  onSelectDay,
  className,
}: HistoryWeekRowProps) {
  const { t } = useTranslation('coach');
  const { t: tCommon } = useTranslation('common');

  const [copyPickSession, setCopyPickSession] = useState<TrainingSession | null>(null);
  const [copyWeekPending, setCopyWeekPending] = useState(false);
  // Lazy-mount: only render inner content once expanded for the first time,
  // then keep it in the DOM so collapse/re-expand can animate smoothly.
  const [everExpanded, setEverExpanded] = useState(isExpanded);
  useEffect(() => {
    if (isExpanded) setEverExpanded(true);
  }, [isExpanded]);

  const { weekNumber } = parseWeekId(weekId);
  const { formatted: dateRange } = getWeekDateRange(weekId);
  const sessionCount = sessions.length;
  const copyableCount = sessions.filter((s) => s.trainingType !== 'rest_day').length;
  const canCopyWeek = !!weekPlan && copyableCount > 0;

  // Close session picker on Escape
  useEffect(() => {
    if (!copyPickSession) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setCopyPickSession(null);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [copyPickSession]);

  const sessionsByDay: SessionsByDay = DAYS_OF_WEEK.reduce(
    (acc, day) => ({
      ...acc,
      [day]: sessions.filter((s) => s.dayOfWeek === day),
    }),
    {} as SessionsByDay
  );

  function confirmCopyWeek() {
    if (!weekPlan) return;
    onCopyWeek(weekPlan.id);
    setCopyWeekPending(false);
  }

  return (
    <div
      data-testid="history-week-row"
      className={cn('rounded-xl border border-[color:var(--border)] bg-surface-1/60', className)}
    >
      {/* Header row */}
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          data-testid="history-week-toggle"
          aria-label={isExpanded ? t('history.collapse') : t('history.expand')}
          aria-expanded={isExpanded}
          onClick={onToggleExpand}
          className="flex flex-1 items-center gap-2 text-left hover:opacity-80 transition-opacity min-w-0"
        >
          <ChevronRight
            className={cn(
              'h-4 w-4 shrink-0 text-[color:var(--foreground-secondary)] transition-transform duration-300 ease-out',
              isExpanded && 'rotate-90'
            )}
          />
          <span className="text-sm font-medium truncate">
            {t('history.weekLabel', { week: weekNumber, range: dateRange })}
          </span>
          <span className="text-xs text-[color:var(--foreground-secondary)] shrink-0">
            {weekPlan
              ? t('history.sessionCount', { count: sessionCount })
              : t('history.noSessions')}
          </span>
        </button>

        {/* Copy Week — hidden on mobile (single-day view there) */}
        {canCopyWeek && (
          <Button
            variant="outline"
            size="sm"
            className="hidden sm:inline-flex h-7 px-2.5 text-xs shrink-0 border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/60 transition-colors"
            onClick={() => setCopyWeekPending(true)}
          >
            <Copy className="h-3 w-3 mr-1.5" />
            {t('history.copyWeek')}
          </Button>
        )}
      </div>

      {/* Expanded: read-only week grid — CSS Grid trick for smooth height + fade */}
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: isExpanded ? '1fr' : '0fr' }}
      >
        <div
          className={cn(
            'overflow-hidden transition-opacity duration-300 ease-out',
            isExpanded ? 'opacity-100' : 'opacity-0'
          )}
        >
          <div className="px-3 pb-3">
            {everExpanded && (
              isLoading ? (
                <WeekSkeleton />
              ) : (
                <>
                  <WeekGrid
                    sessionsByDay={sessionsByDay}
                    weekStart={weekPlan?.weekStart}
                    readonly={true}
                    onCopyDay={(day) =>
                      onCopyDay({
                        sourceWeekPlanId: weekPlan!.id,
                        sourceDay: day,
                        targetWeekPlanId,
                        targetDay: day,
                      })
                    }
                    onCopySession={setCopyPickSession}
                    selectedDay={selectedDay}
                    onSelectDay={onSelectDay}
                  />

                  {/* Inline day-picker for copy session */}
                  {copyPickSession && (
                    <div
                      data-testid="session-day-picker"
                      className="mt-2 p-2 rounded-lg border border-[color:var(--border)] bg-surface-1 flex flex-wrap gap-1"
                    >
                      <p className="w-full text-xs text-[color:var(--foreground-secondary)] mb-1">
                        {t('history.copySession')} →
                      </p>
                      {DAYS_OF_WEEK.map((day) => (
                        <button
                          key={day}
                          data-testid={`day-pick-${day}`}
                          className="px-2 py-1 text-xs rounded-md bg-surface-2 hover:bg-primary/10 hover:text-primary transition-colors capitalize"
                          onClick={() => {
                            onCopySession(copyPickSession, day);
                            setCopyPickSession(null);
                          }}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )
            )}
          </div>
        </div>
      </div>

      {/* Copy Week confirmation dialog */}
      <Dialog open={copyWeekPending} onOpenChange={(open) => { if (!open) setCopyWeekPending(false); }}>
        <DialogContent showCloseButton={false} className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {t('history.copyWeekConfirmTitle', { week: weekNumber, range: dateRange })}
            </DialogTitle>
            <DialogDescription>
              {t('history.copyWeekConfirmBody', { count: copyableCount })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setCopyWeekPending(false)}>
              {tCommon('actions.cancel')}
            </Button>
            <Button size="sm" onClick={confirmCopyWeek}>
              <Copy className="h-3 w-3 mr-1.5" />
              {t('history.copyWeek')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
