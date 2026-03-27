import { memo } from 'react';
import { cn } from '~/lib/utils';

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  trend?: 'up' | 'flat' | 'down';
  className?: string;
}

export const StatCard = memo(function StatCard({ label, value, trend, className }: StatCardProps) {
  return (
    <div className={cn('rounded-lg border bg-card p-3', className)}>
      <p className="text-[10px] leading-tight tracking-widest text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1.5 truncate text-xl font-semibold">{value}</p>
      {trend && (
        <span
          className={cn(
            'mt-1 inline-block text-xs font-medium',
            trend === 'up' && 'text-green-600',
            trend === 'flat' && 'text-muted-foreground',
            trend === 'down' && 'text-amber-600',
          )}
        >
          {trend === 'up' && '▲'}
          {trend === 'flat' && '—'}
          {trend === 'down' && '▼'}
        </span>
      )}
    </div>
  );
});
