import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { cn } from '~/lib/utils';
import { VariantPicker } from '~/components/strength/VariantPicker';
import type { StrengthVariant } from '~/types/training';

interface StrengthVariantFieldProps {
  variants: StrengthVariant[];
  selectedVariantId: string | null;
  onSelect: (variantId: string | null) => void;
  isCoach?: boolean;
  className?: string;
}

export function StrengthVariantField({
  variants,
  selectedVariantId,
  onSelect,
  isCoach,
  className,
}: StrengthVariantFieldProps) {
  const { t } = useTranslation('training');
  const navigate = useNavigate();
  const { locale = 'pl' } = useParams<{ locale?: string }>();

  return (
    <div className={cn('space-y-2', className)}>
      <label className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
        {t('strength.variant.selectVariant')}
      </label>
      {variants.length === 0 ? (
        <div className="rounded-md border border-dashed px-4 py-3 text-sm text-muted-foreground">
          {t('strength.variant.noVariants')}{' '}
          <button
            type="button"
            className="underline underline-offset-2 hover:text-foreground"
            onClick={() => navigate(`/${locale}/${isCoach ? 'coach' : 'athlete'}/strength`)}
          >
            {t('strength.variant.manageVariants')}
          </button>
        </div>
      ) : (
        <VariantPicker
          variants={variants}
          selectedVariantId={selectedVariantId}
          onSelect={onSelect}
        />
      )}
    </div>
  );
}
