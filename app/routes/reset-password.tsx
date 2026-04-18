import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from 'lucide-react';
import { LandingNav } from '~/components/landing/LandingNav';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { useAuth } from '~/lib/context/AuthContext';
import { updatePassword } from '~/lib/queries/auth-callbacks';
import { resetPasswordSchema } from '~/lib/schemas/auth';

export function meta() {
  return [{ title: 'Reset Password — Synek' }];
}

export default function ResetPasswordPage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const { locale = 'pl' } = useParams<{ locale: string }>();
  const { user } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const result = resetPasswordSchema.safeParse({ password, confirmPassword });
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
      await updatePassword(result.data.password);
      const role = user?.role ?? 'athlete';
      navigate(`/${locale}/${role}`, { replace: true });
    } catch (err) {
      if (err instanceof Error && err.message === 'weak_password') {
        setError(t('errors.weakPassword'));
      } else if (err instanceof Error && err.message === 'same_password') {
        setError(t('errors.samePassword'));
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
            <h1 className="text-2xl font-bold tracking-tight">{t('auth.resetPasswordTitle')}</h1>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="reset-password" className="text-sm font-medium">
                {t('auth.password')}
              </label>
              <div className="relative">
                <Input
                  id="reset-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                  data-testid="reset-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-xs text-destructive" data-testid="reset-password-error">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="reset-confirm" className="text-sm font-medium">
                {t('auth.confirmPassword')}
              </label>
              <Input
                id="reset-confirm"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                data-testid="reset-confirm-input"
              />
              {fieldErrors.confirmPassword && (
                <p className="text-xs text-destructive" data-testid="reset-confirm-error">
                  {fieldErrors.confirmPassword}
                </p>
              )}
            </div>

            {error && (
              <p className="text-sm text-destructive" role="alert" data-testid="reset-error">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isPending}
              data-testid="reset-submit-button"
            >
              {isPending ? '…' : t('auth.resetPasswordSubmit')}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
