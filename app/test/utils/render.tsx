import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { RenderOptions } from '@testing-library/react';
import { createContext, useContext, type ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { createTestQueryClient } from './query-client';

// ---------------------------------------------------------------------------
// Minimal mock AuthContext — mirrors AuthContextValue from AuthContext.tsx
// ---------------------------------------------------------------------------

interface MockUser {
  id: string;
  role: 'coach' | 'athlete';
  name: string;
  email: string;
  avatarUrl?: string | null;
}

interface MockAuthContextValue {
  user: MockUser | null;
  selectedAthleteId: string | null;
  effectiveAthleteId: string | null;
  athletes: Array<{ id: string; name: string; email: string }>;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  selectAthlete: (athleteId: string) => void;
  clearSelectedAthlete: () => void;
  updateProfile: (name: string, avatarUrl: string | null) => void;
}

const MockAuthContext = createContext<MockAuthContextValue | null>(null);

export function useMockAuth(): MockAuthContextValue {
  const ctx = useContext(MockAuthContext);
  if (!ctx) throw new Error('useMockAuth must be used within renderWithProviders');
  return ctx;
}

// ---------------------------------------------------------------------------
// renderWithProviders
// ---------------------------------------------------------------------------

interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  /** Pre-seed an authenticated user. Omit for unauthenticated state. */
  mockUser?: MockUser & { selectedAthleteId?: string | null };
  /** Start the MemoryRouter at this path. Omit to skip routing wrapper. */
  initialRoute?: string;
}

export function renderWithProviders(ui: ReactNode, options: RenderWithProvidersOptions = {}) {
  const { mockUser, initialRoute, ...renderOptions } = options;
  const queryClient = createTestQueryClient();

  const effectiveAthleteId =
    mockUser?.role === 'athlete' ? mockUser.id : (mockUser?.selectedAthleteId ?? null);

  const authValue: MockAuthContextValue = {
    user: mockUser
      ? {
          id: mockUser.id,
          role: mockUser.role,
          name: mockUser.name,
          email: mockUser.email,
          avatarUrl: mockUser.avatarUrl ?? null,
        }
      : null,
    selectedAthleteId: mockUser?.selectedAthleteId ?? null,
    effectiveAthleteId,
    athletes: [],
    isLoading: false,
    login: async () => {},
    logout: () => {},
    selectAthlete: () => {},
    clearSelectedAthlete: () => {},
    updateProfile: () => {},
  };

  function Wrapper({ children }: { children: ReactNode }) {
    const content = (
      <QueryClientProvider client={queryClient}>
        <MockAuthContext.Provider value={authValue}>{children}</MockAuthContext.Provider>
      </QueryClientProvider>
    );

    if (initialRoute !== undefined) {
      return <MemoryRouter initialEntries={[initialRoute]}>{content}</MemoryRouter>;
    }

    return content;
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  };
}
