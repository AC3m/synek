import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '~/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
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
          className={cn('rounded-t-2xl max-h-[92vh] flex flex-col gap-0 p-0', className)}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="h-1 w-10 rounded-full bg-border" />
          </div>

          <SheetHeader className="px-5 pt-3 pb-3 border-b shrink-0">
            <SheetTitle>{title}</SheetTitle>
          </SheetHeader>

          <div className="h-[58vh] overflow-y-auto px-5 py-4">
            {children}
          </div>

          <div className="px-5 pt-4 pb-4 border-t flex gap-2 justify-end shrink-0">
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
        className={cn('max-w-lg max-h-[85vh] flex flex-col p-0 gap-0', className)}
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="h-[55vh] overflow-y-auto px-6 py-4">
          {children}
        </div>

        <div className="px-6 py-4 border-t flex gap-2 justify-end shrink-0">
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
