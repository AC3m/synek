// PoC: Junction Garmin integration — remove after evaluation
import { useTranslation } from 'react-i18next';
import { useJunctionWorkout } from '~/lib/hooks/useJunctionConnection';
import { GarminBadge } from './GarminBadge';
import { cn } from '~/lib/utils';
import type { JunctionPocWorkout } from '~/types/junction-poc';

interface GarminSectionProps {
  appUserId: string;
  calendarDate: string | null;
  trainingType: string;
  junctionConnected: boolean;
  variant: 'card' | 'modal';
  className?: string;
}

interface ChipData {
  label: string;
  value: string;
}

interface GarminChipListProps {
  chips: ChipData[];
  valueClass: string;
  animate: boolean;
}

function GarminChipList({ chips, valueClass, animate }: GarminChipListProps) {
  const chipClass = cn('flex flex-col min-w-[60px]', animate && 'animate-in fade-in duration-200');
  return (
    <>
      {chips.map((chip) => (
        <div key={chip.label} className={chipClass}>
          <span className="text-[10px] tracking-tight text-muted-foreground uppercase">
            {chip.label}
          </span>
          <span className={valueClass}>{chip.value}</span>
        </div>
      ))}
    </>
  );
}

function buildChips(
  workout: JunctionPocWorkout,
  durationMin: number | null,
  distanceKm: string | null,
  labels: { duration: string; distance: string; avgHr: string; maxHr: string; kcal: string },
  units: { min: string; km: string; bpm: string },
): ChipData[] {
  const chips: ChipData[] = [];
  if (durationMin != null)
    chips.push({ label: labels.duration, value: `${durationMin} ${units.min}` });
  if (distanceKm != null)
    chips.push({ label: labels.distance, value: `${distanceKm} ${units.km}` });
  if (workout.averageHr != null)
    chips.push({ label: labels.avgHr, value: `${Math.round(workout.averageHr)} ${units.bpm}` });
  if (workout.maxHr != null)
    chips.push({ label: labels.maxHr, value: `${Math.round(workout.maxHr)} ${units.bpm}` });
  if (workout.calories != null) chips.push({ label: labels.kcal, value: `${workout.calories}` });
  return chips;
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

  const durationMin =
    workout.movingTimeSeconds != null ? Math.round(workout.movingTimeSeconds / 60) : null;
  const distanceKm =
    workout.distanceMeters != null && workout.distanceMeters > 0
      ? (workout.distanceMeters / 1000).toFixed(2)
      : null;

  const hasAnyData =
    durationMin != null ||
    distanceKm != null ||
    workout.averageHr != null ||
    workout.maxHr != null ||
    workout.calories != null;

  if (!hasAnyData) return null;

  const isCard = variant === 'card';
  const valueClass = isCard ? 'text-[10px] font-semibold' : 'text-sm font-semibold';

  const chips = buildChips(
    workout,
    durationMin,
    distanceKm,
    {
      duration: t('actualPerformance.duration'),
      distance: t('actualPerformance.distance'),
      avgHr: t('actualPerformance.avgHr'),
      maxHr: t('actualPerformance.maxHr'),
      kcal: t('units.kcal'),
    },
    { min: t('units.min'), km: t('units.km'), bpm: t('units.bpm') },
  );

  if (isCard) {
    return (
      <div className={className}>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 border-t border-[color:var(--separator)] pt-1.5">
          <GarminChipList chips={chips} valueClass={valueClass} animate={true} />
          <div className="mt-1.5 flex w-full animate-in justify-end border-t border-dashed border-[color:var(--separator)] pt-1.5 duration-200 fade-in">
            <GarminBadge />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn('mt-3 border-t border-dashed border-[color:var(--separator)] pt-3', className)}
    >
      <div className="mb-2 flex flex-wrap gap-x-4 gap-y-2">
        <GarminChipList chips={chips} valueClass={valueClass} animate={false} />
      </div>
      <GarminBadge />
    </div>
  );
}
