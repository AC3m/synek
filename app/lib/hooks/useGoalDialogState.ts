import { useState } from 'react';
import { useCreateGoal, useUpdateGoal, useDeleteGoal } from '~/lib/hooks/useGoals';
import type { Goal, CreateGoalInput, UpdateGoalInput } from '~/types/training';

interface UseGoalDialogStateOptions {
  athleteId: string;
  createdBy: string;
}

export function useGoalDialogState({ athleteId, createdBy }: UseGoalDialogStateOptions) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | undefined>();

  const createGoalMutation = useCreateGoal();
  const updateGoalMutation = useUpdateGoal();
  const deleteGoalMutation = useDeleteGoal();

  function handleCreate(input: CreateGoalInput) {
    createGoalMutation.mutate({ ...input, createdBy }, { onSuccess: () => setDialogOpen(false) });
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

  function handleOpenNew() {
    setEditingGoal(undefined);
    setDialogOpen(true);
  }

  const isSaving = createGoalMutation.isPending || updateGoalMutation.isPending;

  return {
    dialogOpen,
    editingGoal,
    isSaving,
    handleCreate,
    handleUpdate,
    handleDelete,
    handleEditClick,
    handleClose,
    handleOpenNew,
  };
}
