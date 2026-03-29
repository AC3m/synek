import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { GoalCard } from './GoalCard';
import { GoalDialog } from './GoalDialog';
import { useGoalDialogState } from '~/lib/hooks/useGoalDialogState';
import { computeGoalAchievement } from '~/lib/utils/goals';
import type { Goal } from '~/types/training';
import { cn } from '~/lib/utils';

interface GoalListProps {
  goals: Goal[];
  canEdit: boolean;
  athleteId: string;
  createdBy: string;
  className?: string;
}

export function GoalList({ goals, canEdit, athleteId, createdBy, className }: GoalListProps) {
  const { t } = useTranslation('training');
  const {
    dialogOpen,
    editingGoal,
    isSaving,
    handleCreate,
    handleUpdate,
    handleDelete,
    handleEditClick,
    handleClose,
    handleOpenNew,
  } = useGoalDialogState({ athleteId, createdBy });

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {goals.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">{t('goal.noGoals')}</p>
      ) : (
        goals.map((goal) => {
          return (
            <GoalCard
              key={goal.id}
              goal={goal}
              canEdit={canEdit}
              achievementStatus={computeGoalAchievement(goal, {
                resultDistanceKm: null,
                resultTimeSeconds: null,
              })}
              onEdit={handleEditClick}
              onDelete={handleDelete}
            />
          );
        })
      )}

      {canEdit && (
        <Button variant="outline" size="sm" className="self-start" onClick={handleOpenNew}>
          <Plus className="mr-1 size-4" />
          {t('goal.create')}
        </Button>
      )}

      <GoalDialog
        open={dialogOpen}
        onClose={handleClose}
        athleteId={athleteId}
        goal={editingGoal}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        isSaving={isSaving}
      />
    </div>
  );
}
