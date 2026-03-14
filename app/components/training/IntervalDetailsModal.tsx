import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Separator } from '~/components/ui/separator';
import { IntervalChart } from './IntervalChart';
import { LapTable } from './LapTable';
import { StravaLogo } from './StravaLogo';
import type { StravaLap } from '~/types/strava';

interface IntervalDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  laps: StravaLap[];
  sessionName: string | null;
}

export function IntervalDetailsModal({
  open,
  onOpenChange,
  laps,
  sessionName,
}: IntervalDetailsModalProps) {
  const { t } = useTranslation('training');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-full">
        <DialogHeader>
          <DialogTitle className="text-sm">{t('intervals.modalTitle')}</DialogTitle>
          {sessionName && (
            <p className="text-xs text-muted-foreground">{sessionName}</p>
          )}
        </DialogHeader>

        <div className="space-y-3">
          <IntervalChart laps={laps} />
          <Separator />
          <LapTable laps={laps} />
          <div className="flex justify-end pt-1">
            <StravaLogo />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
