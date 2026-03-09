import { supabase, isMockMode } from '~/lib/supabase'
import {
  mockListInvites,
  mockCreateInvite,
  mockRevokeInvite,
  mockGetInvitePreview,
} from '~/lib/mock-data'
import type { Invite, InvitePreview } from '~/types/invites'

export function toInvite(row: Record<string, unknown>): Invite {
  return {
    id: row.id as string,
    token: row.token as string,
    coachId: (row.coach_id as string | null) ?? null,
    status: row.status as Invite['status'],
    createdAt: row.created_at as string,
    expiresAt: row.expires_at as string,
    usedBy: (row.used_by as string | null) ?? null,
    usedAt: (row.used_at as string | null) ?? null,
  }
}

export async function listInvites(coachId: string): Promise<Invite[]> {
  if (isMockMode) return mockListInvites(coachId)

  const { data, error } = await supabase
    .from('invites')
    .select('id, token, coach_id, status, created_at, expires_at, used_by, used_at')
    .eq('coach_id', coachId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map(toInvite)
}

export async function createInvite(): Promise<string> {
  if (isMockMode) {
    // mockCreateInvite needs coachId — we can't get auth here in mock mode,
    // so callers (useCreateInvite) pass coachId through the mutation arg
    throw new Error('Use createInviteForCoach in mock mode')
  }

  const { data, error } = await supabase.rpc('create_invite')
  if (error) throw error
  return data as string
}

export async function createInviteForCoach(coachId: string): Promise<string> {
  if (isMockMode) return mockCreateInvite(coachId)
  return createInvite()
}

export async function revokeInvite(inviteId: string): Promise<void> {
  if (isMockMode) {
    mockRevokeInvite(inviteId)
    return
  }

  const { error } = await supabase
    .from('invites')
    .update({ status: 'revoked' })
    .eq('id', inviteId)

  if (error) throw error
}

export async function getInvitePreview(token: string): Promise<InvitePreview> {
  if (isMockMode) return mockGetInvitePreview(token)

  const { data, error } = await supabase.rpc('get_invite_preview', { p_token: token })
  if (error) throw error
  return data as InvitePreview
}
