// PoC: Junction Garmin integration — remove after evaluation
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '~/lib/context/AuthContext';
import {
  useJunctionConnectionStatus,
  useJunctionConnect,
  useJunctionDisconnect,
} from '~/lib/hooks/useJunctionConnection';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { cn } from '~/lib/utils';
import { supabase } from '~/lib/supabase';

interface JunctionGarminSectionProps {
  className?: string;
}

export function JunctionGarminSection({ className }: JunctionGarminSectionProps) {
  const { t } = useTranslation('common');
  const { user } = useAuth();
  const [isOpening, setIsOpening] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);
  const pendingJunctionUserId = useRef<string | null>(null);
  const popupTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: connection } = useJunctionConnectionStatus(user?.id ?? '');
  const connect = useJunctionConnect();
  const disconnect = useJunctionDisconnect();

  const isConnected = connection?.status === 'active';

  function handlePopupClose() {
    if (popupTimerRef.current) {
      clearInterval(popupTimerRef.current);
      popupTimerRef.current = null;
    }
    if (user && pendingJunctionUserId.current) {
      connect.mutate(
        { appUserId: user.id, junctionUserId: pendingJunctionUserId.current },
        {
          onSettled: () => {
            pendingJunctionUserId.current = null;
          },
        },
      );
    } else {
      pendingJunctionUserId.current = null;
    }
    setIsOpening(false);
  }

  async function handleConnect() {
    if (!user) return;
    setIsOpening(true);
    setOpenError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('not_authenticated');

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/junction-create-user`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!res.ok) throw new Error('create_user_failed');

      const { linkWebUrl, junctionUserId } = (await res.json()) as {
        linkWebUrl: string;
        junctionUserId: string;
      };

      pendingJunctionUserId.current = junctionUserId;

      // Open Junction connect flow in a popup window.
      // Garmin SSO blocks iframe embedding (X-Frame-Options), so we can't use the SDK iframe.
      const popup = window.open(
        linkWebUrl,
        'junction-connect',
        'width=600,height=700,scrollbars=yes,resizable=yes',
      );

      if (!popup) {
        // Popup was blocked by the browser
        pendingJunctionUserId.current = null;
        setIsOpening(false);
        setOpenError(t('junction.errorConnect'));
        return;
      }

      // Poll until the popup is closed, then persist the connection
      popupTimerRef.current = setInterval(() => {
        if (popup.closed) {
          handlePopupClose();
        }
      }, 500);
    } catch {
      pendingJunctionUserId.current = null;
      setIsOpening(false);
      setOpenError(t('junction.errorConnect'));
    }
  }

  function handleDisconnect() {
    if (!user) return;
    if (!window.confirm(t('junction.disconnectConfirm'))) return;
    disconnect.mutate(
      { appUserId: user.id },
      {
        onError: () => {
          window.alert(t('junction.errorDisconnect'));
        },
      },
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-3">
        <svg viewBox="0 0 40 40" className="h-8 w-8" aria-hidden>
          <rect width="40" height="40" rx="6" fill="#007CC3" />
          <text
            x="20"
            y="26"
            textAnchor="middle"
            fill="white"
            fontSize="14"
            fontWeight="bold"
            fontFamily="sans-serif"
          >
            G
          </text>
        </svg>
        <span className="font-semibold">Garmin</span>
        {isConnected && <Badge variant="secondary">{t('junction.connectedBadge')}</Badge>}
      </div>

      {isConnected ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDisconnect}
          disabled={disconnect.isPending}
          className="text-destructive hover:text-destructive"
        >
          {t('junction.disconnectButton')}
        </Button>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{t('junction.description')}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleConnect}
            disabled={isOpening || connect.isPending}
          >
            {isOpening ? t('junction.connecting') : t('junction.connectButton')}
          </Button>
          {openError && <p className="text-xs text-destructive">{openError}</p>}
        </div>
      )}
    </div>
  );
}
