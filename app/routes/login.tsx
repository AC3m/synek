import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Activity, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '~/lib/context/AuthContext';
import { isMockMode } from '~/lib/supabase';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';

export function meta() {
  return [{ title: 'Login — Synek' }];
}

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      await login(email.trim(), password);
      // After login, user state is set — the effect below will redirect
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.invalidCredentials'));
      setIsPending(false);
    }
  }

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
            {t('auth.signInSubtitle')}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="text-sm font-medium leading-none"
            >
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
            <label
              htmlFor="password"
              className="text-sm font-medium leading-none"
            >
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
        </form>

        {/* Mock mode hint */}
        {isMockMode && (
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
