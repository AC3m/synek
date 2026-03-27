import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { isMockMode, supabase } from '~/lib/supabase';
import {
  type AuthUser,
  type MockAthlete,
  mockLogin,
  getUserById,
  getAthletesForCoach,
  persistUserId,
  getPersistedUserId,
  persistSelectedAthleteId,
  getPersistedSelectedAthleteId,
  clearPersistedAuth,
} from '~/lib/auth';

// ============================================================
// Context types
// ============================================================

interface AuthContextValue {
  user: AuthUser | null;
  selectedAthleteId: string | null;
  /** The athlete whose data is in scope: user.id for athletes, selectedAthleteId for coaches */
  effectiveAthleteId: string | null;
  /** For coaches: the list of assigned athletes */
  athletes: MockAthlete[];
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  selectAthlete: (athleteId: string) => void;
  clearSelectedAthlete: () => void;
  updateProfile: (name: string, avatarUrl: string | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ============================================================
// Provider
// ============================================================

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [athletes, setAthletes] = useState<MockAthlete[]>([]);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore coach's selected athlete (FR-011)
  function restoreSelectedAthlete() {
    return getPersistedSelectedAthleteId();
  }

  // Load athletes for a coach user
  function loadAthletes(authUser: AuthUser) {
    if (authUser.role !== 'coach') return;
    if (isMockMode) {
      setAthletes(getAthletesForCoach(authUser.id));
    } else {
      // Real mode: fetch from coach_athletes joined with profiles
      supabase
        .from('coach_athletes')
        .select('athlete_id, profiles!athlete_id(id, name, email)')
        .eq('coach_id', authUser.id)
        .then(({ data }) => {
          if (data) {
            const list: MockAthlete[] = data.flatMap((row) => {
              const p = (Array.isArray(row.profiles) ? row.profiles[0] : row.profiles) as {
                id: string;
                name: string;
                email: string;
              } | null;
              if (!p) return [];
              return [{ id: p.id, name: p.name, email: p.email }];
            });
            setAthletes(list);
          }
        });
    }
  }

  // Initialize auth state on mount
  useEffect(() => {
    if (isMockMode) {
      const userId = getPersistedUserId();
      if (userId) {
        const authUser = getUserById(userId);
        if (authUser) {
          setUser(authUser);
          loadAthletes(authUser);
          if (authUser.role === 'coach') {
            setSelectedAthleteId(restoreSelectedAthlete());
          }
        }
      }
      setIsLoading(false);
      return;
    }

    // Real Supabase mode — use onAuthStateChange as the single source of truth.
    // It fires INITIAL_SESSION on mount (replaces the need for a separate getSession call)
    // and handles all subsequent auth events.
    //
    // IMPORTANT: Supabase JS v2 awaits this callback while holding the auth lock.
    // Making supabase client calls (supabase.from, getSession) inside the callback
    // directly causes a deadlock. Async profile loading is deferred via setTimeout
    // to release the auth lock before any follow-up supabase calls are made.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        const userId = session.user.id;
        const userEmail = session.user.email!;

        setTimeout(async () => {
          try {
            const { data: profile, error } = await supabase
              .from('profiles')
              .select('id, name, role, avatar_url')
              .eq('id', userId)
              .single();

            if (error) {
              // profiles table missing or other error — sign out cleanly
              console.warn('[Auth] Could not load profile:', error.message);
              await supabase.auth.signOut();
              setUser(null);
              setAthletes([]);
              setSelectedAthleteId(null);
            } else if (profile) {
              const authUser: AuthUser = {
                id: profile.id,
                email: userEmail,
                role: profile.role,
                name: profile.name,
                avatarUrl: (profile.avatar_url as string | null) ?? null,
              };
              setUser(authUser);
              loadAthletes(authUser);
              if (authUser.role === 'coach') {
                setSelectedAthleteId(restoreSelectedAthlete());
              }
            }
          } catch (err) {
            console.warn('[Auth] Profile load failed:', err);
          } finally {
            setIsLoading(false);
          }
        }, 0);
      } else {
        setUser(null);
        setAthletes([]);
        setSelectedAthleteId(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    if (isMockMode) {
      const authUser = await mockLogin(email, password);
      setUser(authUser);
      persistUserId(authUser.id);
      if (authUser.role === 'coach') {
        const restored = restoreSelectedAthlete();
        setSelectedAthleteId(restored);
        setAthletes(getAthletesForCoach(authUser.id));
      } else {
        setAthletes([]);
        setSelectedAthleteId(null);
      }
      return;
    }

    // Real Supabase mode
    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw new Error(error.message);

    if (data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, name, role, avatar_url')
        .eq('id', data.user.id)
        .single();

      if (profile) {
        const authUser: AuthUser = {
          id: profile.id,
          email: data.user.email!,
          role: profile.role,
          name: profile.name,
          avatarUrl: (profile.avatar_url as string | null) ?? null,
        };
        setUser(authUser);
        persistUserId(authUser.id);
        loadAthletes(authUser);
        if (authUser.role === 'coach') {
          setSelectedAthleteId(restoreSelectedAthlete());
        }
      }
    }
  }, []);

  const logout = useCallback(() => {
    clearPersistedAuth();
    setUser(null);
    setAthletes([]);
    setSelectedAthleteId(null);
    if (!isMockMode) {
      supabase.auth.signOut();
    }
  }, []);

  const updateProfile = useCallback((name: string, avatarUrl: string | null) => {
    setUser((prev) => (prev ? { ...prev, name, avatarUrl } : prev));
  }, []);

  const selectAthlete = useCallback((athleteId: string) => {
    setSelectedAthleteId(athleteId);
    persistSelectedAthleteId(athleteId);
  }, []);

  const clearSelectedAthlete = useCallback(() => {
    setSelectedAthleteId(null);
    persistSelectedAthleteId(null);
  }, []);

  const effectiveAthleteId: string | null = user?.role === 'athlete' ? user.id : selectedAthleteId;

  return (
    <AuthContext.Provider
      value={{
        user,
        selectedAthleteId,
        effectiveAthleteId,
        athletes,
        isLoading,
        login,
        logout,
        selectAthlete,
        clearSelectedAthlete,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ============================================================
// Hook
// ============================================================

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
