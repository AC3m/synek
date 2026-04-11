import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams, useParams, Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '~/lib/context/AuthContext';
import { verifyEmailToken, resendConfirmationEmail } from '~/lib/queries/auth-callbacks';
import { Button } from '~/components/ui/button';

type CardState = 'loading' | 'expired' | 'already-confirmed' | 'error' | 'oauth-timeout';

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
  const type = searchParams.get('type') as 'email' | 'recovery' | null;

  useEffect(() => {
    if (type === 'recovery' && tokenHash) {
      // Password-reset callback — store intent, redirect to reset-password
      sessionStorage.setItem('auth_callback_type', 'recovery');
      navigate(`/${locale}/reset-password`, { replace: true });
      return;
    }

    if (type === 'email' && tokenHash) {
      verifyEmailToken(tokenHash, 'email')
        .then(() => {
          // On success, user context will update via onAuthStateChange
          const role = user?.role;
          const target = role === 'coach' ? `/${locale}/coach` : `/${locale}/athlete`;
          navigate(target, { replace: true });
        })
        .catch((err: { code?: string; message?: string } | Error) => {
          const code = (err as { code?: string }).code ?? '';
          if (code === 'otp_expired') {
            setCard('expired');
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
    // The needsRoleSelection guard in athlete/coach layout handles role-less Google users.
    // Start a 10-second timeout as a safety net.
    oauthTimeoutRef.current = setTimeout(() => {
      setCard('oauth-timeout');
    }, 10_000);

    return () => {
      if (oauthTimeoutRef.current) clearTimeout(oauthTimeoutRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // When the user context arrives (OAuth session), navigate to the dashboard.
  useEffect(() => {
    if (!type && user && card === 'loading') {
      if (oauthTimeoutRef.current) clearTimeout(oauthTimeoutRef.current);
      const target = user.role ? `/${locale}/${user.role}` : `/${locale}/select-role`;
      navigate(target, { replace: true });
    }
  }, [user, card, type, locale, navigate]);

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
      <main className="flex min-h-screen items-center justify-center px-4">
        <div
          className="w-full max-w-md space-y-4 rounded-xl border bg-background p-6 shadow-sm"
          data-testid="expired-link-card"
        >
          <h1 className="text-lg font-semibold">{t('auth.linkExpiredTitle')}</h1>
          <p className="text-sm text-muted-foreground">{t('auth.linkExpiredBody')}</p>
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
          <Link to={`/${locale}/login`} className="block text-sm text-primary hover:underline">
            {t('auth.backToLogin')}
          </Link>
        </div>
      </main>
    );
  }

  if (card === 'already-confirmed') {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div
          className="w-full max-w-md space-y-4 rounded-xl border bg-background p-6 shadow-sm"
          data-testid="already-confirmed-card"
        >
          <h1 className="text-lg font-semibold">{t('auth.alreadyConfirmedTitle')}</h1>
          <p className="text-sm text-muted-foreground">{t('auth.alreadyConfirmedBody')}</p>
          <Link to={`/${locale}/login`} className="block text-sm text-primary hover:underline">
            {t('auth.signIn')}
          </Link>
        </div>
      </main>
    );
  }

  if (card === 'error') {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div
          className="w-full max-w-md space-y-4 rounded-xl border bg-background p-6 shadow-sm"
          data-testid="generic-error-card"
        >
          <h1 className="text-lg font-semibold">{t('errors.error')}</h1>
          <p className="text-sm text-muted-foreground">{t('errors.generic')}</p>
          <Link to={`/${locale}/login`} className="block text-sm text-primary hover:underline">
            {t('auth.backToLogin')}
          </Link>
        </div>
      </main>
    );
  }

  if (card === 'oauth-timeout') {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div
          className="w-full max-w-md space-y-4 rounded-xl border bg-background p-6 shadow-sm"
          data-testid="oauth-timeout-error-card"
        >
          <h1 className="text-lg font-semibold">{t('errors.error')}</h1>
          <p className="text-sm text-muted-foreground">{t('auth.oauthTimeoutBody')}</p>
          <Link to={`/${locale}/login`} className="block text-sm text-primary hover:underline">
            {t('auth.backToLogin')}
          </Link>
        </div>
      </main>
    );
  }

  // Default: loading / completing sign-in spinner (OAuth case)
  return (
    <main
      className="flex min-h-screen items-center justify-center px-4"
      data-testid="completing-signin-spinner"
    >
      <p className="text-sm text-muted-foreground">{t('auth.completingSignIn')}</p>
    </main>
  );
}
