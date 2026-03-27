import { memo, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { cn } from '~/lib/utils';
import { StatCard } from '~/components/strength/StatCard';
import type { StrengthVariantExercise, ProgressLog } from '~/types/training';

interface StrengthStatCardsProps {
  exercises: StrengthVariantExercise[];
  logs: ProgressLog[];
  className?: string;
}

function deriveTrend(volumes: number[]): 'up' | 'flat' | 'down' | undefined {
  if (volumes.length < 3) return undefined;
  const last3 = volumes.slice(-3);
  const avg0 = last3[0];
  const avg2 = last3[2];
  if (avg2 > avg0 * 1.02) return 'up';
  if (avg2 < avg0 * 0.98) return 'down';
  return 'flat';
}

export const StrengthStatCards = memo(function StrengthStatCards({
  exercises,
  logs,
  className,
}: StrengthStatCardsProps) {
  const { t } = useTranslation('training');

  // All 4 stat values derived in ONE pass
  const stats = useMemo(() => {
    const sessionVols: Record<string, number> = {};
    let bestLoad = 0;
    let lastDate = '';

    for (const log of logs) {
      if (log.loadKg != null && log.loadKg > bestLoad) bestLoad = log.loadKg;
      if (log.sessionDate > lastDate) lastDate = log.sessionDate;

      // Accumulate volume per session
      const vol = (log.sets ?? 1) * (log.actualReps ?? 0) * (log.loadKg ?? 0);
      sessionVols[log.sessionId] = (sessionVols[log.sessionId] ?? 0) + vol;
    }

    const uniqueSessions = Object.keys(sessionVols).length;
    const volumes = Object.values(sessionVols);
    const trend = deriveTrend(volumes);

    return { uniqueSessions, bestLoad, lastDate, trend };
  }, [logs]);

  const trendLabel =
    stats.trend === 'up'
      ? t('strength.analysis.trendIncreasing')
      : stats.trend === 'down'
        ? t('strength.analysis.trendDecreasing')
        : stats.trend === 'flat'
          ? t('strength.analysis.trendStable')
          : '—';

  return (
    <div className={cn('grid grid-cols-2 gap-3 sm:grid-cols-4', className)}>
      <StatCard label={t('strength.analysis.statSessions')} value={stats.uniqueSessions} />
      <StatCard
        label={t('strength.analysis.statBestLoad')}
        value={stats.bestLoad > 0 ? `${stats.bestLoad} kg` : '—'}
      />
      <StatCard
        label={t('strength.analysis.statLastSession')}
        value={stats.lastDate ? format(parseISO(stats.lastDate), 'MMM d') : '—'}
      />
      <StatCard
        label={t('strength.analysis.statVolumeTrend')}
        value={trendLabel}
        trend={stats.trend}
      />
    </div>
  );
});
