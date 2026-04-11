import { useState, useEffect, useRef } from 'react';
import { useLocation, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Mail } from 'lucide-react';
import { LandingNav } from '~/components/landing/LandingNav';
import { Button } from '~/components/ui/button';
import { resendConfirmationEmail } from '~/lib/queries/auth-callbacks';

export function meta() {
  return [{ title: 'Check your inbox — Synek' }];
}

export default function ConfirmEmailPage() {
  const { t } = useTranslation('landing');
  const { state } = useLocation() as { state: { email?: string } | null };
  const { locale = 'pl' } = useParams<{ locale: string }>();
  const email = state?.email ?? '';

  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const [rateLimitSeconds, setRateLimitSeconds] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startCooldown(seconds: number) {
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    setRateLimitSeconds(seconds);
    cooldownRef.current = setInterval(() => {
      setRateLimitSeconds((s) => {
        if (s <= 1) {
          clearInterval(cooldownRef.current!);
          cooldownRef.current = null;
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  useEffect(
    () => () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    },
    [],
  );

  async function handleResend() {
    setIsResending(true);
    setResendError(null);
    try {
      await resendConfirmationEmail(email);
      setResendSuccess(true);
    } catch (err) {
      if (err instanceof Error && err.message === 'rate_limited') {
        startCooldown(60);
      } else {
        setResendError(t('beta.resendError'));
      }
    } finally {
      setIsResending(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <LandingNav />
      <main className="flex min-h-screen items-center justify-center px-4 pt-14">
        <div className="w-full max-w-md space-y-6 rounded-xl border bg-background p-6 shadow-sm sm:p-8">
          <div className="flex flex-col items-center space-y-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-xl font-bold">{t('beta.confirmEmailTitle')}</h1>
            <p className="text-sm text-muted-foreground">
              {t('beta.confirmEmailBody', { email: email || '…' })}
            </p>
          </div>

          {resendSuccess ? (
            <p className="text-center text-sm text-green-600" data-testid="resend-success">
              {t('beta.resentConfirmation')}
            </p>
          ) : (
            <div className="space-y-2">
              <Button
                onClick={handleResend}
                disabled={isResending || !email || rateLimitSeconds > 0}
                variant="outline"
                className="w-full"
                data-testid="resend-button"
              >
                {isResending
                  ? '…'
                  : rateLimitSeconds > 0
                    ? t('beta.resendCooldown', { seconds: rateLimitSeconds })
                    : t('beta.resendConfirmation')}
              </Button>
              {rateLimitSeconds > 0 && (
                <p className="text-center text-sm text-amber-600" data-testid="resend-rate-limited">
                  {t('errors.rateLimited', { ns: 'common' })}
                </p>
              )}
              {resendError && (
                <p className="text-center text-sm text-destructive" data-testid="resend-error">
                  {resendError}
                </p>
              )}
            </div>
          )}

          <p className="text-center text-sm text-muted-foreground">
            <a href={`/${locale}/login`} className="text-primary hover:underline">
              {t('beta.backToLogin')}
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
