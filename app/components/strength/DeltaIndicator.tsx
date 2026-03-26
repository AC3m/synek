import { memo } from 'react';
import { cn } from '~/lib/utils';

interface DeltaIndicatorProps {
  current: number | null;
  baseline: number | null;
  unit?: string;
  className?: string;
}

export const DeltaIndicator = memo(function DeltaIndicator({
  current,
  baseline,
  unit = 'kg',
  className,
}: DeltaIndicatorProps) {
  if (current == null || baseline == null) return null;

  const delta = Math.round((current - baseline) * 100) / 100;

  if (delta === 0) {
    return <span className={cn('text-xs text-muted-foreground', className)}>=</span>;
  }

  if (delta > 0) {
    return (
      <span className={cn('text-xs font-medium text-green-600', className)}>
        +{delta} {unit}
      </span>
    );
  }

  return (
    <span className={cn('text-xs font-medium text-amber-600', className)}>
      {delta} {unit}
    </span>
  );
});
