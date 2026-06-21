import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import { useAuth } from '~/lib/context/AuthContext';
import {
  useHealthKitAvailable,
  useHealthKitSync,
  useHealthKitSyncStatus,
} from '~/lib/hooks/useHealthKitConnection';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { cn } from '~/lib/utils';

interface HealthKitSectionProps {
  className?: string;
}

export function HealthKitSection({ className }: HealthKitSectionProps) {
  const { t } = useTranslation('common');
  const { user } = useAuth();
  const available = useHealthKitAvailable();
  const { data: status } = useHealthKitSyncStatus(user?.id ?? '');
  const sync = useHealthKitSync();
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function handleSync() {
    if (!user) return;
    setResultMsg(null);
    setErrorMsg(null);
    sync.mutate(
      { userId: user.id },
      {
        onSuccess: (data) => {
          if (data.upserted === 0) {
            setResultMsg(t('healthkit.noWorkouts'));
            return;
          }
          setResultMsg(
            `${t('healthkit.synced', { count: data.upserted })} · ${t('healthkit.matched', { count: data.matched })}`,
          );
        },
        onError: (err) => {
          setErrorMsg(
            t('healthkit.errorSync', { message: err instanceof Error ? err.message : String(err) }),
          );
        },
      },
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-3">
        <svg viewBox="0 0 40 40" className="h-8 w-8" aria-hidden>
          <rect width="40" height="40" rx="6" fill="#000" />
          <path d="M20 30c-4-3-8-6-8-11a4 4 0 017-2.6A4 4 0 0128 19c0 5-4 8-8 11z" fill="#FF2D55" />
        </svg>
        <span className="font-semibold">{t('healthkit.title')}</span>
        {status?.lastSyncAt && <Badge variant="secondary">{t('healthkit.syncedBadge')}</Badge>}
      </div>

      {!available ? (
        <p className="text-sm text-muted-foreground">{t('healthkit.iosOnlyNotice')}</p>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{t('healthkit.description')}</p>
          {status?.lastSyncAt && (
            <p className="text-xs text-muted-foreground">
              {t('healthkit.lastSynced', { time: format(parseISO(status.lastSyncAt), 'PPp') })}
            </p>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={sync.isPending || !user}
          >
            {sync.isPending ? t('healthkit.syncing') : t('healthkit.syncButton')}
          </Button>
          {resultMsg && <p className="text-xs text-muted-foreground">{resultMsg}</p>}
          {errorMsg && <p className="text-xs text-destructive">{errorMsg}</p>}
          {status?.lastError && !errorMsg && (
            <p className="text-xs text-destructive">
              {t('healthkit.errorSync', { message: status.lastError })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
