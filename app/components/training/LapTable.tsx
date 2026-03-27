import { useTranslation } from 'react-i18next';
import { cn } from '~/lib/utils';
import { formatPaceSpeed } from '~/lib/utils/lap-classification';
import type { StravaLap } from '~/types/strava';

interface LapTableProps {
  laps: StravaLap[];
  className?: string;
}

function formatDuration(seconds: number | null): string {
  if (seconds == null) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDistance(meters: number | null): string {
  if (meters == null) return '—';
  return `${(meters / 1000).toFixed(2)} km`;
}

function formatHrOrZone(lap: StravaLap): string {
  if (lap.averageHeartrate != null) return `${Math.round(lap.averageHeartrate)} bpm`;
  if (lap.paceZone != null) return `Z${lap.paceZone}`;
  return '—';
}

const SEGMENT_ROW_COLORS: Record<StravaLap['segmentType'], string> = {
  interval: 'bg-blue-50 dark:bg-blue-950/30',
  recovery: '',
  warmup: 'bg-teal-50 dark:bg-teal-950/30',
  cooldown: 'bg-teal-50 dark:bg-teal-950/30',
};

const SEGMENT_LABEL_COLORS: Record<StravaLap['segmentType'], string> = {
  interval: 'text-blue-700 dark:text-blue-400',
  recovery: 'text-muted-foreground',
  warmup: 'text-teal-700 dark:text-teal-400',
  cooldown: 'text-teal-700 dark:text-teal-400',
};

// Strava's auto-lap names are not useful for display (e.g. "Lap 1", "Lap 2").
// Use lap.name only when it carries a meaningful workout step name.
const AUTO_LAP_PATTERN = /^Lap\s+\d+$/i;

function resolveLabel(lap: StravaLap, fallback: string): string {
  if (lap.name && !AUTO_LAP_PATTERN.test(lap.name)) return lap.name;
  return fallback;
}

export function LapTable({ laps, className }: LapTableProps) {
  const { t } = useTranslation('training');

  const hasHrOrZone = laps.some((l) => l.averageHeartrate != null || l.paceZone != null);

  // Build segment labels with sequential numbering for intervals/recoveries (used as fallback)
  let intervalIdx = 0;
  let recoveryIdx = 0;

  const rows = laps.map((lap) => {
    let fallback: string;
    switch (lap.segmentType) {
      case 'warmup':
        fallback = t('intervals.segments.warmup');
        break;
      case 'cooldown':
        fallback = t('intervals.segments.cooldown');
        break;
      case 'interval':
        intervalIdx++;
        fallback = `${t('intervals.segments.interval')} ${intervalIdx}`;
        break;
      case 'recovery':
        recoveryIdx++;
        fallback = `${t('intervals.segments.recovery')} ${recoveryIdx}`;
        break;
    }
    return { lap, label: resolveLabel(lap, fallback) };
  });

  return (
    <div className={cn('max-h-72 overflow-auto', className)}>
      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr className="border-b border-[color:var(--separator)]">
            <th className="w-4 py-1 pr-2 text-left font-medium text-muted-foreground">#</th>
            <th className="py-1 pr-2 text-left font-medium text-muted-foreground">
              {t('intervals.columns.segment')}
            </th>
            <th className="py-1 pr-2 text-right font-medium whitespace-nowrap text-muted-foreground">
              {t('intervals.columns.duration')}
            </th>
            <th className="py-1 pr-2 text-right font-medium whitespace-nowrap text-muted-foreground">
              {t('intervals.columns.distance')}
            </th>
            <th className="py-1 pr-2 text-right font-medium whitespace-nowrap text-muted-foreground">
              {t('intervals.columns.pace')}
            </th>
            {hasHrOrZone && (
              <th className="py-1 text-right font-medium whitespace-nowrap text-muted-foreground">
                {t('intervals.columns.heartRate')}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ lap, label }, i) => (
            <tr
              key={lap.lapIndex}
              className={cn(
                'border-b border-[color:var(--separator)] last:border-0',
                SEGMENT_ROW_COLORS[lap.segmentType],
              )}
            >
              <td className="py-1 pr-2 text-muted-foreground">{i + 1}</td>
              <td className={cn('py-1 pr-2 font-medium', SEGMENT_LABEL_COLORS[lap.segmentType])}>
                {label}
              </td>
              <td className="py-1 pr-2 text-right tabular-nums">
                {formatDuration(lap.elapsedTimeSeconds)}
              </td>
              <td className="py-1 pr-2 text-right tabular-nums">
                {formatDistance(lap.distanceMeters)}
              </td>
              <td className="py-1 pr-2 text-right tabular-nums">
                {formatPaceSpeed(lap.averageSpeed, ' /km')}
              </td>
              {hasHrOrZone && (
                <td className="py-1 text-right tabular-nums">{formatHrOrZone(lap)}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
