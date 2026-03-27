import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { TrainingSession, AthleteSessionUpdate } from '~/types/training';
import type { UserRole } from '~/lib/auth';

export interface SessionActionsContextValue {
  readonly: boolean;
  athleteMode: boolean;
  showAthleteControls: boolean;
  stravaConnected: boolean;
  junctionConnected: boolean;
  userRole?: UserRole;
  onEdit?: (session: TrainingSession) => void;
  onDelete?: (sessionId: string) => void;
  onToggleComplete?: (sessionId: string, completed: boolean) => void;
  onUpdateNotes?: (sessionId: string, notes: string | null) => void;
  onUpdatePerformance?: (sessionId: string, update: Omit<AthleteSessionUpdate, 'id'>) => void;
  onUpdateCoachPostFeedback?: (sessionId: string, feedback: string | null) => void;
  onSyncStrava?: (sessionId: string) => Promise<void>;
  onConfirmStrava?: (sessionId: string) => Promise<void>;
}

const SESSION_ACTIONS_DEFAULTS: SessionActionsContextValue = {
  readonly: true,
  athleteMode: false,
  showAthleteControls: false,
  stravaConnected: false,
  junctionConnected: false,
};

const SessionActionsContext = createContext<SessionActionsContextValue | null>(null);

interface SessionActionsProviderProps {
  value: SessionActionsContextValue;
  children: ReactNode;
}

export function SessionActionsProvider({ value, children }: SessionActionsProviderProps) {
  return <SessionActionsContext.Provider value={value}>{children}</SessionActionsContext.Provider>;
}

export function useSessionActions(): SessionActionsContextValue {
  return useContext(SessionActionsContext) ?? SESSION_ACTIONS_DEFAULTS;
}
