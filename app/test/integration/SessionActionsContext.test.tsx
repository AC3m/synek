import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useSessionActions, SessionActionsProvider } from '~/lib/context/SessionActionsContext';
import type { SessionActionsContextValue } from '~/lib/context/SessionActionsContext';

function makeValue(overrides: Partial<SessionActionsContextValue> = {}): SessionActionsContextValue {
  return {
    readonly: false,
    athleteMode: false,
    showAthleteControls: false,
    stravaConnected: false,
    junctionConnected: false,
    ...overrides,
  };
}

describe('SessionActionsContext', () => {
  it('useSessionActions outside provider returns safe defaults (readonly=true, no throws)', () => {
    const { result } = renderHook(() => useSessionActions());

    expect(result.current.readonly).toBe(true);
    expect(result.current.athleteMode).toBe(false);
    expect(result.current.showAthleteControls).toBe(false);
    expect(result.current.stravaConnected).toBe(false);
    expect(result.current.junctionConnected).toBe(false);
  });

  it('useSessionActions outside provider: all optional callbacks are undefined', () => {
    const { result } = renderHook(() => useSessionActions());

    expect(result.current.onEdit).toBeUndefined();
    expect(result.current.onDelete).toBeUndefined();
    expect(result.current.onToggleComplete).toBeUndefined();
    expect(result.current.onUpdateNotes).toBeUndefined();
    expect(result.current.onUpdatePerformance).toBeUndefined();
    expect(result.current.onUpdateCoachPostFeedback).toBeUndefined();
    expect(result.current.onSyncStrava).toBeUndefined();
    expect(result.current.onConfirmStrava).toBeUndefined();
  });

  it('useSessionActions inside provider returns the provided values', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const value = makeValue({
      readonly: false,
      athleteMode: true,
      showAthleteControls: true,
      stravaConnected: true,
      junctionConnected: true,
      userRole: 'athlete',
      onEdit,
      onDelete,
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <SessionActionsProvider value={value}>{children}</SessionActionsProvider>
    );
    const { result } = renderHook(() => useSessionActions(), { wrapper });

    expect(result.current.readonly).toBe(false);
    expect(result.current.athleteMode).toBe(true);
    expect(result.current.showAthleteControls).toBe(true);
    expect(result.current.stravaConnected).toBe(true);
    expect(result.current.junctionConnected).toBe(true);
    expect(result.current.userRole).toBe('athlete');
    expect(result.current.onEdit).toBe(onEdit);
    expect(result.current.onDelete).toBe(onDelete);
  });
});
