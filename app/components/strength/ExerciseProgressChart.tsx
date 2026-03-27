import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '~/lib/utils';
import { StrengthEmptyState } from '~/components/strength/StrengthEmptyState';
import { StrengthStatCards } from '~/components/strength/StrengthStatCards';
import { ExerciseFilterPills } from '~/components/strength/ExerciseFilterPills';
import { ProgressLineChart } from '~/components/strength/ProgressLineChart';
import { SessionHistoryTable } from '~/components/strength/SessionHistoryTable';
import type { StrengthVariant, ProgressLog } from '~/types/training';

interface ExerciseProgressChartProps {
  variant: StrengthVariant;
  logs: ProgressLog[];
  athleteName?: string;
  className?: string;
}

// This component is the React.lazy target — recharts is imported transitively through
// ProgressLineChart, so it never hits the initial bundle.
export default memo(function ExerciseProgressChart({
  variant,
  logs,
  athleteName,
  className,
}: ExerciseProgressChartProps) {
  const { t } = useTranslation('training');

  const [visibleExerciseIds, setVisibleExerciseIds] = useState<Set<string>>(
    () => new Set(variant.exercises.map((ex) => ex.id)),
  );

  function handleToggle(id: string) {
    setVisibleExerciseIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        // Keep at least one visible
        if (next.size > 1) next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  if (logs.length < 2) {
    return (
      <StrengthEmptyState
        heading={t('strength.analysis.emptyHeading')}
        body={t('strength.analysis.emptyBody')}
        actionLabel={t('strength.analysis.emptyAction')}
        className={className}
      />
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {athleteName && <p className="text-sm text-muted-foreground">{athleteName}</p>}

      <StrengthStatCards exercises={variant.exercises} logs={logs} />

      {variant.exercises.length > 1 && (
        <ExerciseFilterPills
          exercises={variant.exercises}
          activeIds={visibleExerciseIds}
          onToggle={handleToggle}
        />
      )}

      <ProgressLineChart
        exercises={variant.exercises}
        logs={logs}
        visibleExerciseIds={visibleExerciseIds}
      />

      <SessionHistoryTable exercises={variant.exercises} logs={logs} />
    </div>
  );
});
