import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '~/components/ui/sheet';
import { Separator } from '~/components/ui/separator';
import { Button } from '~/components/ui/button';
import { useIsMobile } from '~/lib/hooks/useIsMobile';
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
  const { t } = useTranslation(['training', 'common']);
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" showCloseButton={false} className="rounded-t-2xl max-h-[92vh] flex flex-col gap-0 p-0">
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="h-1 w-10 rounded-full bg-border" />
          </div>
          <SheetHeader className="px-5 pt-3 pb-3 border-b shrink-0">
            <SheetTitle>{t('intervals.modalTitle')}</SheetTitle>
            {sessionName && <p className="text-xs text-muted-foreground">{sessionName}</p>}
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            <IntervalChart laps={laps} />
            <Separator />
            <LapTable laps={laps} />
          </div>
          <div className="px-5 pt-4 pb-4 border-t flex items-center justify-between shrink-0">
            <StravaLogo />
            <SheetClose asChild>
              <Button variant="outline">{t('common:actions.close')}</Button>
            </SheetClose>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="max-w-lg max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle>{t('intervals.modalTitle')}</DialogTitle>
          {sessionName && <p className="text-xs text-muted-foreground">{sessionName}</p>}
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          <IntervalChart laps={laps} />
          <Separator />
          <LapTable laps={laps} />
        </div>
        <div className="px-6 py-4 border-t flex items-center justify-between shrink-0">
          <StravaLogo />
          <DialogClose asChild>
            <Button variant="outline">{t('common:actions.close')}</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
