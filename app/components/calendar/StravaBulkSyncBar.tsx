import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { Button } from '~/components/ui/button';

interface StravaBulkSyncBarProps {
  unsyncedCount: number;
  onSyncAll: () => void;
  isPending?: boolean;
}

export function StravaBulkSyncBar({ unsyncedCount, onSyncAll, isPending }: StravaBulkSyncBarProps) {
  const { t } = useTranslation('common');

  if (unsyncedCount < 2) return null;

  return (
    <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-4 bg-zinc-900 dark:bg-zinc-800 text-zinc-50 px-4 py-2.5 rounded-full shadow-lg ring-1 ring-white/10">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-600 text-white font-bold text-xs">
            {unsyncedCount}
          </div>
          <span className="text-sm font-medium hidden xs:inline-block">
            {t('strava.unsyncedSessions', { count: unsyncedCount })}
          </span>
        </div>

        <div className="w-px h-6 bg-zinc-700 mx-1 hidden xs:block" />

        <Button
          onClick={onSyncAll}
          disabled={isPending}
          variant="ghost"
          className="text-orange-400 hover:text-orange-300 hover:bg-white/5 font-semibold px-2 py-1 h-auto"
        >
          {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {t('strava.syncAll')}
        </Button>
      </div>
    </div>
  );
}
