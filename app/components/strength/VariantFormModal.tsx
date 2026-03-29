import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { FormModal } from '~/components/ui/form-modal';
import { VariantForm } from '~/components/strength/VariantForm';
import { useAuth } from '~/lib/context/AuthContext';
import { useCreateStrengthVariant } from '~/lib/hooks/useStrengthVariants';
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
  const formWrapperRef = useRef<HTMLDivElement>(null);
  const createVariant = useCreateStrengthVariant(user?.id ?? '');

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
        })),
      });
      toast('Variant created');
      onCreated(created);
      onClose();
    } catch {
      toast.error('Failed to save', { description: 'Please try again.' });
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={t('strength.variant.new')}
      onSave={() => formWrapperRef.current?.querySelector('form')?.requestSubmit()}
      isSaving={createVariant.isPending}
      className={className}
    >
      <div ref={formWrapperRef}>
        <VariantForm hideActions onSave={handleSave} isSaving={createVariant.isPending} />
      </div>
    </FormModal>
  );
}
