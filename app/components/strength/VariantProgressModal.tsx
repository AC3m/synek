import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '~/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '~/components/ui/sheet';
import { AppLoader } from '~/components/ui/app-loader';
import { Button } from '~/components/ui/button';
import { useIsMobile } from '~/lib/hooks/useIsMobile';
import { useStrengthVariant, useVariantProgressLogs } from '~/lib/hooks/useStrengthVariants';

const ExerciseProgressChart = lazy(() => import('~/components/strength/ExerciseProgressChart'));

interface VariantProgressModalProps {
  variantId: string | null;
  userId: string;
  onClose: () => void;
}

export function VariantProgressModal({ variantId, userId, onClose }: VariantProgressModalProps) {
  const { t } = useTranslation('training');
  const isMobile = useIsMobile();
  const { data: variant } = useStrengthVariant(variantId ?? '');
  const { data: logs = [] } = useVariantProgressLogs(variantId ?? '', userId);

  const title = variant?.name ?? t('strength.variant.tabProgress');
  const open = !!variantId;

  const content = (
    <Suspense fallback={<AppLoader />}>
      {variant && <ExerciseProgressChart variant={variant} logs={logs} />}
    </Suspense>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="rounded-t-2xl max-h-[92vh] flex flex-col gap-0 p-0"
        >
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="h-1 w-10 rounded-full bg-border" />
          </div>
          <SheetHeader className="flex-row items-center justify-between px-5 pt-3 pb-3 border-b shrink-0">
            <SheetTitle>{title}</SheetTitle>
            <SheetClose asChild>
              <Button size="icon" variant="ghost" className="size-8 shrink-0">
                <X className="size-4" />
              </Button>
            </SheetClose>
          </SheetHeader>
          <div className="overflow-y-auto px-5 py-4">
            {content}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent showCloseButton={false} className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="flex-row items-center justify-between px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle>{title}</DialogTitle>
          <DialogClose asChild>
            <Button size="icon" variant="ghost" className="size-8 shrink-0">
              <X className="size-4" />
            </Button>
          </DialogClose>
        </DialogHeader>
        <div className="overflow-y-auto px-6 py-4">
          {content}
        </div>
      </DialogContent>
    </Dialog>
  );
}
