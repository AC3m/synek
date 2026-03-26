import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { AppLoader } from '~/components/ui/app-loader';
import { Button } from '~/components/ui/button';
import { VariantForm } from '~/components/strength/VariantForm';
import {
  useStrengthVariant,
  useUpdateStrengthVariant,
  useUpsertVariantExercises,
} from '~/lib/hooks/useStrengthVariants';

interface VariantDetailViewProps {
  variantId: string;
  canEdit: boolean;
  baseRoute: string;
}

export function VariantDetailView({ variantId, canEdit, baseRoute }: VariantDetailViewProps) {
  const { t } = useTranslation('training');
  const navigate = useNavigate();

  const { data: variant, isLoading } = useStrengthVariant(variantId);
  const updateVariant = useUpdateStrengthVariant();
  const upsertExercises = useUpsertVariantExercises();

  const [isSaving, setIsSaving] = useState(false);

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
      loadUnit?: 'kg' | 'sec';
      supersetGroup?: number | null;
    }>;
  }) {
    if (!canEdit) return;
    setIsSaving(true);
    try {
      await Promise.all([
        updateVariant.mutateAsync({
          id: variantId,
          name: data.name,
          description: data.description || null,
        }),
        upsertExercises.mutateAsync({
          variantId,
          exercises: data.exercises.map((ex, i) => ({
            id: ex.id,
            name: ex.name,
            videoUrl: ex.videoUrl || null,
            sets: ex.sets,
            repsMin: ex.repsMin,
            repsMax: ex.repsMax,
            loadUnit: ex.loadUnit ?? 'kg',
            sortOrder: i,
            supersetGroup: ex.supersetGroup ?? null,
          })),
        }),
      ]);
      toast('Changes saved');
    } catch {
      toast('Failed to save', { description: 'Please try again.' });
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) return <AppLoader />;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(baseRoute)}
        className="-ml-2"
      >
        {t('strength.variant.backToLibrary')}
      </Button>

      <h1 className="text-2xl font-bold">{variant?.name ?? '…'}</h1>

      {variant && canEdit ? (
        <VariantForm
          initial={variant}
          onSave={handleSave}
          isSaving={isSaving}
        />
      ) : variant ? (
        <ul className="space-y-2">
          {variant.exercises.map((ex) => (
            <li key={ex.id} className="rounded-lg border p-3">
              <p className="font-medium">{ex.name}</p>
              <p className="text-sm text-muted-foreground">
                {ex.sets} sets × {ex.repsMin}–{ex.repsMax} reps
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
