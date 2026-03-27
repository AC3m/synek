import type { Invite, InvitePreview } from '~/types/invites';
import { DAILY_INVITE_LIMIT } from '~/lib/config';

// ---------------------------------------------------------------------------
// Seed data — 4 invites for coach-1, one per status
// ---------------------------------------------------------------------------

const now = new Date();
const future = new Date(now.getTime() + 23 * 60 * 60 * 1000).toISOString();
const past = new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString();

const MOCK_INVITES: Invite[] = [
  {
    id: 'inv-1',
    token: 'abc123def456abc123def456abc123de',
    coachId: 'coach-1',
    status: 'pending',
    createdAt: now.toISOString(),
    expiresAt: future,
    usedBy: null,
    usedAt: null,
  },
  {
    id: 'inv-2',
    token: 'def456abc123def456abc123def456ab',
    coachId: 'coach-1',
    status: 'used',
    createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
    expiresAt: future,
    usedBy: 'athlete-1',
    usedAt: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'inv-3',
    token: 'ghi789jkl012ghi789jkl012ghi789jk',
    coachId: 'coach-1',
    status: 'revoked',
    createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
    expiresAt: future,
    usedBy: null,
    usedAt: null,
  },
  {
    id: 'inv-4',
    token: 'jkl012mno345jkl012mno345jkl012mn',
    coachId: 'coach-1',
    status: 'expired',
    createdAt: new Date(now.getTime() - 26 * 60 * 60 * 1000).toISOString(),
    expiresAt: past,
    usedBy: null,
    usedAt: null,
  },
];

// Mutable store — deep-cloned so tests can reset without affecting MOCK_INVITES
let inviteStore: Invite[] = MOCK_INVITES.map((i) => ({ ...i }));

export function resetMockInvites() {
  inviteStore = MOCK_INVITES.map((i) => ({ ...i }));
}

// ---------------------------------------------------------------------------
// CRUD mock implementations
// ---------------------------------------------------------------------------

export function mockListInvites(coachId: string): Invite[] {
  return inviteStore
    .filter((i) => i.coachId === coachId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function mockCreateInvite(coachId: string): string {
  const todayUtc = new Date();
  todayUtc.setUTCHours(0, 0, 0, 0);
  const count = inviteStore.filter(
    (i) => i.coachId === coachId && new Date(i.createdAt) >= todayUtc,
  ).length;

  if (count >= DAILY_INVITE_LIMIT) throw new Error('rate_limit_exceeded');

  const token = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const invite: Invite = {
    id: `inv-${Date.now()}`,
    token,
    coachId,
    status: 'pending',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    usedBy: null,
    usedAt: null,
  };
  inviteStore.push(invite);
  return token;
}

export function mockRevokeInvite(inviteId: string): void {
  const invite = inviteStore.find((i) => i.id === inviteId);
  if (invite) invite.status = 'revoked';
}

export function mockGetInvitePreview(token: string): InvitePreview {
  const invite = inviteStore.find((i) => i.token === token);
  if (!invite) return { valid: false, reason: 'not_found' };
  if (invite.status === 'used') return { valid: false, reason: 'used' };
  if (invite.status === 'revoked') return { valid: false, reason: 'revoked' };
  if (invite.status === 'expired' || new Date(invite.expiresAt) < new Date()) {
    return { valid: false, reason: 'expired' };
  }
  return { valid: true, coachName: 'Coach' };
}
