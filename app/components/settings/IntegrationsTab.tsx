import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import { useAuth } from '~/lib/context/AuthContext';
import {
  useStravaConnectionStatus,
  useStravaDisconnect,
  useStravaSync,
} from '~/lib/hooks/useStravaConnection';
import { Button } from '~/components/ui/button';
import { Separator } from '~/components/ui/separator';
import { cn } from '~/lib/utils';
import {
  mondayToWeekId,
  getPrevWeekId,
  getNextWeekId,
  weekIdToMonday,
  getWeekDateRange,
} from '~/lib/utils/date';

const STRAVA_ORANGE = '#FC4C02';

interface IntegrationsTabProps {
  onConnectStrava: () => void;
  currentWeekStart?: string;
  className?: string;
}

export function IntegrationsTab({ onConnectStrava, currentWeekStart, className }: IntegrationsTabProps) {
  const { t } = useTranslation('common');
  const { user } = useAuth();

  const [selectedWeekStart, setSelectedWeekStart] = useState(currentWeekStart ?? '');

  const { data: status, isLoading } = useStravaConnectionStatus(user?.id ?? '');
  const disconnect = useStravaDisconnect();
  const sync = useStravaSync();

  function handleDisconnect() {
    if (!user) return;
    if (!window.confirm(t('strava.disconnectConfirm'))) return;
    disconnect.mutate(user.id);
  }

  function handleSync() {
    if (!user || !selectedWeekStart) return;
    sync.mutate({ userId: user.id, weekStart: selectedWeekStart });
  }

  function handlePrevWeek() {
    setSelectedWeekStart(weekIdToMonday(getPrevWeekId(mondayToWeekId(selectedWeekStart))));
  }

  function handleNextWeek() {
    setSelectedWeekStart(weekIdToMonday(getNextWeekId(mondayToWeekId(selectedWeekStart))));
  }

  if (isLoading) {
    return <div className={cn('text-sm text-muted-foreground', className)}>{t('strava.syncing')}</div>;
  }

  return (
    <div className={cn('space-y-6', className)}>
      <div className="space-y-4">
        {/* Strava logo row */}
        <div className="flex items-center gap-3">
          <svg viewBox="0 0 40 40" className="h-8 w-8" aria-hidden>
            <rect width="40" height="40" rx="6" fill={STRAVA_ORANGE} />
            <path d="M17 28l-5-10h4l1 2h4l1-2h4l-5 10zm4-4l-2-4h4l-2 4z" fill="white" />
          </svg>
          <span className="font-semibold">Strava</span>
        </div>

        {status?.connected ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t('strava.connectedAs', { name: status.stravaAthleteName })}
            </p>
            {status.connectedAt && (
              <p className="text-xs text-muted-foreground">
                {t('strava.connectedSince', {
                  date: format(parseISO(status.connectedAt), 'PP'),
                })}
              </p>
            )}
            {status.lastSyncedAt && (
              <p className="text-xs text-muted-foreground">
                {t('strava.lastSynced', {
                  time: format(parseISO(status.lastSyncedAt), 'PPp'),
                })}
              </p>
            )}
            {currentWeekStart && selectedWeekStart && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handlePrevWeek} aria-label="Previous week">
                  {'<'}
                </Button>
                <span className="text-sm tabular-nums">
                  {getWeekDateRange(mondayToWeekId(selectedWeekStart)).formatted}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextWeek}
                  disabled={selectedWeekStart >= currentWeekStart}
                  aria-label="Next week"
                >
                  {'>'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSync}
                  disabled={sync.isPending}
                >
                  {sync.isPending ? t('strava.syncing') : t('strava.syncNow')}
                </Button>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDisconnect}
              disabled={disconnect.isPending}
              className="text-destructive hover:text-destructive"
            >
              {t('strava.disconnect')}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t('strava.description')}</p>
            <button onClick={onConnectStrava} className="p-0 border-0 bg-transparent hover:opacity-90 transition-opacity">
              <img src="/images/strava/btn_strava_connectwith_orange.svg" alt="Connect with Strava" height="48" />
            </button>
          </div>
        )}
      </div>

      <Separator />
    </div>
  );
}
