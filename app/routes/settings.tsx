import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams, useParams, Link } from 'react-router';
import { ArrowLeft, LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '~/lib/context/AuthContext';
import { useConnectStrava } from '~/lib/hooks/useStravaConnection';
import { queryKeys } from '~/lib/queries/keys';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Button } from '~/components/ui/button';
import { UserTab } from '~/components/settings/UserTab';
import { IntegrationsTab } from '~/components/settings/IntegrationsTab';
import { AthletesTab } from '~/components/settings/AthletesTab';
import { getCurrentWeekId, weekIdToMonday } from '~/lib/utils/date';

const STRAVA_CSRF_KEY = 'strava_oauth_state';
const STRAVA_POPUP_NAME = 'strava_oauth';

type CallbackState = 'connecting' | 'success' | 'error';

export default function SettingsPage() {
  const { t } = useTranslation('common');
  const { user, isLoading: authLoading, logout } = useAuth();
  const navigate = useNavigate();
  const { locale = 'pl' } = useParams<{ locale?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const qc = useQueryClient();

  const tab = searchParams.get('tab') ?? 'user';
  const connectStrava = useConnectStrava();
  const callbackHandled = useRef(false);

  // Detect if this page load is an OAuth callback (has code param)
  const isOAuthCallback = useRef(!!searchParams.get('code'));
  const [callbackState, setCallbackState] = useState<CallbackState | null>(
    isOAuthCallback.current ? 'connecting' : null
  );
  const [callbackError, setCallbackError] = useState<string | null>(null);

  // Redirect unauthenticated users (wait for auth to finish loading first)
  useEffect(() => {
    if (!authLoading && !user && !isOAuthCallback.current) {
      navigate(`/${locale}/login`, { replace: true });
    }
  }, [authLoading, user, navigate, locale]);

  // Listen for localStorage signal from the OAuth popup
  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key === 'strava_connected' && user) {
        localStorage.removeItem('strava_connected');
        qc.invalidateQueries({ queryKey: queryKeys.stravaConnection.byUser(user.id) });
      }
    }
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [user, qc]);

  // Handle Strava OAuth callback — runs in the popup when code+state land here
  useEffect(() => {
    if (callbackHandled.current) return;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    if (!code || !state || !user) return;

    callbackHandled.current = true;

    const stored = localStorage.getItem(STRAVA_CSRF_KEY);
    if (state !== stored) {
      setCallbackState('error');
      setCallbackError('OAuth state mismatch — please try again.');
      return;
    }

    localStorage.removeItem(STRAVA_CSRF_KEY);

    connectStrava.mutateAsync({ code, userId: user.id })
      .then(() => {
        localStorage.setItem('strava_connected', Date.now().toString());
        setCallbackState('success');
        window.close();
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Connection failed';
        setCallbackError(msg);
        setCallbackState('error');
      });
  }, [user]); // re-runs once user becomes available

  // Render a minimal overlay while processing the OAuth callback in the popup
  if (isOAuthCallback.current) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        {callbackState === 'connecting' && (
          <>
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
            <p className="text-sm text-muted-foreground">Connecting to Strava…</p>
          </>
        )}
        {callbackState === 'success' && (
          <>
            <p className="text-base font-medium text-green-600">Connected!</p>
            <p className="text-sm text-muted-foreground">You can close this window.</p>
          </>
        )}
        {callbackState === 'error' && (
          <>
            <p className="text-base font-medium text-destructive">Connection failed</p>
            {callbackError && <p className="text-sm text-muted-foreground">{callbackError}</p>}
            <p className="text-sm text-muted-foreground">You can close this window and try again.</p>
          </>
        )}
      </div>
    );
  }

  if (authLoading || !user) return null;

  function handleConnectStrava() {
    const state = crypto.randomUUID();
    localStorage.setItem(STRAVA_CSRF_KEY, state);

    const redirectUri = `${import.meta.env.VITE_APP_URL ?? window.location.origin}/${locale}/settings?tab=integrations`;
    const params = new URLSearchParams({
      client_id: import.meta.env.VITE_STRAVA_CLIENT_ID ?? '',
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'activity:read_all',
      state,
    });

    window.open(
      `https://www.strava.com/oauth/authorize?${params}`,
      STRAVA_POPUP_NAME,
      'width=600,height=700,left=400,top=100'
    );
  }

  const currentWeekStart = weekIdToMonday(getCurrentWeekId());

  const backHref = user.role === 'coach' ? `/${locale}/coach` : `/${locale}/athlete`;

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Link
          to={backHref}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('settings.back')}
        </Link>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-destructive"
          onClick={() => { logout(); navigate(`/${locale}/login`, { replace: true }); }}
        >
          <LogOut className="h-4 w-4 mr-1.5" />
          {t('auth.signOut')}
        </Button>
      </div>
      <h1 className="mb-6 text-2xl font-semibold">{t('settings.title')}</h1>

      <Tabs
        value={tab}
        onValueChange={(v) => setSearchParams({ tab: v }, { replace: true })}
      >
        <TabsList className="mb-6">
          <TabsTrigger value="user">{t('settings.tabs.user')}</TabsTrigger>
          {user?.role === 'athlete' && (
            <TabsTrigger value="integrations">{t('settings.tabs.integrations')}</TabsTrigger>
          )}
          {user?.role === 'coach' && (
            <TabsTrigger value="athletes">{t('settings.tabs.athletes')}</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="user">
          <UserTab />
        </TabsContent>

        {user?.role === 'athlete' && (
          <TabsContent value="integrations">
            <IntegrationsTab
              onConnectStrava={handleConnectStrava}
              currentWeekStart={currentWeekStart}
            />
          </TabsContent>
        )}

        {user?.role === 'coach' && (
          <TabsContent value="athletes">
            <AthletesTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
