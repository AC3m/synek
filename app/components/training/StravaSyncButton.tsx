import { Zap, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '~/lib/utils';
import { Button } from '~/components/ui/button';
import { useSessionActions } from '~/lib/context/SessionActionsContext';
import { useAsyncAction } from '~/lib/hooks/useAsyncAction';

interface StravaSyncButtonProps {
  sessionId: string;
  isCompleted: boolean;
  hasStravaActivity: boolean;
  className?: string;
}

export function StravaSyncButton({ sessionId, isCompleted, hasStravaActivity, className }: StravaSyncButtonProps) {
  const { t } = useTranslation('common');
  const { stravaConnected, onSyncStrava } = useSessionActions();
  const { trigger, isPending } = useAsyncAction(onSyncStrava);

  if (!stravaConnected || !isCompleted || hasStravaActivity) return null;

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={isPending}
      className={cn(
        'w-full text-[10px] h-7 px-2 border-orange-200 text-orange-600 hover:bg-orange-50 hover:text-orange-700 dark:border-orange-900 dark:text-orange-400 dark:hover:bg-orange-950 dark:hover:text-orange-300 disabled:opacity-60 disabled:cursor-not-allowed',
        className
      )}
      onClick={(e) => {
        e.stopPropagation();
        void trigger(sessionId);
      }}
    >
      {isPending ? <Loader2 className="h-2.5 w-2.5 animate-spin shrink-0" /> : <Zap className="h-2.5 w-2.5 shrink-0" />}
      <span className="truncate">{t('strava.sync')}</span>
    </Button>
  );
}
