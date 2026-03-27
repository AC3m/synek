import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useSessionFormState } from '~/lib/hooks/useSessionFormState';
import type { TrainingSession } from '~/types/training';

function makeSession(id = 's1'): TrainingSession {
  return {
    id,
    weekPlanId: 'w1',
    dayOfWeek: 'tuesday',
    sortOrder: 0,
    trainingType: 'run',
    description: null,
    coachComments: null,
    plannedDurationMinutes: null,
    plannedDistanceKm: null,
    typeSpecificData: { type: 'run' },
    isCompleted: false,
    completedAt: null,
    actualDurationMinutes: null,
    actualDistanceKm: null,
    actualPace: null,
    avgHeartRate: null,
    maxHeartRate: null,
    rpe: null,
    coachPostFeedback: null,
    athleteNotes: null,
    stravaActivityId: null,
    stravaSyncedAt: null,
    createdAt: '',
    updatedAt: '',
  };
}

describe('useSessionFormState', () => {
  it('initial state: formOpen=false, formDay=undefined, editingSession=null, deleteConfirmId=null', () => {
    const { result } = renderHook(() => useSessionFormState());
    expect(result.current.formOpen).toBe(false);
    expect(result.current.formDay).toBeUndefined();
    expect(result.current.editingSession).toBeNull();
    expect(result.current.deleteConfirmId).toBeNull();
  });

  it('handleAddSession(day): sets formOpen=true, formDay, clears editingSession', () => {
    const { result } = renderHook(() => useSessionFormState());

    act(() => { result.current.handleAddSession('monday'); });

    expect(result.current.formOpen).toBe(true);
    expect(result.current.formDay).toBe('monday');
    expect(result.current.editingSession).toBeNull();
  });

  it('handleEditSession(session): sets formOpen=true, formDay from session, editingSession', () => {
    const session = makeSession();
    const { result } = renderHook(() => useSessionFormState());

    act(() => { result.current.handleEditSession(session); });

    expect(result.current.formOpen).toBe(true);
    expect(result.current.formDay).toBe('tuesday');
    expect(result.current.editingSession).toBe(session);
  });

  it('handleDeleteSession(id): sets deleteConfirmId, does not open form', () => {
    const { result } = renderHook(() => useSessionFormState());

    act(() => { result.current.handleDeleteSession('s42'); });

    expect(result.current.deleteConfirmId).toBe('s42');
    expect(result.current.formOpen).toBe(false);
  });

  it('setFormOpen(false) closes form without clearing editingSession', () => {
    const session = makeSession();
    const { result } = renderHook(() => useSessionFormState());

    act(() => { result.current.handleEditSession(session); });
    expect(result.current.editingSession).toBe(session);

    act(() => { result.current.setFormOpen(false); });

    expect(result.current.formOpen).toBe(false);
    expect(result.current.editingSession).toBe(session);
  });

  it('handleAddSession clears editingSession set by a prior handleEditSession', () => {
    const session = makeSession();
    const { result } = renderHook(() => useSessionFormState());

    act(() => { result.current.handleEditSession(session); });
    expect(result.current.editingSession).toBe(session);

    act(() => { result.current.handleAddSession('friday'); });

    expect(result.current.editingSession).toBeNull();
    expect(result.current.formDay).toBe('friday');
  });

  it('setDeleteConfirmId(null) clears deleteConfirmId', () => {
    const { result } = renderHook(() => useSessionFormState());

    act(() => { result.current.handleDeleteSession('s1'); });
    expect(result.current.deleteConfirmId).toBe('s1');

    act(() => { result.current.setDeleteConfirmId(null); });
    expect(result.current.deleteConfirmId).toBeNull();
  });
});
