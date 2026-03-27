import { Share2, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '~/lib/utils';
import { Button } from '~/components/ui/button';
import { useSessionActions } from '~/lib/context/SessionActionsContext';
import { useAsyncAction } from '~/lib/hooks/useAsyncAction';

interface StravaConfirmButtonProps {
  sessionId: string;
  hasStravaActivity: boolean;
  isStravaConfirmed: boolean | null | undefined;
  className?: string;
}

export function StravaConfirmButton({
  sessionId,
  hasStravaActivity,
  isStravaConfirmed,
  className,
}: StravaConfirmButtonProps) {
  const { t } = useTranslation('common');
  const { userRole, onConfirmStrava } = useSessionActions();
  const { trigger, isPending } = useAsyncAction(onConfirmStrava);

  if (userRole !== 'athlete' || !hasStravaActivity || isStravaConfirmed === true) return null;

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={isPending}
      className={cn(
        'h-7 w-full border-orange-200 px-2 text-[10px] text-orange-600 hover:bg-orange-50 hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-orange-900 dark:text-orange-400 dark:hover:bg-orange-950 dark:hover:text-orange-300',
        className,
      )}
      onClick={(e) => {
        e.stopPropagation();
        void trigger(sessionId);
      }}
      title={t('strava.confirmAndShare')}
    >
      {isPending ? (
        <Loader2 className="h-2.5 w-2.5 shrink-0 animate-spin" />
      ) : (
        <Share2 className="h-2.5 w-2.5 shrink-0" />
      )}
      <span className="truncate">{t('strava.confirmAndShare')}</span>
    </Button>
  );
}
