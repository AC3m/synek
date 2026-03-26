import { memo } from 'react';
import { Dumbbell } from 'lucide-react';
import { cn } from '~/lib/utils';
import { Button } from '~/components/ui/button';

// Hoisted constant — never changes between renders
const DUMBBELL_ICON = <Dumbbell className="size-16 text-orange-400" />;

interface StrengthEmptyStateProps {
  heading: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const StrengthEmptyState = memo(function StrengthEmptyState({
  heading,
  body,
  actionLabel,
  onAction,
  className,
}: StrengthEmptyStateProps) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center gap-4 py-16 text-center', className)}
    >
      {DUMBBELL_ICON}
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">{heading}</h3>
        <p className="text-sm text-muted-foreground">{body}</p>
      </div>
      {actionLabel && onAction && <Button onClick={onAction}>{actionLabel}</Button>}
    </div>
  );
});
