// PoC: Junction Garmin integration — remove after evaluation
import { useTranslation } from 'react-i18next';
import { useJunctionWorkout } from '~/lib/hooks/useJunctionConnection';
import { GarminBadge } from './GarminBadge';
import { cn } from '~/lib/utils';

interface GarminModalSectionProps {
  appUserId: string;
  calendarDate: string | null;
  trainingType: string;
  junctionConnected: boolean;
  className?: string;
}

export function GarminModalSection({
  appUserId,
  calendarDate,
  trainingType,
  junctionConnected,
  className,
}: GarminModalSectionProps) {
  const { t } = useTranslation('training');
  const { data: workout } = useJunctionWorkout(
    appUserId,
    junctionConnected ? calendarDate : null,
    trainingType,
  );

  if (!workout) return null;

  const durationMin = workout.movingTimeSeconds != null
    ? Math.round(workout.movingTimeSeconds / 60)
    : null;
  const distanceKm = workout.distanceMeters != null && workout.distanceMeters > 0
    ? (workout.distanceMeters / 1000).toFixed(2)
    : null;

  const hasAnyData = durationMin != null || distanceKm != null ||
    workout.averageHr != null || workout.maxHr != null || workout.calories != null;

  if (!hasAnyData) return null;

  return (
    <div className={cn('mt-3 pt-3 border-t border-dashed border-[color:var(--separator)]', className)}>
      <div className="flex flex-wrap gap-x-4 gap-y-2 mb-2">
        {durationMin != null && (
          <div className="flex flex-col min-w-[60px]">
            <span className="text-[10px] text-muted-foreground uppercase tracking-tight">
              {t('actualPerformance.duration')}
            </span>
            <span className="text-sm font-semibold">
              {durationMin} {t('units.min')}
            </span>
          </div>
        )}
        {distanceKm != null && (
          <div className="flex flex-col min-w-[60px]">
            <span className="text-[10px] text-muted-foreground uppercase tracking-tight">
              {t('actualPerformance.distance')}
            </span>
            <span className="text-sm font-semibold">
              {distanceKm} {t('units.km')}
            </span>
          </div>
        )}
        {workout.averageHr != null && (
          <div className="flex flex-col min-w-[60px]">
            <span className="text-[10px] text-muted-foreground uppercase tracking-tight">
              {t('actualPerformance.avgHr')}
            </span>
            <span className="text-sm font-semibold">
              {Math.round(workout.averageHr)} {t('units.bpm')}
            </span>
          </div>
        )}
        {workout.maxHr != null && (
          <div className="flex flex-col min-w-[60px]">
            <span className="text-[10px] text-muted-foreground uppercase tracking-tight">
              {t('actualPerformance.maxHr')}
            </span>
            <span className="text-sm font-semibold">
              {Math.round(workout.maxHr)} {t('units.bpm')}
            </span>
          </div>
        )}
        {workout.calories != null && (
          <div className="flex flex-col min-w-[60px]">
            <span className="text-[10px] text-muted-foreground uppercase tracking-tight">kcal</span>
            <span className="text-sm font-semibold">{workout.calories}</span>
          </div>
        )}
      </div>
      <GarminBadge />
    </div>
  );
}
