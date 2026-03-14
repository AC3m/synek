import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart2, RotateCcw } from 'lucide-react';
import { Skeleton } from '~/components/ui/skeleton';
import { IntervalDetailsModal } from './IntervalDetailsModal';
import { useSessionLaps } from '~/lib/hooks/useSessionLaps';
import type { UserRole } from '~/lib/auth';
import type { TrainingSession } from '~/types/training';

interface IntervalButtonProps {
  session: TrainingSession;
  userRole?: UserRole;
}

export function IntervalButton({ session, userRole }: IntervalButtonProps) {
  const { t } = useTranslation('training');
  const [modalOpen, setModalOpen] = useState(false);

  // Only fetch for confirmed Strava runs — workout_type===3 is unreliable (Garmin-synced runs don't set it)
  const enabled =
    session.trainingType === 'run' &&
    session.stravaActivityId != null &&
    (userRole !== 'coach' || session.isStravaConfirmed === true);

  const { data: laps, isLoading, isError, refetch } = useSessionLaps(session.id, enabled);

  const intervalCount = enabled && laps ? laps.filter((l) => l.segmentType === 'interval').length : 0;
  const hasRealIntervals = intervalCount > 2;

  if (!enabled) return null;

  return (
    <>
      {/* w-full forces a new flex row inside the performance chips container */}
      <div className="w-full">
        {isLoading && <Skeleton className="h-5 w-24 rounded-md" />}
        {!isLoading && isError && (
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-1 text-[10px] text-destructive hover:underline"
          >
            <RotateCcw className="h-2.5 w-2.5" />
            {t('intervals.retry')}
          </button>
        )}
        {!isLoading && !isError && hasRealIntervals && (
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            <BarChart2 className="h-3 w-3" />
            {t('intervals.viewButton')}
          </button>
        )}
      </div>

      {hasRealIntervals && (
        <IntervalDetailsModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          laps={laps!}
          sessionName={session.description}
        />
      )}
    </>
  );
}
