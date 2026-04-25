import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router';
import { LandingNav } from '~/components/landing/LandingNav';
import { Eye, EyeOff } from 'lucide-react';
import { Logo } from '~/components/layout/Logo';
import { useTranslation } from 'react-i18next';
import { useAuth } from '~/lib/context/AuthContext';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { isMockMode } from '~/lib/supabase';

export function meta() {
  return [{ title: 'Login — SYNEK' }];
}

export default function LoginPage() {
  const { login, loginWithGoogle, user } = useAuth();
  const navigate = useNavigate();
  const { locale = 'pl' } = useParams<{ locale: string }>();
  const { t } = useTranslation('common');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (user) {
      const target = user.role === 'coach' ? `/${locale}/coach` : `/${locale}/athlete`;
      navigate(target, { replace: true });
    }
  }, [user, navigate, locale]);

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      if (err instanceof Error && err.message === 'email_not_confirmed') {
        setError('email_not_confirmed');
      } else {
        setError(err instanceof Error ? err.message : t('auth.invalidCredentials'));
      }
      setIsPending(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <LandingNav />
      <main className="flex min-h-screen items-center justify-center px-4 pt-14">
        <div className="w-full max-w-sm space-y-8">
          {/* Logo */}
          <div className="flex flex-col items-center gap-2">
            <Logo size="lg" />
            <p className="text-sm text-muted-foreground">{t('auth.signInSubtitle')}</p>
          </div>

          <form onSubmit={handleLoginSubmit} noValidate className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm leading-none font-medium">
                {t('auth.email')}
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm leading-none font-medium">
                {t('auth.password')}
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                  aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error === 'email_not_confirmed' && (
              <div
                className="rounded-md border border-primary/20 bg-primary/5 p-3 text-sm"
                role="alert"
              >
                <p className="text-foreground">{t('auth.emailNotConfirmed')}</p>
                <Link
                  to={`/${locale}/confirm-email`}
                  className="mt-1 block font-medium text-primary hover:underline"
                >
                  {t('auth.resendConfirmationEmail')}
                </Link>
              </div>
            )}

            {error && error !== 'email_not_confirmed' && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? t('auth.signingIn') : t('auth.signIn')}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              <Link
                to={`/${locale}/forgot-password`}
                className="text-muted-foreground hover:text-foreground"
              >
                {t('auth.forgotPassword')}
              </Link>
            </p>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">or</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              data-testid="google-signin-btn"
              onClick={async () => {
                setGoogleError(null);
                try {
                  await loginWithGoogle();
                } catch (err) {
                  setGoogleError(
                    err instanceof Error && err.message === 'google_not_available_in_demo'
                      ? t('auth.googleNotAvailableInDemo')
                      : t('errors.generic'),
                  );
                }
              }}
            >
              <svg viewBox="0 0 24 24" className="mr-2 h-5 w-5" aria-hidden="true">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              {t('auth.continueWithGoogle')}
            </Button>

            {googleError && <p className="text-center text-sm text-destructive">{googleError}</p>}

            <p className="text-center text-sm text-muted-foreground">
              <Link to={`/${locale}/register`} className="underline hover:text-foreground">
                {t('auth.registerAccount')}
              </Link>
            </p>
          </form>

          {/* Mock mode hint */}
          {isMockMode && (
            <div className="space-y-1 rounded-md border border-muted bg-muted/40 p-4 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground">{t('auth.demoCredentials')}</p>
              <p>
                <span className="font-medium">Coach:</span> coach@synek.app / coach123
              </p>
              <p>
                <span className="font-medium">Alice (athlete):</span> alice@synek.app / alice123
              </p>
              <p>
                <span className="font-medium">Bob (athlete):</span> bob@synek.app / bob123
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
