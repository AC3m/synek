import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '~/lib/utils';
import { formatPaceSpeed } from '~/lib/utils/lap-classification';
import type { StravaLap } from '~/types/strava';

interface IntervalChartProps {
  laps: StravaLap[];
  className?: string;
}

const SEGMENT_COLORS: Record<StravaLap['segmentType'], string> = {
  interval: 'bg-blue-500',
  recovery: 'bg-muted-foreground/40',
  warmup: 'bg-teal-500',
  cooldown: 'bg-teal-500',
};

export function IntervalChart({ laps, className }: IntervalChartProps) {
  const { t } = useTranslation('training');

  const totalTime = useMemo(
    () => laps.reduce((sum, lap) => sum + (lap.elapsedTimeSeconds ?? 0), 0),
    [laps],
  );
  const presentTypes = useMemo(() => [...new Set(laps.map((l) => l.segmentType))], [laps]);

  if (totalTime === 0 || laps.length === 0) return null;

  return (
    <div className={cn('space-y-1.5', className)}>
      {/* Bars row */}
      <div className="flex h-12 items-end gap-0.5">
        {laps.map((lap) => {
          const elapsed = lap.elapsedTimeSeconds ?? 0;
          // Width as percentage of total, minimum 4px
          const widthPct = (elapsed / totalTime) * 100;
          return (
            <div
              key={lap.lapIndex}
              className="flex h-full flex-col justify-end"
              style={{ flexBasis: `${widthPct}%`, minWidth: '4px' }}
              title={`${t(`intervals.segments.${lap.segmentType}` as never)} — ${formatPaceSpeed(lap.averageSpeed)} /km`}
            >
              <div
                className={cn('w-full rounded-sm transition-all', SEGMENT_COLORS[lap.segmentType])}
                style={{
                  height:
                    lap.segmentType === 'recovery' ||
                    lap.segmentType === 'warmup' ||
                    lap.segmentType === 'cooldown'
                      ? '50%'
                      : '100%',
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Pace labels row */}
      <div className="flex gap-0.5">
        {laps.map((lap) => {
          const elapsed = lap.elapsedTimeSeconds ?? 0;
          const widthPct = (elapsed / totalTime) * 100;
          return (
            <div
              key={lap.lapIndex}
              className="overflow-hidden"
              style={{ flexBasis: `${widthPct}%`, minWidth: '4px' }}
            >
              <span className="block truncate text-[9px] leading-none text-muted-foreground">
                {lap.segmentType === 'interval' ? formatPaceSpeed(lap.averageSpeed) : ''}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 pt-0.5">
        {presentTypes.map((type) => (
          <span
            key={type}
            className="inline-flex items-center gap-1 text-[10px] text-muted-foreground"
          >
            <span className={cn('h-2 w-2 shrink-0 rounded-sm', SEGMENT_COLORS[type])} />
            {t(`intervals.segments.${type}` as never)}
          </span>
        ))}
      </div>
    </div>
  );
}
