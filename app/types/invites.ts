export type InviteStatus = 'pending' | 'used' | 'revoked' | 'expired'

export interface Invite {
  id: string
  token: string
  coachId: string | null
  status: InviteStatus
  createdAt: string
  expiresAt: string
  usedBy: string | null
  usedAt: string | null
}

export interface InvitePreview {
  valid: boolean
  coachName?: string
  reason?: 'not_found' | 'used' | 'revoked' | 'expired'
}

export interface DailyInviteUsage {
  used: number
  limit: number
  resetsAt: string
}
