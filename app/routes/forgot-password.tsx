import { useState } from 'react';
import { useParams, Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { LandingNav } from '~/components/landing/LandingNav';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { requestPasswordReset } from '~/lib/queries/auth-callbacks';
import { forgotPasswordSchema } from '~/lib/schemas/auth';

export function meta() {
  return [{ title: 'Forgot Password — Synek' }];
}

export default function ForgotPasswordPage() {
  const { t } = useTranslation('common');
  const { locale = 'pl' } = useParams<{ locale: string }>();

  const [email, setEmail] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [googleOnly, setGoogleOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const result = forgotPasswordSchema.safeParse({ email: email.trim() });
    if (!result.success) return;

    setIsPending(true);
    setError(null);
    setGoogleOnly(false);

    try {
      await requestPasswordReset(result.data.email);
      setSuccess(true);
    } catch (err) {
      if (err instanceof Error && err.message === 'google_only_account') {
        setGoogleOnly(true);
      } else if (err instanceof Error && err.message === 'reset_rate_limited') {
        setError(t('errors.resetRateLimited'));
      } else {
        setError(t('errors.generic'));
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <LandingNav />
      <main className="flex min-h-screen items-center justify-center px-4 pt-14">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">{t('auth.forgotPasswordTitle')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t('auth.forgotPasswordBody')}</p>
          </div>

          {success ? (
            <p
              className="rounded-lg bg-green-50 p-4 text-sm text-green-700"
              data-testid="forgot-success"
            >
              {t('auth.resetLinkSent')}
            </p>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="forgot-email" className="text-sm font-medium">
                  {t('auth.email')}
                </label>
                <Input
                  id="forgot-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  data-testid="forgot-email-input"
                />
              </div>

              {googleOnly && (
                <p className="text-sm text-amber-700" data-testid="forgot-google-only">
                  {t('auth.googleOnlyAccount')}
                </p>
              )}

              {error && (
                <p className="text-sm text-destructive" role="alert" data-testid="forgot-error">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isPending}
                data-testid="forgot-submit-button"
              >
                {isPending ? '…' : t('auth.sendResetLink')}
              </Button>
            </form>
          )}

          <p className="text-center text-sm text-muted-foreground">
            <Link to={`/${locale}/login`} className="text-primary hover:underline">
              {t('auth.backToLogin')}
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
