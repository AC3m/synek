import { useTranslation } from 'react-i18next';
import { cn } from '~/lib/utils';
import { formatDurationCompact } from '~/lib/utils/format';
import { trainingTypeConfig, competitionConfig, iconMap } from '~/lib/utils/training-types';
import type { WeekStats, TrainingType } from '~/types/training';

interface SportBreakdownProps {
  stats: WeekStats;
  className?: string;
}

function ColHeader({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1.5 text-[9px] font-bold tracking-[0.15em] text-muted-foreground/50 uppercase">
      {children}
    </p>
  );
}

function Stat({ value, sub }: { value: React.ReactNode; sub?: string }) {
  return (
    <div>
      <p className="text-sm leading-tight font-bold tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-[10px] text-muted-foreground/60 tabular-nums">{sub}</p>}
    </div>
  );
}

function SportRow({
  type,
  sessionCount,
  completedSessionCount,
  plannedDistanceKm,
  actualDistanceKm,
  totalDurationMinutes,
}: {
  type: TrainingType;
  sessionCount: number;
  completedSessionCount: number;
  plannedDistanceKm: number;
  actualDistanceKm: number;
  totalDurationMinutes: number;
}) {
  const { t } = useTranslation(['coach', 'common']);
  const config = trainingTypeConfig[type];
  const Icon = iconMap[config.icon];
  const hasDistance = plannedDistanceKm > 0 || actualDistanceKm > 0;
  const duration = formatDurationCompact(totalDurationMinutes);

  return (
    <div className="flex items-start gap-3 py-3">
      {/* Icon */}
      <div
        className={cn(
          'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
          config.bgColor,
        )}
      >
        {Icon && <Icon className={cn('h-4 w-4', config.color)} />}
      </div>

      {/* Sport name + session count */}
      <div className="min-w-0 flex-1">
        <p className={cn('text-sm leading-tight font-semibold', config.color)}>
          {t(`common:trainingTypes.${type}` as never)}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {t('coach:weekSummary.sessionCount', { count: sessionCount })}
        </p>
      </div>

      {/* Planned column */}
      <div className="w-16 shrink-0 text-right">
        <ColHeader>{t('coach:weekSummary.colPlanned')}</ColHeader>
        <Stat value={hasDistance ? `${plannedDistanceKm.toFixed(1)} km` : '—'} />
      </div>

      {/* Performance column */}
      <div className="w-20 shrink-0 text-right">
        <ColHeader>{t('coach:weekSummary.colPerformance')}</ColHeader>
        <Stat
          value={
            hasDistance
              ? actualDistanceKm > 0
                ? `${actualDistanceKm.toFixed(1)} km`
                : '—'
              : (duration ?? '—')
          }
          sub={hasDistance && duration ? duration : undefined}
        />
        {!hasDistance && (
          <p className="mt-0.5 text-[10px] text-muted-foreground/50">
            {completedSessionCount}/{sessionCount}
          </p>
        )}
      </div>
    </div>
  );
}

function RestDayRow({ count }: { count: number }) {
  const { t } = useTranslation(['coach', 'common']);
  const config = trainingTypeConfig['rest_day'];
  const Icon = iconMap[config.icon];

  return (
    <div className="flex items-center gap-3 py-3">
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
          config.bgColor,
        )}
      >
        {Icon && <Icon className={cn('h-4 w-4', config.color)} />}
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn('text-sm leading-tight font-semibold', config.color)}>
          {t('common:trainingTypes.rest_day' as never)}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {t('coach:weekSummary.dayCount', { count })}
        </p>
      </div>
    </div>
  );
}

