import { useTranslation } from 'react-i18next';
import { cn } from '~/lib/utils';
import type { TrainingSession } from '~/types/training';

interface PerformanceChipGroupProps {
  session: TrainingSession;
  isMasked: boolean;
  shouldShowMaskedPlaceholders: boolean;
  size?: 'compact' | 'default';
  animate?: boolean;
  className?: string;
}

const CHIPS = [
  { key: 'duration', delay: 'delay-[50ms]' },
  { key: 'distance', delay: 'delay-[75ms]' },
  { key: 'pace', delay: 'delay-[100ms]' },
  { key: 'avgHr', delay: 'delay-[125ms]' },
  { key: 'maxHr', delay: 'delay-[150ms]' },
  { key: 'rpe', delay: 'delay-[175ms]' },
  { key: 'calories', delay: 'delay-[200ms]' },
] as const;

export function PerformanceChipGroup({
  session,
  isMasked,
  shouldShowMaskedPlaceholders,
  size = 'default',
  animate = false,
  className,
}: PerformanceChipGroupProps) {
  const { t } = useTranslation(['training', 'common']);
  const valueClass = size === 'compact' ? 'text-[10px] font-semibold' : 'text-sm font-semibold';

  const chips = [
    {
      key: 'duration',
      show: shouldShowMaskedPlaceholders || session.actualDurationMinutes != null,
      label: t('training:actualPerformance.duration'),
      value: `${session.actualDurationMinutes} ${t('training:units.min')}`,
    },
    {
      key: 'distance',
      show:
        shouldShowMaskedPlaceholders ||
        (session.actualDistanceKm != null && session.actualDistanceKm > 0),
      label: t('training:actualPerformance.distance'),
      value: `${session.actualDistanceKm} ${t('training:units.km')}`,
    },
    {
      key: 'pace',
      show: shouldShowMaskedPlaceholders || session.actualPace != null,
      label: t('training:actualPerformance.pace'),
      value: `${session.actualPace} ${t('training:units.perKm')}`,
    },
    {
      key: 'avgHr',
      show: shouldShowMaskedPlaceholders || session.avgHeartRate != null,
      label: t('training:actualPerformance.avgHr'),
      value: `${session.avgHeartRate} ${t('training:units.bpm')}`,
    },
    {
      key: 'maxHr',
      show: shouldShowMaskedPlaceholders || session.maxHeartRate != null,
      label: t('training:actualPerformance.maxHr'),
      value: `${session.maxHeartRate} ${t('training:units.bpm')}`,
    },
    {
      key: 'rpe',
      show: shouldShowMaskedPlaceholders || session.rpe != null,
      label: t('training:actualPerformance.rpe'),
      value: `${session.rpe}/10`,
    },
    {
      key: 'calories',
      show:
        session.trainingType !== 'rest_day' &&
        (shouldShowMaskedPlaceholders || session.calories != null),
      label: t('training:actualPerformance.calories'),
      value: `${session.calories} ${t('training:units.kcal')}`,
    },
  ];

  return (
    <div
      className={cn(
        'flex flex-wrap gap-x-4 gap-y-2',
        isMasked && 'pointer-events-none blur-[3px] select-none',
        className,
      )}
      title={isMasked ? t('common:strava.waitingForConfirmation') : undefined}
    >
      {chips.map((chip, i) =>
        chip.show ? (
          <div
            key={chip.key}
            className={cn(
              animate && `animate-in duration-200 fade-in ${CHIPS[i].delay}`,
              'flex min-w-[60px] flex-col',
            )}
          >
            <span className="text-[10px] tracking-tight text-muted-foreground uppercase">
              {chip.label}
            </span>
            <span className={valueClass}>{isMasked ? '---' : chip.value}</span>
          </div>
        ) : null,
      )}
    </div>
  );
}
