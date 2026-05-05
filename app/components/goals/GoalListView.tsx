import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { AppLoader } from '~/components/ui/app-loader';
import { GoalCard } from './GoalCard';
import { GoalDialog } from './GoalDialog';
import { useGoals } from '~/lib/hooks/useGoals';
import { useGoalDialogState } from '~/lib/hooks/useGoalDialogState';
import { computeGoalAchievement } from '~/lib/utils/goals';
import { cn } from '~/lib/utils';

interface GoalListViewProps {
  athleteId: string;
  createdBy: string;
  canManage: boolean;
  className?: string;
}

export function GoalListView({ athleteId, createdBy, canManage, className }: GoalListViewProps) {
  const { t } = useTranslation('training');

  const { data: goals = [], isLoading } = useGoals(athleteId);
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

  if (isLoading) return <AppLoader />;

  return (
    <div className={cn('mx-auto max-w-2xl space-y-6', className)}>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{t('goal.library')}</h1>
        {canManage && (
          <Button onClick={handleOpenNew}>
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
