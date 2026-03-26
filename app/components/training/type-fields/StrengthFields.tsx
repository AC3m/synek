import { VariantExerciseList } from '~/components/strength/VariantExerciseList';
import type { StrengthData, StrengthVariant, StrengthSessionExercise } from '~/types/training';

interface StrengthFieldsProps {
  data: Partial<StrengthData>;
  variants?: StrengthVariant[];
  prefillData?: Record<string, StrengthSessionExercise>;
  prefillDate?: string | null;
}

export function StrengthFields({ data, variants, prefillData, prefillDate }: StrengthFieldsProps) {
  const selectedVariant = data.variantId
    ? variants?.find((v) => v.id === data.variantId)
    : undefined;

  if (!selectedVariant) return null;

  return (
    <VariantExerciseList
      exercises={selectedVariant.exercises}
      lastSessionData={prefillData}
      lastSessionDate={prefillDate}
      showProgressionHints
    />
  );
}
