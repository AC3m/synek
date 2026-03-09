import { toInvite } from '~/lib/queries/invites';

const baseRow: Record<string, unknown> = {
  id: 'inv-abc',
  token: 'abc123def456abc123def456abc123de',
  coach_id: 'coach-1',
  status: 'pending',
  created_at: '2026-03-09T10:00:00Z',
  expires_at: '2026-03-10T10:00:00Z',
  used_by: null,
  used_at: null,
};

describe('toInvite (row mapper)', () => {
  it('maps snake_case DB fields to camelCase Invite', () => {
    const invite = toInvite(baseRow);
    expect(invite.id).toBe('inv-abc');
    expect(invite.token).toBe('abc123def456abc123def456abc123de');
    expect(invite.coachId).toBe('coach-1');
    expect(invite.status).toBe('pending');
    expect(invite.createdAt).toBe('2026-03-09T10:00:00Z');
    expect(invite.expiresAt).toBe('2026-03-10T10:00:00Z');
    expect(invite.usedBy).toBeNull();
    expect(invite.usedAt).toBeNull();
  });

  it('preserves null coachId (GDPR-erased coach)', () => {
    const invite = toInvite({ ...baseRow, coach_id: null });
    expect(invite.coachId).toBeNull();
  });

  it('maps used_by and used_at when set', () => {
    const invite = toInvite({
      ...baseRow,
      status: 'used',
      used_by: 'athlete-1',
      used_at: '2026-03-09T11:00:00Z',
    });
    expect(invite.status).toBe('used');
    expect(invite.usedBy).toBe('athlete-1');
    expect(invite.usedAt).toBe('2026-03-09T11:00:00Z');
  });
});
