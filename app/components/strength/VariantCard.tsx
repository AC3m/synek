import { memo, useState } from 'react';
import { BarChart2, Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '~/lib/utils';
import { Button } from '~/components/ui/button';
import { ConfirmDialog } from '~/components/ui/confirm-dialog';
import type { StrengthVariant } from '~/types/training';

interface VariantCardProps {
  variant: StrengthVariant;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onViewProgress?: (id: string) => void;
  className?: string;
}

export const VariantCard = memo(function VariantCard({
  variant,
  onEdit,
  onDelete,
  onViewProgress,
  className,
}: VariantCardProps) {
  const { t } = useTranslation('training');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const previewExercises = variant.exercises.slice(0, 3);

  return (
    <div
      className={cn(
        'group relative rounded-lg border bg-card p-4 transition-shadow hover:shadow-md',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold">{variant.name}</h3>
          {variant.description && (
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{variant.description}</p>
          )}
        </div>
        <div className="flex shrink-0 gap-1">
          {onViewProgress && (
            <Button
              size="icon"
              variant="ghost"
              aria-label={t('strength.variant.viewProgress')}
              onClick={() => onViewProgress(variant.id)}
              className="size-8"
            >
              <BarChart2 className="size-4" />
            </Button>
          )}
          {onEdit && (
            <Button
              size="icon"
              variant="ghost"
              aria-label={t('strength.variant.editVariant')}
              onClick={() => onEdit(variant.id)}
              className="size-8"
            >
              <Pencil className="size-4" />
            </Button>
          )}
          {onDelete && (
            <>
              <Button
                size="icon"
                variant="ghost"
                aria-label={t('strength.variant.deleteVariant')}
                onClick={() => setConfirmOpen(true)}
                className="size-8 text-destructive hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </Button>
              <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title={t('strength.variant.deleteConfirm')}
                description={t('strength.variant.deleteDescription')}
                confirmLabel={t('strength.variant.delete')}
                onConfirm={() => onDelete(variant.id)}
                destructive
              />
            </>
          )}
        </div>
      </div>

      {/* Exercise count badge */}
      <p className="mt-2 text-xs text-muted-foreground">
        {t('strength.variant.exerciseCount', {
          count: variant.exercises.length,
          defaultValue_other: '{{count}} exercises',
        })}
      </p>

      {/* Peek expansion — pure CSS hover, no JS state */}
      {previewExercises.length > 0 && (
        <div className="max-h-0 overflow-hidden transition-[max-height] duration-200 group-hover:max-h-24">
          <ul className="mt-2 space-y-0.5 border-t pt-2">
            {previewExercises.map((ex) => (
              <li key={ex.id} className="truncate text-xs text-muted-foreground">
                {ex.name} — {ex.sets}×{ex.repsMin}–{ex.repsMax}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
});
