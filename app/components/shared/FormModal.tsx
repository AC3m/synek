import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '~/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { Button } from '~/components/ui/button';
import { useIsMobile } from '~/lib/hooks/useIsMobile';
import { cn } from '~/lib/utils';

interface FormModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  onSave: () => void;
  saveLabel?: string;
  cancelLabel?: string;
  isSaving?: boolean;
  children: ReactNode;
  className?: string;
}

export function FormModal({
  open,
  onClose,
  title,
  onSave,
  saveLabel,
  cancelLabel,
  isSaving,
  children,
  className,
}: FormModalProps) {
  const { t } = useTranslation('common');
  const isMobile = useIsMobile();

  const resolvedSaveLabel = saveLabel ?? t('actions.save');
  const resolvedCancelLabel = cancelLabel ?? t('actions.cancel');

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className={cn('flex max-h-[92vh] flex-col gap-0 rounded-t-2xl p-0', className)}
        >
          {/* Drag handle */}
          <div className="flex shrink-0 justify-center pt-3 pb-1">
            <div className="h-1 w-10 rounded-full bg-border" />
          </div>

          <SheetHeader className="shrink-0 border-b px-5 pt-3 pb-3">
            <SheetTitle>{title}</SheetTitle>
          </SheetHeader>

          <div className="h-[58vh] overflow-y-auto px-5 py-4">{children}</div>

          <div className="flex shrink-0 justify-end gap-2 border-t px-5 pt-4 pb-4">
            <Button variant="outline" onClick={onClose}>
              {resolvedCancelLabel}
            </Button>
            <Button onClick={onSave} disabled={isSaving}>
              {resolvedSaveLabel}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        showCloseButton={false}
        className={cn('flex max-h-[85vh] max-w-lg flex-col gap-0 p-0', className)}
      >
        <DialogHeader className="shrink-0 border-b px-6 pt-6 pb-4">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="h-[55vh] overflow-y-auto px-6 py-4">{children}</div>

        <div className="flex shrink-0 justify-end gap-2 border-t px-6 py-4">
          <Button variant="outline" onClick={onClose}>
            {resolvedCancelLabel}
          </Button>
          <Button onClick={onSave} disabled={isSaving}>
            {resolvedSaveLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
