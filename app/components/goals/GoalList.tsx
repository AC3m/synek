import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { GoalCard } from './GoalCard';
import { GoalDialog } from './GoalDialog';
import { useCreateGoal, useUpdateGoal, useDeleteGoal } from '~/lib/hooks/useGoals';
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | undefined>();

  const createGoalMutation = useCreateGoal();
  const updateGoalMutation = useUpdateGoal();
  const deleteGoalMutation = useDeleteGoal();

  function handleCreate(input: import('~/types/training').CreateGoalInput) {
    createGoalMutation.mutate(
      { ...input, createdBy },
      { onSuccess: () => setDialogOpen(false) }
    );
  }

  function handleUpdate(input: import('~/types/training').UpdateGoalInput) {
    updateGoalMutation.mutate(
      { ...input, athleteId },
      { onSuccess: () => { setDialogOpen(false); setEditingGoal(undefined); } }
    );
  }

  function handleDelete(goal: Goal) {
    deleteGoalMutation.mutate({ id: goal.id, athleteId });
  }

  function handleEditClick(goal: Goal) {
    setEditingGoal(goal);
    setDialogOpen(true);
  }

  function handleClose() {
    setDialogOpen(false);
    setEditingGoal(undefined);
  }

  const isSaving = createGoalMutation.isPending || updateGoalMutation.isPending;

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {goals.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">{t('goal.noGoals')}</p>
      ) : (
        goals.map((goal) => {
          // We don't have session result here — show 'pending' for future, derive status only when result is available
          return (
            <GoalCard
              key={goal.id}
              goal={goal}
              canEdit={canEdit}
              achievementStatus={
                computeGoalAchievement(goal, {
                  resultDistanceKm: null,
                  resultTimeSeconds: null,
                })
              }
              onEdit={handleEditClick}
              onDelete={handleDelete}
            />
          );
        })
      )}

      {canEdit && (
        <Button
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => { setEditingGoal(undefined); setDialogOpen(true); }}
        >
          <Plus className="size-4 mr-1" />
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
