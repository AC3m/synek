import { memo } from 'react';
import { Copy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '~/lib/utils';

interface CopySetButtonProps {
  onCopy: () => void;
  disabled: boolean;
  exerciseName: string;
  setIndex: number;
}

export const CopySetButton = memo(function CopySetButton({ onCopy, disabled, exerciseName, setIndex }: CopySetButtonProps) {
  const { t } = useTranslation('training');

  return (
    <button
      type="button"
      onClick={onCopy}
      disabled={disabled}
      aria-label={`${t('strength.logger.copyFromAbove')} (${exerciseName} set ${setIndex + 1})`}
      className={cn(
        'flex min-h-[44px] min-w-[44px] items-center justify-center rounded p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
        disabled && 'cursor-not-allowed opacity-40',
      )}
    >
      <Copy className="size-4" />
    </button>
  );
});
