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
    <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 animate-in duration-300 fade-in slide-in-from-bottom-4 md:bottom-6">
      <div className="flex items-center gap-4 rounded-full bg-zinc-900 px-4 py-2.5 text-zinc-50 shadow-lg ring-1 ring-white/10 dark:bg-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-600 text-xs font-bold text-white">
            {unsyncedCount}
          </div>
          <span className="xs:inline-block hidden text-sm font-medium">
            {t('strava.unsyncedSessions', { count: unsyncedCount })}
          </span>
        </div>

        <div className="xs:block mx-1 hidden h-6 w-px bg-zinc-700" />

        <Button
          onClick={onSyncAll}
          disabled={isPending}
          variant="ghost"
          className="h-auto px-2 py-1 font-semibold text-orange-400 hover:bg-white/5 hover:text-orange-300"
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t('strava.syncAll')}
        </Button>
      </div>
    </div>
  );
}
