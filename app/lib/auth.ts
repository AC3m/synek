// ============================================================
// Auth types
// ============================================================

export type UserRole = 'coach' | 'athlete';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  name: string;
}

export interface MockAthlete {
  id: string;
  name: string;
  email: string;
}

// ============================================================
// Session storage keys
// ============================================================

const SESSION_USER_KEY = 'synek_user_id';
const SESSION_ATHLETE_KEY = 'synek_selected_athlete';

// ============================================================
// Mock users (accounts provisioned out-of-band per spec)
// ============================================================

const MOCK_USERS: (AuthUser & { password: string })[] = [
  {
    id: 'coach-1',
    email: 'coach@synek.app',
    password: 'coach123',
    role: 'coach',
    name: 'Coach',
  },
  {
    id: 'athlete-1',
    email: 'alice@synek.app',
    password: 'alice123',
    role: 'athlete',
    name: 'Alice Johnson',
  },
  {
    id: 'athlete-2',
    email: 'bob@synek.app',
    password: 'bob123',
    role: 'athlete',
    name: 'Bob Smith',
  },
];

// Coach → athletes relationship (provisioned out-of-band)
const COACH_ATHLETES: Record<string, string[]> = {
  'coach-1': ['athlete-1', 'athlete-2'],
};

// ============================================================
// Mock auth functions
// ============================================================

export async function mockLogin(
  email: string,
  password: string
): Promise<AuthUser> {
  await new Promise((r) => setTimeout(r, 300));
  const found = MOCK_USERS.find(
    (u) => u.email === email && u.password === password
  );
  if (!found) throw new Error('Invalid email or password');
  const { password: _pw, ...authUser } = found;
  return authUser;
}

export function getUserById(id: string): AuthUser | null {
  const found = MOCK_USERS.find((u) => u.id === id);
  if (!found) return null;
  const { password: _pw, ...authUser } = found;
  return authUser;
}

export function getAthletesForCoach(coachId: string): MockAthlete[] {
  const athleteIds = COACH_ATHLETES[coachId] ?? [];
  return athleteIds.flatMap((id) => {
    const user = MOCK_USERS.find((u) => u.id === id);
    if (!user) return [];
    return [{ id: user.id, name: user.name, email: user.email }];
  });
}

// ============================================================
// Session storage helpers
// ============================================================

export function persistUserId(userId: string): void {
  try {
    sessionStorage.setItem(SESSION_USER_KEY, userId);
  } catch {
    // sessionStorage unavailable (SSR, private mode, etc.)
  }
}

export function getPersistedUserId(): string | null {
  try {
    return sessionStorage.getItem(SESSION_USER_KEY);
  } catch {
    return null;
  }
}

export function persistSelectedAthleteId(athleteId: string | null): void {
  try {
    if (athleteId) {
      sessionStorage.setItem(SESSION_ATHLETE_KEY, athleteId);
    } else {
      sessionStorage.removeItem(SESSION_ATHLETE_KEY);
    }
  } catch {
    // ignore
  }
}

export function getPersistedSelectedAthleteId(): string | null {
  try {
    return sessionStorage.getItem(SESSION_ATHLETE_KEY);
  } catch {
    return null;
  }
}

export function clearPersistedAuth(): void {
  try {
    sessionStorage.removeItem(SESSION_USER_KEY);
    sessionStorage.removeItem(SESSION_ATHLETE_KEY);
  } catch {
    // ignore
  }
}
