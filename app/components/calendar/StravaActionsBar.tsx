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
    <div className="hidden md:block fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className={cn(
        'bg-zinc-900 dark:bg-zinc-800 text-zinc-50 shadow-lg ring-1 ring-white/10 overflow-hidden',
        bothVisible
          ? 'flex flex-col divide-y divide-zinc-700/60 rounded-2xl sm:flex-row sm:divide-y-0 sm:divide-x sm:rounded-full'
          : 'flex items-center rounded-full'
      )}>

        {showSync && (
          <div className="flex items-center gap-2.5 px-4 py-2.5">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-600 text-white font-bold text-xs shrink-0">
              {unsyncedCount}
            </div>
            {!bothVisible && (
              <span className="text-sm font-medium hidden sm:inline-block whitespace-nowrap">
                {t('strava.unsyncedSessions', { count: unsyncedCount })}
              </span>
            )}
            {!bothVisible && <div className="w-px h-5 bg-zinc-700 hidden sm:block" />}
            <Button
              onClick={onSyncAll}
              disabled={isSyncPending}
              variant="ghost"
              className="text-orange-400 hover:text-orange-300 hover:bg-white/5 font-semibold px-2 py-1 h-auto whitespace-nowrap ml-auto sm:ml-0"
            >
              {isSyncPending && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              {t('strava.syncAll')}
            </Button>
          </div>
        )}

        {showShare && (
          <div className="flex items-center gap-2.5 px-4 py-2.5">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-500 text-white font-bold text-xs shrink-0">
              {unsharedCount}
            </div>
            {!bothVisible && (
              <span className="text-sm font-medium hidden sm:inline-block whitespace-nowrap">
                {t('strava.unsharedSessions', { count: unsharedCount })}
              </span>
            )}
            {!bothVisible && <div className="w-px h-5 bg-zinc-700 hidden sm:block" />}
            <Button
              onClick={onShareAll}
              disabled={isSharePending}
              variant="ghost"
              className="text-orange-400 hover:text-orange-300 hover:bg-white/5 font-semibold px-2 py-1 h-auto whitespace-nowrap ml-auto sm:ml-0"
            >
              {isSharePending && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              {t('strava.shareAll')}
            </Button>
          </div>
        )}

      </div>
    </div>
  );
}
