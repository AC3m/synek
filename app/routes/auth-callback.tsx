import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams, useParams, Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { useAuth } from '~/lib/context/AuthContext';
import {
  verifyEmailToken,
  resendConfirmationEmail,
  hasActiveSession,
} from '~/lib/queries/auth-callbacks';
import { Button } from '~/components/ui/button';

type CardState = 'loading' | 'expired' | 'already-confirmed' | 'error' | 'oauth-timeout';

type StatusCardProps = {
  testId: string;
  title: string;
  body: string;
  children?: ReactNode;
  loginLabel: string;
  loginPath: string;
};

function StatusCard({ testId, title, body, children, loginLabel, loginPath }: StatusCardProps) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div
        className="w-full max-w-md space-y-4 rounded-xl border bg-background p-6 shadow-sm"
        data-testid={testId}
      >
        <h1 className="text-lg font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">{body}</p>
        {children}
        <Link to={loginPath} className="block text-sm text-primary hover:underline">
          {loginLabel}
        </Link>
      </div>
    </main>
  );
}

export default function AuthCallbackPage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { locale = 'pl' } = useParams<{ locale: string }>();
  const { user } = useAuth();

  const [card, setCard] = useState<CardState>('loading');
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const oauthTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tokenHash = searchParams.get('token_hash');
  const queryType = searchParams.get('type') as 'email' | 'signup' | 'recovery' | null;
  const loginPath = `/${locale}/login`;

  // Parse hash fragment once — Supabase uses it for errors and implicit-flow sessions
  const hashParams = (() => {
    const h = window.location.hash.substring(1);
    return h ? new URLSearchParams(h) : null;
  })();
  const hashType = hashParams?.get('type') as 'recovery' | null;

  // Effective type: query params (PKCE) take priority, then hash fragment (implicit)
  const type = queryType ?? hashType;
  const isRecovery = type === 'recovery';

  useEffect(() => {
    // Supabase puts errors in the hash fragment on verification failure
    if (hashParams) {
      const errorCode = hashParams.get('error_code');
      if (errorCode === 'otp_expired') {
        // Token consumed — check if the account was already confirmed
        // (e.g. mobile preview consumed the link before desktop opened it)
        hasActiveSession().then((active) => {
          setCard(active ? 'already-confirmed' : 'expired');
        });
        return;
      }
      if (hashParams.get('error')) {
        setCard('error');
        return;
      }
    }

    if (isRecovery) {
      if (tokenHash) {
        // PKCE: exchange token hash for session, then redirect to reset form
        verifyEmailToken(tokenHash, 'recovery')
          .then(() => {
            sessionStorage.setItem('auth_callback_type', 'recovery');
            navigate(`/${locale}/reset-password`, { replace: true });
          })
          .catch(() => {
            setCard('expired');
          });
      } else {
        // Implicit flow: session already in hash fragment
        sessionStorage.setItem('auth_callback_type', 'recovery');
        navigate(`/${locale}/reset-password`, { replace: true });
      }
      return;
    }

    if ((queryType === 'email' || queryType === 'signup') && tokenHash) {
      verifyEmailToken(tokenHash, queryType === 'signup' ? 'signup' : 'email')
        .then((data) => {
          const role = data?.user?.user_metadata?.role as string | undefined;
          const target = role === 'coach' ? `/${locale}/coach` : `/${locale}/athlete`;
          navigate(target, { replace: true });
        })
        .catch(async (err: { code?: string; message?: string } | Error) => {
          const code = (err as { code?: string }).code ?? '';
          if (code === 'otp_expired') {
            const active = await hasActiveSession();
            setCard(active ? 'already-confirmed' : 'expired');
          } else if (
            code === 'otp_disabled' ||
            (err as Error).message?.includes('already confirmed')
          ) {
            setCard('already-confirmed');
          } else {
            setCard('error');
          }
        });
      return;
    }

    // No params — OAuth callback. onAuthStateChange will fire when Google session arrives.
    oauthTimeoutRef.current = setTimeout(() => {
      setCard('oauth-timeout');
    }, 10_000);

    return () => {
      if (oauthTimeoutRef.current) clearTimeout(oauthTimeoutRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // When the user context arrives (OAuth session), navigate to the dashboard.
  // Skip if this is a recovery callback — the main effect handles navigation.
  useEffect(() => {
    if (!isRecovery && user && card === 'loading') {
      if (oauthTimeoutRef.current) clearTimeout(oauthTimeoutRef.current);
      const target = user.role ? `/${locale}/${user.role}` : `/${locale}/select-role`;
      navigate(target, { replace: true });
    }
  }, [user, card, isRecovery, locale, navigate]);

  async function handleResend(email?: string) {
    if (!email) return;
    setIsResending(true);
    try {
      await resendConfirmationEmail(email);
      setResendSuccess(true);
    } finally {
      setIsResending(false);
    }
  }

  if (card === 'expired') {
    return (
      <StatusCard
        testId="expired-link-card"
        title={t('auth.linkExpiredTitle')}
        body={t('auth.linkExpiredBody')}
        loginLabel={t('auth.backToLogin')}
        loginPath={loginPath}
      >
        {resendSuccess ? (
          <p className="text-sm text-green-600">{t('auth.resentConfirmation')}</p>
        ) : (
          <Button
            onClick={() => handleResend(searchParams.get('email') ?? undefined)}
            disabled={isResending}
          >
            {isResending ? '…' : t('auth.resendConfirmationEmail')}
          </Button>
        )}
      </StatusCard>
    );
  }

  if (card === 'already-confirmed') {
    return (
      <StatusCard
        testId="already-confirmed-card"
        title={t('auth.alreadyConfirmedTitle')}
        body={t('auth.alreadyConfirmedBody')}
        loginLabel={t('auth.signIn')}
        loginPath={loginPath}
      />
    );
  }

  if (card === 'error') {
    return (
      <StatusCard
        testId="generic-error-card"
        title={t('errors.error')}
        body={t('errors.generic')}
        loginLabel={t('auth.backToLogin')}
        loginPath={loginPath}
      />
    );
  }

  if (card === 'oauth-timeout') {
    return (
      <StatusCard
        testId="oauth-timeout-error-card"
        title={t('errors.error')}
        body={t('auth.oauthTimeoutBody')}
        loginLabel={t('auth.backToLogin')}
        loginPath={loginPath}
      />
    );
  }

  return (
    <main
      className="flex min-h-screen items-center justify-center px-4"
      data-testid="completing-signin-spinner"
    >
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </main>
  );
}
