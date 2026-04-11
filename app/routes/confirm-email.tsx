import { useState } from 'react';
import { useLocation, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { LandingNav } from '~/components/landing/LandingNav';
import { Button } from '~/components/ui/button';
import { resendConfirmationEmail } from '~/lib/queries/auth-callbacks';

export default function ConfirmEmailPage() {
  const { t } = useTranslation('landing');
  const { state } = useLocation() as { state: { email?: string } | null };
  const { locale = 'pl' } = useParams<{ locale: string }>();
  const email = state?.email ?? '';

  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);

  async function handleResend() {
    setIsResending(true);
    setResendError(null);
    try {
      await resendConfirmationEmail(email);
      setResendSuccess(true);
    } catch (err) {
      if (err instanceof Error && err.message === 'rate_limited') {
        setIsRateLimited(true);
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
          <div className="space-y-2">
            <h1 className="text-xl font-bold">{t('beta.confirmEmailTitle')}</h1>
            <p className="text-sm text-muted-foreground">{t('beta.confirmEmailBody')}</p>
            {email && (
              <p className="text-sm font-medium" data-testid="confirm-email-address">
                {email}
              </p>
            )}
          </div>

          {resendSuccess ? (
            <p className="text-sm text-green-600" data-testid="resend-success">
              {t('beta.resentConfirmation')}
            </p>
          ) : (
            <div className="space-y-2">
              <Button
                onClick={handleResend}
                disabled={isResending || !email || isRateLimited}
                variant="outline"
                className="w-full"
                data-testid="resend-button"
              >
                {isResending ? '…' : t('beta.resendConfirmation')}
              </Button>
              {isRateLimited && (
                <p className="text-sm text-amber-600" data-testid="resend-rate-limited">
                  {t('errors.rateLimited', { ns: 'common' })}
                </p>
              )}
              {resendError && (
                <p className="text-sm text-destructive" data-testid="resend-error">
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
