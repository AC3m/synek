// PoC: Junction Garmin integration — remove after evaluation
import { useTranslation } from 'react-i18next';
import { useJunctionWorkout } from '~/lib/hooks/useJunctionConnection';
import { GarminBadge } from './GarminBadge';
import { cn } from '~/lib/utils';

interface GarminSectionProps {
  appUserId: string;
  calendarDate: string | null;
  trainingType: string;
  junctionConnected: boolean;
  variant: 'card' | 'modal';
  className?: string;
}

export function GarminSection({
  appUserId,
  calendarDate,
  trainingType,
  junctionConnected,
  variant,
  className,
}: GarminSectionProps) {
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

  const isCard = variant === 'card';
  const valueClass = isCard ? 'text-[10px] font-semibold' : 'text-sm font-semibold';
  const chipClass = isCard ? 'animate-in fade-in duration-200 flex flex-col min-w-[60px]' : 'flex flex-col min-w-[60px]';

  if (isCard) {
    return (
      <div className={className}>
        <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2 pt-1.5 border-t border-[color:var(--separator)]">
          {durationMin != null && (
            <div className={chipClass}>
              <span className="text-[10px] text-muted-foreground uppercase tracking-tight">
                {t('actualPerformance.duration')}
              </span>
              <span className={valueClass}>
                {durationMin} {t('units.min')}
              </span>
            </div>
          )}
          {distanceKm != null && (
            <div className={chipClass}>
              <span className="text-[10px] text-muted-foreground uppercase tracking-tight">
                {t('actualPerformance.distance')}
              </span>
              <span className={valueClass}>
                {distanceKm} {t('units.km')}
              </span>
            </div>
          )}
          {workout.averageHr != null && (
            <div className={chipClass}>
              <span className="text-[10px] text-muted-foreground uppercase tracking-tight">
                {t('actualPerformance.avgHr')}
              </span>
              <span className={valueClass}>
                {Math.round(workout.averageHr)} {t('units.bpm')}
              </span>
            </div>
          )}
          {workout.maxHr != null && (
            <div className={chipClass}>
              <span className="text-[10px] text-muted-foreground uppercase tracking-tight">
                {t('actualPerformance.maxHr')}
              </span>
              <span className={valueClass}>
                {Math.round(workout.maxHr)} {t('units.bpm')}
              </span>
            </div>
          )}
          {workout.calories != null && (
            <div className={chipClass}>
              <span className="text-[10px] text-muted-foreground uppercase tracking-tight">kcal</span>
              <span className={valueClass}>{workout.calories}</span>
            </div>
          )}

          <div className="animate-in fade-in duration-200 w-full mt-1.5 pt-1.5 border-t border-[color:var(--separator)] border-dashed flex justify-end">
            <GarminBadge />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('mt-3 pt-3 border-t border-dashed border-[color:var(--separator)]', className)}>
      <div className="flex flex-wrap gap-x-4 gap-y-2 mb-2">
        {durationMin != null && (
          <div className={chipClass}>
            <span className="text-[10px] text-muted-foreground uppercase tracking-tight">
              {t('actualPerformance.duration')}
            </span>
            <span className={valueClass}>
              {durationMin} {t('units.min')}
            </span>
          </div>
        )}
        {distanceKm != null && (
          <div className={chipClass}>
            <span className="text-[10px] text-muted-foreground uppercase tracking-tight">
              {t('actualPerformance.distance')}
            </span>
            <span className={valueClass}>
              {distanceKm} {t('units.km')}
            </span>
          </div>
        )}
        {workout.averageHr != null && (
          <div className={chipClass}>
            <span className="text-[10px] text-muted-foreground uppercase tracking-tight">
              {t('actualPerformance.avgHr')}
            </span>
            <span className={valueClass}>
              {Math.round(workout.averageHr)} {t('units.bpm')}
            </span>
          </div>
        )}
        {workout.maxHr != null && (
          <div className={chipClass}>
            <span className="text-[10px] text-muted-foreground uppercase tracking-tight">
              {t('actualPerformance.maxHr')}
            </span>
            <span className={valueClass}>
              {Math.round(workout.maxHr)} {t('units.bpm')}
            </span>
          </div>
        )}
        {workout.calories != null && (
          <div className={chipClass}>
            <span className="text-[10px] text-muted-foreground uppercase tracking-tight">kcal</span>
            <span className={valueClass}>{workout.calories}</span>
          </div>
        )}
      </div>
      <GarminBadge />
    </div>
  );
}
