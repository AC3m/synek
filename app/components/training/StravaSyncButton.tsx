import { Zap, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '~/lib/utils';
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
    <button
      onClick={(e) => {
        e.stopPropagation();
        void trigger(sessionId);
      }}
      disabled={isPending}
      className={cn(
        'inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-600 hover:bg-orange-200 dark:bg-orange-950 dark:text-orange-400 disabled:opacity-60 disabled:cursor-not-allowed',
        className
      )}
    >
      {isPending ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Zap className="h-2.5 w-2.5" />}
      <span>{t('strava.sync')}</span>
    </button>
  );
}
