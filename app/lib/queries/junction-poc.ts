// PoC: Junction Garmin integration — remove after evaluation
import { supabase, isMockMode } from '~/lib/supabase';
import {
  getMockJunctionConnection,
  mockCreateJunctionConnection,
  mockDisconnectJunctionConnection,
} from '~/lib/mock-data/junction-poc';
import type { JunctionPocConnection } from '~/types/junction-poc';

function toJunctionConnection(row: Record<string, unknown>): JunctionPocConnection {
  return {
    id: row.id as string,
    appUserId: row.app_user_id as string,
    junctionUserId: row.junction_user_id as string,
    connectedAt: row.connected_at as string,
    status: row.status as 'active' | 'disconnected',
    disconnectedAt: (row.disconnected_at as string | null) ?? null,
  };
}

export async function fetchJunctionConnection(
  appUserId: string,
): Promise<JunctionPocConnection | null> {
  if (isMockMode) return getMockJunctionConnection(appUserId);

  const { data, error } = await supabase
    .from('junction_poc_connections')
    .select('id, app_user_id, junction_user_id, connected_at, status, disconnected_at')
    .eq('app_user_id', appUserId)
    .eq('status', 'active')
    .maybeSingle();

  if (error) throw error;
  return data ? toJunctionConnection(data) : null;
}

export async function createJunctionConnection(
  appUserId: string,
  junctionUserId: string,
): Promise<JunctionPocConnection> {
  if (isMockMode) return mockCreateJunctionConnection(appUserId, junctionUserId);

  const { data, error } = await supabase
    .from('junction_poc_connections')
    .upsert(
      { app_user_id: appUserId, junction_user_id: junctionUserId, status: 'active', disconnected_at: null },
      { onConflict: 'app_user_id' },
    )
    .select('id, app_user_id, junction_user_id, connected_at, status, disconnected_at')
    .single();

  if (error) throw error;
  return toJunctionConnection(data);
}

export async function disconnectJunctionConnection(appUserId: string): Promise<void> {
  if (isMockMode) {
    mockDisconnectJunctionConnection(appUserId);
    return;
  }

  const { error } = await supabase
    .from('junction_poc_connections')
    .update({ status: 'disconnected', disconnected_at: new Date().toISOString() })
    .eq('app_user_id', appUserId)
    .eq('status', 'active');

  if (error) throw error;
}