function CompetitionRow({
  goalName,
  discipline,
  goalDistanceKm,
  actualDistanceKm,
  actualDurationMinutes,
}: {
  goalName: string;
  discipline: TrainingType;
  goalDistanceKm: number | null;
  actualDistanceKm: number | null;
  actualDurationMinutes: number | null;
}) {
  const { t } = useTranslation(['coach', 'common']);
  const Icon = iconMap[competitionConfig.icon];

  const perfValue =
    actualDistanceKm != null
      ? `${actualDistanceKm.toFixed(1)} km`
      : actualDurationMinutes != null
        ? formatDurationCompact(actualDurationMinutes)
        : '—';

  return (
    <div className="flex items-start gap-3 py-3">
      <div
        className={cn(
          'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
          competitionConfig.bgColor,
        )}
      >
        {Icon && <Icon className={cn('h-4 w-4', competitionConfig.color)} />}
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn('text-sm leading-tight font-semibold', competitionConfig.color)}>
          {goalName}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {t(`common:trainingTypes.${discipline}` as never)}
        </p>
      </div>
      <div className="w-16 shrink-0 text-right">
        <ColHeader>{t('coach:weekSummary.colPlanned')}</ColHeader>
        <Stat value={goalDistanceKm != null ? `${goalDistanceKm.toFixed(1)} km` : '—'} />
      </div>
      <div className="w-20 shrink-0 text-right">
        <ColHeader>{t('coach:weekSummary.colPerformance')}</ColHeader>
        <Stat value={perfValue} />
      </div>
    </div>
  );
}

export function SportBreakdown({ stats, className }: SportBreakdownProps) {
  const { t } = useTranslation('coach');

  const allTypeEntries = (
    Object.entries(stats.byType) as [
      TrainingType,
      NonNullable<(typeof stats.byType)[TrainingType]>,
    ][]
  ).sort(([, a], [, b]) => b.sessionCount - a.sessionCount);

  const restDayEntry = allTypeEntries.find(([type]) => type === 'rest_day');
  const regularEntries = allTypeEntries.filter(([type]) => type !== 'rest_day');

  const hasContent = allTypeEntries.length > 0 || stats.competitionSessions.length > 0;

  if (!hasContent) {
    return (
      <p className={cn('py-4 text-center text-sm text-muted-foreground', className)}>
        {t('weekSummary.noBreakdown')}
      </p>
    );
  }

  return (
    <div className={cn('space-y-0', className)}>
      {/* Competitions first */}
      {stats.competitionSessions.length > 0 && (
        <div
          className={cn(
            regularEntries.length > 0 || restDayEntry ? 'border-b border-border/40 pb-1' : '',
          )}
        >
          <p
            className={cn(
              'pt-2 pb-1 text-[10px] font-bold tracking-wider uppercase',
              competitionConfig.color,
            )}
          >
            {t('weekSummary.competitions')}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-6">
            {stats.competitionSessions.map((comp) => (
              <div key={comp.sessionId} className="border-b border-border/40 last:border-0">
                <CompetitionRow
                  goalName={comp.goalName}
                  discipline={comp.discipline}
                  goalDistanceKm={comp.goalDistanceKm}
                  actualDistanceKm={comp.actualDistanceKm}
                  actualDurationMinutes={comp.actualDurationMinutes}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Regular training sports */}
      {regularEntries.length > 0 && (
        <div>
          {stats.competitionSessions.length > 0 && (
            <p className="pt-2 pb-1 text-[10px] font-bold tracking-wider text-muted-foreground/60 uppercase">
              {t('weekSummary.training')}
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-6">
            {regularEntries.map(([type, entry]) => (
              <div key={type} className="border-b border-border/40 last:border-0 md:last:border-0">
                <SportRow
                  type={type}
                  sessionCount={entry.sessionCount}
                  completedSessionCount={entry.completedSessionCount}
                  plannedDistanceKm={entry.plannedDistanceKm}
                  actualDistanceKm={entry.actualDistanceKm}
                  totalDurationMinutes={entry.totalDurationMinutes}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rest day last — no plan/performance data */}
      {restDayEntry && (
        <div
          className={cn(
            (regularEntries.length > 0 || stats.competitionSessions.length > 0) &&
              'border-t border-border/40',
          )}
        >
          <RestDayRow count={restDayEntry[1].sessionCount} />
        </div>
      )}
    </div>
  );
}
