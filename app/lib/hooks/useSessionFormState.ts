import { useState, useCallback } from 'react';
import type { DayOfWeek, TrainingSession } from '~/types/training';

export function useSessionFormState() {
  const [formOpen, setFormOpen] = useState(false);
  const [formDay, setFormDay] = useState<DayOfWeek | undefined>();
  const [editingSession, setEditingSession] = useState<TrainingSession | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleAddSession = useCallback((day: DayOfWeek) => {
    setEditingSession(null);
    setFormDay(day);
    setFormOpen(true);
  }, []);

  const handleEditSession = useCallback((session: TrainingSession) => {
    setEditingSession(session);
    setFormDay(session.dayOfWeek);
    setFormOpen(true);
  }, []);

  const handleDeleteSession = useCallback((sessionId: string) => {
    setDeleteConfirmId(sessionId);
  }, []);

  return {
    formOpen,
    setFormOpen,
    formDay,
    editingSession,
    deleteConfirmId,
    setDeleteConfirmId,
    handleAddSession,
    handleEditSession,
    handleDeleteSession,
  };
}
