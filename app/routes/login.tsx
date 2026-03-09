import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Activity, Eye, EyeOff } from 'lucide-react';
import { useTranslation, Trans } from 'react-i18next';
import { z } from 'zod';
import { useAuth } from '~/lib/context/AuthContext';
import { supabase, isMockMode } from '~/lib/supabase';
import { mockRegisterCoach, mockLogin } from '~/lib/auth';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';

export function meta() {
  return [{ title: 'Login — Synek' }];
}

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[0-9]/, 'Must contain a number'),
});

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation('common');

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Redirect when user becomes authenticated
  useEffect(() => {
    if (user) {
      const locale = localStorage.getItem('locale') ?? 'pl';
      const target = user.role === 'coach' ? `/${locale}/coach` : `/${locale}/athlete`;
      navigate(target, { replace: true });
    }
  }, [user, navigate]);

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.invalidCredentials'));
      setIsPending(false);
    }
  }

  async function handleRegisterSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Honeypot — silently reject bot submissions
    if (honeypot) return;

    const result = registerSchema.safeParse({ name: name.trim(), email: email.trim(), password });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Invalid input');
      return;
    }

    setError(null);
    setIsPending(true);
    try {
      if (isMockMode) {
        // Mock mode: registration limit intentionally not enforced in local dev
        const registered = mockRegisterCoach(result.data.email, result.data.password, result.data.name);
        // Sign in with the newly created mock user
        await mockLogin(registered.email, result.data.password);
        await login(registered.email, result.data.password);
      } else {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/register-coach`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({ name: result.data.name, email: result.data.email, password: result.data.password }),
          }
        );
        const payload = await res.json() as { success?: boolean; error?: string };

        if (!res.ok) {
          if (payload.error === 'coach_limit_reached') {
            setError(t('auth.coachLimitReached'));
            setIsPending(false);
            return;
          }
          throw new Error(payload.error ?? 'internal_error');
        }

        // Fresh session after account creation (prevents session fixation)
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: result.data.email,
          password: result.data.password,
        });
        if (signInError) throw signInError;
      }
    } catch {
      // Generic error — never reveal if email is already taken
      setError(t('auth.invalidCredentials'));
      setIsPending(false);
    }
  }

  const privacyNoticeUrl = import.meta.env.VITE_PRIVACY_NOTICE_URL ?? '/privacy';

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <Activity className="h-7 w-7 text-primary" />
            <span className="text-2xl font-bold">Synek</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {mode === 'register' ? t('auth.registerAsCoachSubtitle') : t('auth.signInSubtitle')}
          </p>
        </div>

        {mode === 'login' ? (
          /* ── Login Form ── */
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium leading-none">
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
              <label htmlFor="password" className="text-sm font-medium leading-none">
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

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? t('auth.signingIn') : t('auth.signIn')}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              <button
                type="button"
                className="underline hover:text-foreground"
                onClick={() => { setMode('register'); setError(null); }}
              >
                {t('auth.registerAsCoach')}
              </button>
            </p>
          </form>
        ) : (
          /* ── Register Form ── */
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            {/* Honeypot — invisible to real users */}
            <input
              name="website"
              tabIndex={-1}
              className="sr-only"
              aria-hidden="true"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />

            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium leading-none">
                {t('auth.fullName')}
              </label>
              <Input
                id="name"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Smith"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="reg-email" className="text-sm font-medium leading-none">
                {t('auth.email')}
              </label>
              <Input
                id="reg-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="reg-password" className="text-sm font-medium leading-none">
                {t('auth.password')}
              </label>
              <div className="relative">
                <Input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
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
              <p className="text-xs text-muted-foreground">{t('auth.passwordRequirements')}</p>
            </div>

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <p className="text-xs text-muted-foreground">
              <Trans
                i18nKey="auth.privacyNoticeAgree"
                ns="common"
                values={{ link: t('auth.privacyNotice') }}
                components={{
                  1: (
                    <a
                      href={privacyNoticeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-foreground"
                    >
                      {t('auth.privacyNotice')}
                    </a>
                  ),
                }}
              />
            </p>

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? t('auth.creatingAccount') : t('auth.createAccount')}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              {t('auth.alreadyHaveAccount')}{' '}
              <button
                type="button"
                className="underline hover:text-foreground"
                onClick={() => { setMode('login'); setError(null); }}
              >
                {t('auth.signInInstead')}
              </button>
            </p>
          </form>
        )}

        {/* Mock mode hint */}
        {isMockMode && mode === 'login' && (
          <div className="rounded-md border border-muted bg-muted/40 p-4 text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground">{t('auth.demoCredentials')}</p>
            <p>
              <span className="font-medium">Coach:</span>{' '}
              coach@synek.app / coach123
            </p>
            <p>
              <span className="font-medium">Alice (athlete):</span>{' '}
              alice@synek.app / alice123
            </p>
            <p>
              <span className="font-medium">Bob (athlete):</span>{' '}
              bob@synek.app / bob123
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
