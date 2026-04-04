import { memo } from 'react';
import { format, parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { cn } from '~/lib/utils';
import type { LoadUnit, ProgressionIntent } from '~/types/training';

interface PrefillBadgeProps {
  direction: ProgressionIntent | null;
  incrementApplied: number | null;
  fromDate: string | null;
  loadUnit: LoadUnit;
  className?: string;
  'data-testid'?: string;
}

export const PrefillBadge = memo(function PrefillBadge({
  direction,
  incrementApplied,
  fromDate,
  loadUnit,
  className,
  'data-testid': testId,
}: PrefillBadgeProps) {
  const { t } = useTranslation('training');

  if (!fromDate) return null;

  const unit = loadUnit === 'sec' ? 's' : 'kg';
  const formattedDate = format(parseISO(fromDate), 'MMM d');

  let text: string;
  let colorClass: string;

  if (direction === 'up' && incrementApplied != null && incrementApplied !== 0) {
    text = t('strength.logger.prefillUp', { increment: `${incrementApplied} ${unit}`, date: formattedDate });
    colorClass = 'text-green-600';
  } else if (direction === 'down' && incrementApplied != null && incrementApplied !== 0) {
    text = t('strength.logger.prefillDown', { increment: `${Math.abs(incrementApplied)} ${unit}`, date: formattedDate });
    colorClass = 'text-amber-600';
  } else if (direction === 'maintain' || direction === 'up' || direction === 'down') {
    text = t('strength.logger.prefillMaintain', { date: formattedDate });
    colorClass = 'text-muted-foreground';
  } else {
    text = t('strength.logger.prefillFrom', { date: formattedDate });
    colorClass = 'text-muted-foreground';
  }

  return (
    <p data-testid={testId} className={cn('mt-0.5 text-xs', colorClass, className)}>
      {text}
    </p>
  );
});
