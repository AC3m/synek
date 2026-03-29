import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { cn } from '~/lib/utils';
import type { AnalyticsPeriod, Goal } from '~/types/training';

const PERIODS: AnalyticsPeriod[] = ['year', 'quarter', 'month', 'goal'];

interface PeriodSelectorProps {
  namespace: 'coach' | 'athlete';
  period: AnalyticsPeriod;
  goalId?: string;
  goals: Goal[];
  onPeriodChange: (period: AnalyticsPeriod) => void;
  onGoalChange: (goalId: string) => void;
  className?: string;
}

export function PeriodSelector({
  namespace,
  period,
  goalId,
  goals,
  onPeriodChange,
  onGoalChange,
  className,
}: PeriodSelectorProps) {
  const { t } = useTranslation(namespace);

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <div className="flex rounded-lg border border-border/50 bg-muted/30 p-0.5">
        {PERIODS.map((p) => (
          <button
            key={p}
            onClick={() => onPeriodChange(p)}
            className={cn(
              'h-7 rounded-md px-3 text-xs font-semibold transition-all',
              period === p
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t(`analytics.period.${p}` as never)}
          </button>
        ))}
      </div>

      {period === 'goal' && (
        <Select value={goalId ?? ''} onValueChange={onGoalChange}>
          <SelectTrigger className="h-8 w-auto min-w-[160px] text-xs">
            <SelectValue placeholder={t('analytics.period.selectGoal' as never)} />
          </SelectTrigger>
          <SelectContent>
            {goals.map((g) => (
              <SelectItem key={g.id} value={g.id} className="text-xs">
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
