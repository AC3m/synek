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
import { ConfirmDialog } from '~/components/ui/confirm-dialog';
import { WeekGrid } from './WeekGrid';
import { WeekSkeleton } from './WeekSkeleton';
import { getWeekDateRange, parseWeekId } from '~/lib/utils/date';
import {
  DAYS_OF_WEEK,
  type DayOfWeek,
  type TrainingSession,
  type WeekPlan,
  type SessionsByDay,
  type CopyDayInput,
} from '~/types/training';

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
  targetRestDays?: Set<DayOfWeek>;
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
  targetRestDays,
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

  const sessionsByDay: SessionsByDay = DAYS_OF_WEEK.reduce(
    (acc, day) => ({
      ...acc,
      [day]: sessions.filter((s) => s.dayOfWeek === day),
    }),
    {} as SessionsByDay,
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
          className="flex min-w-0 flex-1 items-center gap-2 text-left transition-opacity hover:opacity-80"
        >
          <ChevronRight
            className={cn(
              'h-4 w-4 shrink-0 text-[color:var(--foreground-secondary)] transition-transform duration-300 ease-out',
              isExpanded && 'rotate-90',
            )}
          />
          <span className="truncate text-sm font-medium">
            {t('history.weekLabel', { week: weekNumber, range: dateRange })}
          </span>
          <span className="shrink-0 text-xs text-[color:var(--foreground-secondary)]">
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
            className="hidden h-7 shrink-0 border-primary/30 px-2.5 text-xs text-primary transition-colors hover:border-primary/60 hover:bg-primary/5 sm:inline-flex"
            onClick={() => setCopyWeekPending(true)}
          >
            <Copy className="mr-1.5 h-3 w-3" />
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
            isExpanded ? 'opacity-100' : 'opacity-0',
          )}
        >
          <div className="px-3 pb-3">
            {everExpanded &&
              (isLoading ? (
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
                </>
              ))}
          </div>
        </div>
      </div>

      {/* Copy Session day-picker dialog */}
      <Dialog
        open={!!copyPickSession}
        onOpenChange={(open) => {
          if (!open) setCopyPickSession(null);
        }}
      >
        <DialogContent showCloseButton={false} className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('history.copySession')}</DialogTitle>
            <DialogDescription>{t('history.copySessionPickDay')}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2 py-2">
            {DAYS_OF_WEEK.map((day) => {
              const isRestDay = targetRestDays?.has(day) ?? false;
              return (
                <Button
                  key={day}
                  variant="outline"
                  size="sm"
                  disabled={isRestDay}
                  onClick={() => {
                    onCopySession(copyPickSession!, day);
                    setCopyPickSession(null);
                  }}
                  className="capitalize"
                  title={isRestDay ? t('history.copySessionRestDayBlocked') : undefined}
                >
                  {day}
                </Button>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setCopyPickSession(null)}>
              {tCommon('actions.cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Copy Week confirmation dialog */}
      <ConfirmDialog
        open={copyWeekPending}
        onOpenChange={(open) => {
          if (!open) setCopyWeekPending(false);
        }}
        title={t('history.copyWeekConfirmTitle', { week: weekNumber })}
        description={t('history.copyWeekConfirmBody', { count: copyableCount })}
        confirmLabel={t('history.copyWeek')}
        onConfirm={confirmCopyWeek}
      />
    </div>
  );
}
