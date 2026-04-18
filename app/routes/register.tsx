import { useState, useRef } from 'react';
import { useNavigate, Link, useParams } from 'react-router';
import { Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { useAuth } from '~/lib/context/AuthContext';
import { isMockMode } from '~/lib/supabase';
import { mockRegisterUser, mockLogin } from '~/lib/auth';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { cn } from '~/lib/utils';
import { LandingNav } from '~/components/landing/LandingNav';
import { registrationSchema } from '~/lib/schemas/auth';
import type { UserRole } from '~/lib/auth';

export function meta() {
  return [{ title: 'Register — Synek' }];
}

export default function RegisterPage() {
  const { t } = useTranslation('landing');
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { locale = 'pl' } = useParams<{ locale: string }>();

  const [role, setRole] = useState<UserRole | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [cfToken, setCfToken] = useState('');
  const turnstileRef = useRef<TurnstileInstance>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (honeypot) return;

    if (!role) {
      setError(t('beta.selectRole'));
      return;
    }

    const result = registrationSchema.safeParse({
      name: name.trim(),
      email: email.trim(),
      password,
      role,
      cfToken,
    });
    if (!result.success) {
      const errs: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = String(issue.path[0]);
        errs[field] = issue.message;
      }
      setFieldErrors(errs);
      return;
    }

    setFieldErrors({});
    setError(null);
    setIsPending(true);

    try {
      if (isMockMode) {
        const registered = mockRegisterUser(
          result.data.email,
          result.data.password,
          result.data.name,
          role,
        );
        await mockLogin(registered.email, result.data.password);
        // Mock mode: skip email confirmation, navigate directly
        navigate(`/${locale}/${role}`, { replace: true });
        return;
      }

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/register-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          name: result.data.name,
          email: result.data.email,
          password: result.data.password,
          role,
          locale,
          website: honeypot,
          cfToken,
        }),
      });
      const payload = (await res.json()) as { success?: boolean; status?: string; error?: string };

      if (!res.ok) {
        const apiError = payload.error;

        if (apiError === 'email_taken') {
          setFieldErrors({ email: t('beta.emailAlreadyRegistered') });
        } else if (apiError === 'invalid_email') {
          setFieldErrors({ email: t('beta.invalidEmail') });
        } else if (apiError === 'coach_limit_reached' || apiError === 'athlete_limit_reached') {
          setError(t('beta.registrationLimitReached'));
        } else if (apiError === 'turnstile_failed') {
          setError(t('errors.turnstileFailed', { ns: 'common' }));
          setCfToken('');
          turnstileRef.current?.reset();
        } else if (apiError === 'rate_limited') {
          setError(t('errors.rateLimited', { ns: 'common' }));
        } else if (apiError === 'weak_password') {
          setError(t('errors.weakPassword', { ns: 'common' }));
        } else {
          throw new Error(apiError ?? 'internal_error');
        }

        setIsPending(false);
        return;
      }

      // Both fresh registration and confirmation_resent lead to the confirm-email screen
      navigate(`/${locale}/confirm-email`, { state: { email: result.data.email } });
    } catch {
      setError(t('beta.registrationError'));
      setIsPending(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <LandingNav />
      <main className="flex min-h-screen items-center justify-center px-4 pt-14">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <span className="mb-3 inline-block rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              {t('beta.badge')}
            </span>
            <h1 className="text-2xl font-bold tracking-tight">{t('beta.title')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t('beta.subtitle')}</p>
          </div>

          <form
            onSubmit={handleSubmit}
            noValidate
            className="space-y-5 rounded-xl border bg-background p-6 shadow-sm sm:p-8"
          >
            {/* Beta note */}
            <p className="rounded-lg bg-primary/5 p-3 text-sm text-muted-foreground">
              {t('beta.betaNote')}
            </p>

            {/* Role picker */}
            <div className="space-y-2">
              <p className="text-sm font-medium">{t('beta.roleLabel')}</p>
              <div className="grid grid-cols-2 gap-2">
                {(['coach', 'athlete'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={cn(
                      'rounded-lg border px-4 py-3 text-sm font-medium transition-colors',
                      role === r
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background hover:bg-muted',
                    )}
                  >
                    {t(r === 'coach' ? 'beta.roleCoach' : 'beta.roleAthlete')}
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div className="space-y-1">
              <label htmlFor="reg-name" className="text-sm font-medium">
                {t('beta.name')}
              </label>
              <Input
                id="reg-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
              />
              {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label htmlFor="reg-email" className="text-sm font-medium">
                {t('beta.email')}
              </label>
              <Input
                id="reg-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
              {fieldErrors.email && <p className="text-xs text-destructive">{fieldErrors.email}</p>}
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label htmlFor="reg-password" className="text-sm font-medium">
                {t('beta.password')}
              </label>
              <div className="relative">
                <Input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">{t('beta.passwordHint')}</p>
              {fieldErrors.password && (
                <p className="text-xs text-destructive">{fieldErrors.password}</p>
              )}
            </div>

            {/* Honeypot */}
            <input
              name="website"
              tabIndex={-1}
              aria-hidden="true"
              className="sr-only"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />

            {/* Turnstile — invisible bot check; fires onSuccess once validated */}
            <Turnstile
              ref={turnstileRef}
              siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY ?? ''}
              onSuccess={setCfToken}
              onError={() => setError(t('errors.turnstileFailed', { ns: 'common' }))}
              onExpire={() => setCfToken('')}
            />

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={isPending || !role || !cfToken}>
              {isPending ? '…' : t('beta.submit')}
            </Button>
            {!cfToken && !error && (
              <p className="text-center text-xs text-muted-foreground">
                {t('errors.turnstileVerifying', { ns: 'common' })}
              </p>
            )}

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
              onClick={async () => {
                try {
                  await loginWithGoogle();
                } catch {
                  // error handled by Google OAuth redirect
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
              {t('beta.continueWithGoogle')}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              {t('beta.consent.prefix')}{' '}
              <Link
                to={`/${locale}/terms`}
                className="underline hover:text-foreground"
                target="_blank"
              >
                {t('beta.consent.terms')}
              </Link>{' '}
              {t('beta.consent.and')}{' '}
              <Link
                to={`/${locale}/privacy-policy`}
                className="underline hover:text-foreground"
                target="_blank"
              >
                {t('beta.consent.privacy')}
              </Link>
              .
            </p>

            <p className="text-center text-sm text-muted-foreground">
              {t('beta.alreadyHaveAccount')}{' '}
              <Link
                to={`/${locale}/login`}
                className="font-medium text-primary underline underline-offset-4 hover:text-primary/80"
              >
                {t('beta.alreadyHaveAccountCta')}
              </Link>
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
