import { useTranslation } from 'react-i18next';
import { RotateCcw } from 'lucide-react';
import { Separator } from '~/components/ui/separator';
import { useSessionLaps } from '~/lib/hooks/useSessionLaps';
import { IntervalChart } from './IntervalChart';
import { LapTable } from './LapTable';
import type { TrainingSession } from '~/types/training';

interface SessionIntervalsProps {
  session: TrainingSession;
  open: boolean;
  userRole?: 'coach' | 'athlete';
  className?: string;
}

export function SessionIntervals({ session, open, userRole, className }: SessionIntervalsProps) {
  const { t } = useTranslation('training');

  const enabled =
    open &&
    session.trainingType === 'run' &&
    session.stravaActivityId != null &&
    (userRole !== 'coach' || session.isStravaConfirmed === true);

  const { data: laps, isError, refetch } = useSessionLaps(session.id, enabled);

  if (!enabled) return null;

  if (isError) {
    return (
      <div className={className}>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-1 text-sm text-destructive hover:underline"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {t('intervals.retry')}
        </button>
      </div>
    );
  }

  const hasRealIntervals = laps
    ? laps.filter((l) => l.segmentType === 'interval').length > 2
    : false;

  if (!hasRealIntervals || !laps) return null;

  return (
    <div className={className}>
      <Separator />
      <IntervalChart laps={laps} />
      <Separator />
      <LapTable laps={laps} />
    </div>
  );
}
