import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { format, startOfDay, addDays } from 'date-fns'
import { Copy, Check, Link2 } from 'lucide-react'
import { useAuth } from '~/lib/context/AuthContext'
import { useInvites, useCreateInvite, useRevokeInvite } from '~/lib/hooks/useInvites'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import { Separator } from '~/components/ui/separator'
import { cn } from '~/lib/utils'
import { DAILY_INVITE_LIMIT } from '~/lib/config'
import type { Invite } from '~/types/invites'

interface AthletesTabProps {
  className?: string
}

function statusVariant(status: Invite['status']): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'pending':  return 'default'
    case 'used':     return 'secondary'
    case 'revoked':  return 'destructive'
    case 'expired':  return 'outline'
  }
}

export function AthletesTab({ className }: AthletesTabProps) {
  const { t } = useTranslation('coach')
  const { user } = useAuth()
  const coachId = user?.id ?? ''

  const { data: invites = [] } = useInvites(coachId)
  const createInvite = useCreateInvite()
  const revokeInvite = useRevokeInvite()

  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Daily usage: count invites created today (UTC midnight as boundary)
  const todayUtc = startOfDay(new Date())
  const used = invites.filter((i) => new Date(i.createdAt) >= todayUtc).length
  const limit = DAILY_INVITE_LIMIT
  const resetsAt = format(addDays(todayUtc, 1), 'HH:mm')
  const limitReached = used >= limit

  function inviteUrl(token: string) {
    return `${window.location.origin}/invite/${token}`
  }

  async function copyToClipboard(token: string, id: string) {
    await navigator.clipboard.writeText(inviteUrl(token))
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  async function handleGenerate() {
    const token = await createInvite.mutateAsync(coachId)
    await copyToClipboard(token, 'new')
  }

  return (
    <div className={cn('space-y-6', className)}>
      <div>
        <h3 className="text-base font-semibold">{t('athletes.inviteSection')}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {t('athletes.dailyLimit', { used, limit })}
          {' · '}
          {t('athletes.resetsAt', { time: resetsAt })}
        </p>
      </div>

      <Button
        onClick={handleGenerate}
        disabled={limitReached || createInvite.isPending}
        size="sm"
      >
        {createInvite.isPending ? t('athletes.generating') : t('athletes.generateLink')}
      </Button>

      {limitReached && (
        <p className="text-sm text-destructive">{t('athletes.limitReached')}</p>
      )}

      <Separator />

      {invites.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('athletes.inviteList.empty')}</p>
      ) : (
        <div className="space-y-3">
          {invites.map((invite) => (
            <div
              key={invite.id}
              className="flex items-center justify-between gap-3 rounded-lg border p-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Badge variant={statusVariant(invite.status)}>
                  {t(`athletes.inviteList.status.${invite.status}`)}
                </Badge>
                <span className="text-xs text-muted-foreground truncate">
                  {t('athletes.inviteList.createdAt', {
                    date: format(new Date(invite.createdAt), 'dd MMM yyyy'),
                  })}
                </span>
                {invite.status === 'pending' && (
                  <span className="text-xs text-muted-foreground hidden sm:block">
                    {t('athletes.inviteList.expiresAt', {
                      time: format(new Date(invite.expiresAt), 'dd MMM HH:mm'),
                    })}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {invite.status === 'pending' && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      title={t('athletes.copyLink')}
                      onClick={() => copyToClipboard(invite.token, invite.id)}
                    >
                      {copiedId === invite.id ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Link2 className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      disabled={revokeInvite.isPending}
                      onClick={() =>
                        revokeInvite.mutate({ inviteId: invite.id, coachId })
                      }
                    >
                      {t('athletes.revokeInvite')}
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
