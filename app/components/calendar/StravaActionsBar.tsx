import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { cn } from '~/lib/utils';

interface StravaActionsBarProps {
  unsyncedCount: number;
  unsharedCount: number;
  onSyncAll: () => void;
  onShareAll: () => void;
  isSyncPending?: boolean;
  isSharePending?: boolean;
}

export function StravaActionsBar({
  unsyncedCount,
  unsharedCount,
  onSyncAll,
  onShareAll,
  isSyncPending,
  isSharePending,
}: StravaActionsBarProps) {
  const { t } = useTranslation('common');

  const showSync = unsyncedCount >= 2;
  const showShare = unsharedCount >= 2;
  const bothVisible = showSync && showShare;

  if (!showSync && !showShare) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-50 hidden -translate-x-1/2 animate-in duration-300 fade-in slide-in-from-bottom-4 md:block">
      <div
        className={cn(
          'overflow-hidden bg-zinc-900 text-zinc-50 shadow-lg ring-1 ring-white/10 dark:bg-zinc-800',
          bothVisible
            ? 'flex flex-col divide-y divide-zinc-700/60 rounded-2xl sm:flex-row sm:divide-x sm:divide-y-0 sm:rounded-full'
            : 'flex items-center rounded-full',
        )}
      >
        {showSync && (
          <div className="flex items-center gap-2.5 px-4 py-2.5">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-600 text-xs font-bold text-white">
              {unsyncedCount}
            </div>
            {!bothVisible && (
              <span className="hidden text-sm font-medium whitespace-nowrap sm:inline-block">
                {t('strava.unsyncedSessions', { count: unsyncedCount })}
              </span>
            )}
            {!bothVisible && <div className="hidden h-5 w-px bg-zinc-700 sm:block" />}
            <Button
              onClick={onSyncAll}
              disabled={isSyncPending}
              variant="ghost"
              className="ml-auto h-auto px-2 py-1 font-semibold whitespace-nowrap text-orange-400 hover:bg-white/5 hover:text-orange-300 sm:ml-0"
            >
              {isSyncPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {t('strava.syncAll')}
            </Button>
          </div>
        )}

        {showShare && (
          <div className="flex items-center gap-2.5 px-4 py-2.5">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">
              {unsharedCount}
            </div>
            {!bothVisible && (
              <span className="hidden text-sm font-medium whitespace-nowrap sm:inline-block">
                {t('strava.unsharedSessions', { count: unsharedCount })}
              </span>
            )}
            {!bothVisible && <div className="hidden h-5 w-px bg-zinc-700 sm:block" />}
            <Button
              onClick={onShareAll}
              disabled={isSharePending}
              variant="ghost"
              className="ml-auto h-auto px-2 py-1 font-semibold whitespace-nowrap text-orange-400 hover:bg-white/5 hover:text-orange-300 sm:ml-0"
            >
              {isSharePending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {t('strava.shareAll')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
