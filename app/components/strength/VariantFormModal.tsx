import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { FormModal } from '~/components/ui/form-modal';
import { VariantForm } from '~/components/strength/VariantForm';
import { useAuth } from '~/lib/context/AuthContext';
import { useCreateStrengthVariant } from '~/lib/hooks/useStrengthVariants';
import { getCurrentWeekId } from '~/lib/utils/date';
import type { StrengthVariant, PerSetRep } from '~/types/training';

interface VariantFormModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (variant: StrengthVariant) => void;
  className?: string;
}

export function VariantFormModal({ open, onClose, onCreated, className }: VariantFormModalProps) {
  const { t } = useTranslation('training');
  const { user } = useAuth();
  const { locale = 'pl' } = useParams<{ locale?: string }>();
  const navigate = useNavigate();
  const formWrapperRef = useRef<HTMLDivElement>(null);
  const createVariant = useCreateStrengthVariant(user?.id ?? '');
  const [savedVariant, setSavedVariant] = useState<StrengthVariant | null>(null);

  async function handleSave(data: {
    name: string;
    description: string;
    exercises: Array<{
      id?: string;
      name: string;
      videoUrl: string;
      sets: number;
      repsMin: number;
      repsMax: number;
      perSetReps?: PerSetRep[] | null;
      loadUnit?: 'kg' | 'sec';
      supersetGroup?: number | null;
      progressionIncrement?: number | null;
    }>;
  }) {
    try {
      const created = await createVariant.mutateAsync({
        name: data.name,
        description: data.description,
        exercises: data.exercises.map((ex, i) => ({
          name: ex.name,
          videoUrl: ex.videoUrl || undefined,
          sets: ex.sets,
          repsMin: ex.repsMin,
          repsMax: ex.repsMax,
          perSetReps: ex.perSetReps ?? null,
          loadUnit: ex.loadUnit ?? 'kg',
          sortOrder: i,
          supersetGroup: ex.supersetGroup ?? null,
          progressionIncrement: ex.progressionIncrement ?? null,
        })),
      });
      setSavedVariant(created);
    } catch {
      toast.error('Failed to save', { description: 'Please try again.' });
    }
  }

  const weekPath = `/${locale}/athlete/week/${getCurrentWeekId()}`;

  function handleDismissNudge() {
    if (savedVariant) onCreated(savedVariant);
    setSavedVariant(null);
    onClose();
  }

  return (
    <FormModal
      open={open}
      onClose={savedVariant ? handleDismissNudge : onClose}
      title={t('strength.variant.new')}
      onSave={
        savedVariant
          ? () => {}
          : () => formWrapperRef.current?.querySelector('form')?.requestSubmit()
      }
      isSaving={createVariant.isPending}
      className={className}
    >
      {savedVariant ? (
        <div className="rounded-md border-l-4 border-green-500 bg-muted/50 p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-muted-foreground">{t('strength.variant.savedNudge')}</p>
            <button
              type="button"
              onClick={handleDismissNudge}
              aria-label="Dismiss"
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
          <Link
            to={weekPath}
            onClick={() => {
              setSavedVariant(null);
              onClose();
            }}
            className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
          >
            {t('strength.variant.goToWeek')}
          </Link>
        </div>
      ) : (
        <div ref={formWrapperRef}>
          <VariantForm hideActions onSave={handleSave} isSaving={createVariant.isPending} />
        </div>
      )}
    </FormModal>
  );
}
