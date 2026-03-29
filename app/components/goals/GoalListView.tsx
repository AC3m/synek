import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { AppLoader } from '~/components/ui/app-loader';
import { GoalCard } from './GoalCard';
import { GoalDialog } from './GoalDialog';
import { useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal } from '~/lib/hooks/useGoals';
import { computeGoalAchievement } from '~/lib/utils/goals';
import type { Goal, CreateGoalInput, UpdateGoalInput } from '~/types/training';
import { cn } from '~/lib/utils';

interface GoalListViewProps {
  athleteId: string;
  createdBy: string;
  canManage: boolean;
  className?: string;
}

export function GoalListView({ athleteId, createdBy, canManage, className }: GoalListViewProps) {
  const { t } = useTranslation('training');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | undefined>();

  const { data: goals = [], isLoading } = useGoals(athleteId);
  const createGoalMutation = useCreateGoal();
  const updateGoalMutation = useUpdateGoal();
  const deleteGoalMutation = useDeleteGoal();

  function handleCreate(input: CreateGoalInput) {
    createGoalMutation.mutate(
      { ...input, createdBy },
      { onSuccess: () => setDialogOpen(false) },
    );
  }

  function handleUpdate(input: UpdateGoalInput) {
    updateGoalMutation.mutate(
      { ...input, athleteId },
      {
        onSuccess: () => {
          setDialogOpen(false);
          setEditingGoal(undefined);
        },
      },
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

  if (isLoading) return <AppLoader />;

  return (
    <div className={cn('mx-auto max-w-2xl space-y-6 px-4 py-6', className)}>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{t('goal.library')}</h1>
        {canManage && (
          <Button
            onClick={() => {
              setEditingGoal(undefined);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-1.5 size-4" />
            {t('goal.create')}
          </Button>
        )}
      </div>

      {goals.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{t('goal.noGoals')}</p>
      ) : (
        <div className="grid gap-3">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              canEdit={canManage}
              achievementStatus={computeGoalAchievement(goal, {
                resultDistanceKm: null,
                resultTimeSeconds: null,
              })}
              onEdit={handleEditClick}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {canManage && (
        <GoalDialog
          open={dialogOpen}
          onClose={handleClose}
          athleteId={athleteId}
          goal={editingGoal}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}
