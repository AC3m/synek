import { memo } from 'react';
import { cn } from '~/lib/utils';
import type { StrengthVariantExercise } from '~/types/training';

interface ExerciseFilterPillsProps {
  exercises: StrengthVariantExercise[];
  activeIds: Set<string>;
  onToggle: (id: string) => void;
  className?: string;
}

export const ExerciseFilterPills = memo(function ExerciseFilterPills({
  exercises,
  activeIds,
  onToggle,
  className,
}: ExerciseFilterPillsProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {exercises.map((ex) => {
        const isActive = activeIds.has(ex.id);
        return (
          <button
            key={ex.id}
            type="button"
            role="checkbox"
            aria-checked={isActive}
            onClick={() => onToggle(ex.id)}
            className={cn(
              'shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              isActive
                ? 'border-orange-600 bg-orange-600 text-white'
                : 'border-input bg-background text-muted-foreground hover:bg-accent',
            )}
          >
            {ex.name}
          </button>
        );
      })}
    </div>
  );
});
