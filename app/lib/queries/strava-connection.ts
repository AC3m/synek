import { supabase, isMockMode } from '~/lib/supabase';
import type { StravaConnectionStatus } from '~/types/strava';

// ============================================================
// Mock state
// ============================================================

let mockConnected = false;
let mockAthleteName: string | null = null;
let mockConnectedAt: string | null = null;
let mockLastSyncedAt: string | null = null;

async function getValidAccessToken(): Promise<string> {
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;

  if (!session) {
    throw new Error('Not authenticated');
  }

  const expiresAtMs = session.expires_at ? session.expires_at * 1000 : 0;
  const needsRefresh = expiresAtMs !== 0 && expiresAtMs < Date.now() + 60_000;
  if (!needsRefresh) return session.access_token;

  const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError || !refreshed.session) {
    throw refreshError ?? new Error('Session refresh failed');
  }

  return refreshed.session.access_token;
}

// ============================================================
// Get connection status
// ============================================================

export async function mockGetStravaConnectionStatus(): Promise<StravaConnectionStatus> {
  await new Promise((r) => setTimeout(r, 150));
  return {
    connected: mockConnected,
    stravaAthleteName: mockAthleteName,
    connectedAt: mockConnectedAt,
    lastSyncedAt: mockLastSyncedAt,
  };
}

export async function getStravaConnectionStatus(userId: string): Promise<StravaConnectionStatus> {
  if (isMockMode) return mockGetStravaConnectionStatus();

  const { data, error } = await supabase
    .from('strava_tokens')
    .select('strava_athlete_name, connected_at, last_synced_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return { connected: false, stravaAthleteName: null, connectedAt: null, lastSyncedAt: null };

  return {
    connected: true,
    stravaAthleteName: data.strava_athlete_name as string | null,
    connectedAt: data.connected_at as string | null,
    lastSyncedAt: data.last_synced_at as string | null,
  };
}

// ============================================================
// Exchange OAuth code (calls Edge Function)
// ============================================================

export async function mockConnectStrava(code: string): Promise<{ stravaAthleteName: string }> {
  await new Promise((r) => setTimeout(r, 600));
  void code;
  mockConnected = true;
  mockAthleteName = 'Alice Strava';
  mockConnectedAt = new Date().toISOString();
  return { stravaAthleteName: 'Alice Strava' };
}

export async function connectStrava(
  code: string,
  userId: string
): Promise<{ stravaAthleteName: string }> {
  if (isMockMode) return mockConnectStrava(code);

  const res = await supabase.functions.invoke('strava-auth', {
    body: { code, userId },
  });
  if (res.error) throw res.error;
  return res.data as { stravaAthleteName: string };
}

// ============================================================
// Sync activities for a week (calls Edge Function)
// ============================================================

export async function mockSyncStrava(weekStart: string): Promise<{ synced: number; lastSyncedAt: string }> {
  await new Promise((r) => setTimeout(r, 800));
  void weekStart;
  mockLastSyncedAt = new Date().toISOString();
  return { synced: 1, lastSyncedAt: mockLastSyncedAt };
}

export async function syncStrava(
  weekStart: string
): Promise<{ synced: number; lastSyncedAt: string }> {
  if (isMockMode) return mockSyncStrava(weekStart);

  const accessToken = await getValidAccessToken();
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

  const res = await fetch(`${supabaseUrl}/functions/v1/strava-sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ weekStart }),
  });

  const payload = (await res.json().catch(() => null)) as
    | { synced?: number; lastSyncedAt?: string; error?: string; code?: number; message?: string }
    | null;

  if (!res.ok) {
    throw new Error(payload?.message ?? payload?.error ?? `strava-sync failed (${res.status})`);
  }

  return {
    synced: payload?.synced ?? 0,
    lastSyncedAt: payload?.lastSyncedAt ?? new Date().toISOString(),
  };
}

// ============================================================
// Disconnect (calls Edge Function)
// ============================================================

export async function mockDisconnectStrava(): Promise<void> {
  await new Promise((r) => setTimeout(r, 300));
  mockConnected = false;
  mockAthleteName = null;
  mockConnectedAt = null;
  mockLastSyncedAt = null;
}

export async function disconnectStrava(userId: string): Promise<void> {
  if (isMockMode) return mockDisconnectStrava();

  const res = await supabase.functions.invoke('strava-disconnect', {
    body: { userId },
  });
  if (res.error) throw res.error;
}
