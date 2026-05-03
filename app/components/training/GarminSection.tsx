// PoC: Junction Garmin integration — remove after evaluation
import { useTranslation } from 'react-i18next';
import { useJunctionWorkout } from '~/lib/hooks/useJunctionConnection';
import { formatPaceSpeed } from '~/lib/utils/lap-classification';
import { GarminBadge } from './GarminBadge';
import { cn } from '~/lib/utils';
import type { TrainingSession } from '~/types/training';

interface GarminSectionProps {
  appUserId: string;
  calendarDate: string | null;
  trainingType: string;
  junctionConnected: boolean;
  variant: 'card' | 'modal';
  className?: string;
  /** When provided, reads Garmin data from the pre-matched session instead of querying */
  session?: TrainingSession;
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
  durationMin: number | null,
  distanceKm: string | null,
  pace: string | null,
  avgHr: number | null,
  maxHr: number | null,
  calories: number | null,
  labels: {
    duration: string;
    distance: string;
    pace: string;
    avgHr: string;
    maxHr: string;
    kcal: string;
  },
  units: { min: string; km: string; perKm: string; bpm: string },
): ChipData[] {
  const chips: ChipData[] = [];
  if (durationMin != null)
    chips.push({ label: labels.duration, value: `${durationMin} ${units.min}` });
  if (distanceKm != null)
    chips.push({ label: labels.distance, value: `${distanceKm} ${units.km}` });
  if (pace != null) chips.push({ label: labels.pace, value: `${pace}${units.perKm}` });
  if (avgHr != null)
    chips.push({ label: labels.avgHr, value: `${Math.round(avgHr)} ${units.bpm}` });
  if (maxHr != null)
    chips.push({ label: labels.maxHr, value: `${Math.round(maxHr)} ${units.bpm}` });
  if (calories != null) chips.push({ label: labels.kcal, value: `${calories}` });
  return chips;
}

export function GarminSection({
  appUserId,
  calendarDate,
  trainingType,
  junctionConnected,
  variant,
  className,
  session,
}: GarminSectionProps) {
  const { t } = useTranslation('training');

  // When session is provided, use pre-matched data from augmentSessionsWithGarmin.
  // This avoids a per-session query that fails when multiple workouts exist for
  // the same (date, sport) — the route has already done the 1:1 matching.
  const { data: queriedWorkout } = useJunctionWorkout(
    appUserId,
    !session && junctionConnected ? calendarDate : null,
    trainingType,
  );

  // Derive display values from pre-matched session (card) or queried workout (modal)
  let durationMin: number | null = null;
  let distanceKm: string | null = null;
  let pace: string | null = null;
  let avgHr: number | null = null;
  let maxHr: number | null = null;
  let calories: number | null = null;

  if (session != null) {
    durationMin = session.actualDurationMinutes;
    distanceKm =
      session.actualDistanceKm != null && session.actualDistanceKm > 0
        ? session.actualDistanceKm.toFixed(2)
        : null;
    pace = session.actualPace;
    avgHr = session.avgHeartRate;
    maxHr = session.maxHeartRate;
    calories = session.calories;
  } else if (queriedWorkout != null) {
    durationMin =
      queriedWorkout.movingTimeSeconds != null
        ? Math.round(queriedWorkout.movingTimeSeconds / 60)
        : null;
    distanceKm =
      queriedWorkout.distanceMeters != null && queriedWorkout.distanceMeters > 0
        ? (queriedWorkout.distanceMeters / 1000).toFixed(2)
        : null;
    pace =
      queriedWorkout.averageSpeed != null ? formatPaceSpeed(queriedWorkout.averageSpeed) : null;
    avgHr = queriedWorkout.averageHr;
    maxHr = queriedWorkout.maxHr;
    calories = queriedWorkout.calories;
  }

  const hasAnyData =
    durationMin != null ||
    distanceKm != null ||
    pace != null ||
    avgHr != null ||
    maxHr != null ||
    calories != null;

  if (!hasAnyData) return null;

  const isCard = variant === 'card';
  const valueClass = isCard ? 'text-[10px] font-semibold' : 'text-sm font-semibold';

  const chips = buildChips(
    durationMin,
    distanceKm,
    pace,
    avgHr,
    maxHr,
    calories,
    {
      duration: t('actualPerformance.duration'),
      distance: t('actualPerformance.distance'),
      pace: t('actualPerformance.pace'),
      avgHr: t('actualPerformance.avgHr'),
      maxHr: t('actualPerformance.maxHr'),
      kcal: t('units.kcal'),
    },
    { min: t('units.min'), km: t('units.km'), perKm: t('units.perKm'), bpm: t('units.bpm') },
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
