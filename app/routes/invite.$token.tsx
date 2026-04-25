import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { useTranslation, Trans } from 'react-i18next';
import { z } from 'zod';
import { useAuth } from '~/lib/context/AuthContext';
import { supabase } from '~/lib/supabase';
import { useInvitePreview } from '~/lib/hooks/useInvites';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';

export function meta() {
  return [{ title: 'Join SYNEK' }];
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

export default function InviteTokenPage() {
  const { token = '' } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation('common');

  const { data: preview, isLoading } = useInvitePreview(token);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  // Detect browser locale on mount
  useEffect(() => {
    const browserLocale = navigator.language.startsWith('en') ? 'en' : 'pl';
    i18n.changeLanguage(browserLocale);
  }, [i18n]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (honeypot) return;

    const result = registerSchema.safeParse({ name: name.trim(), email: email.trim(), password });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Invalid input');
      return;
    }

    setError(null);
    setIsPending(true);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
      const res = await fetch(`${supabaseUrl}/functions/v1/claim-invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          name: result.data.name,
          email: result.data.email,
          password: result.data.password,
        }),
      });

      const data = (await res.json()) as { success?: boolean; error?: string; reason?: string };

      if (!res.ok) {
        if (data.error === 'email_taken') {
          setError(t('auth.invalidCredentials'));
        } else if (data.error === 'invalid_token') {
          setError(t(`invite.invalid${capitalize(data.reason ?? 'NotFound')}` as never));
        } else {
          setError(t('errors.generic'));
        }
        setIsPending(false);
        return;
      }

      // Issue fresh session — prevents session fixation
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: result.data.email,
        password: result.data.password,
      });

      if (signInError) {
        setError(t('errors.generic'));
        setIsPending(false);
        return;
      }

      const locale = navigator.language.startsWith('en') ? 'en' : 'pl';
      navigate(`/${locale}/athlete`, { replace: true });
    } catch {
      setError(t('errors.generic'));
      setIsPending(false);
    }
  }

  // Already-authenticated guard
  if (user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm space-y-4 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
          <p className="text-sm">{t('invite.alreadySignedIn')}</p>
          <Button variant="outline" onClick={() => logout()}>
            {t('auth.signOut')}
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!preview?.valid) {
    const reasonKey = preview?.reason ?? 'not_found';
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm space-y-4 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-destructive" />
          <h1 className="text-lg font-semibold">{t('invite.invalidTitle')}</h1>
          <p className="text-sm text-muted-foreground">
            {t(`invite.invalid${capitalize(reasonKey)}` as never)}
          </p>
          <p className="text-xs text-muted-foreground">{t('invite.askNewInvite')}</p>
        </div>
      </div>
    );
  }

  const privacyNoticeUrl = import.meta.env.VITE_PRIVACY_NOTICE_URL ?? '/privacy';

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-bold">
            {t('invite.welcomeTitle', { coachName: preview.coachName })}
          </h1>
          <p className="text-sm text-muted-foreground">{t('invite.welcomeSubtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Honeypot */}
          <input
            name="website"
            tabIndex={-1}
            className="sr-only"
            aria-hidden="true"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />

          <div className="space-y-2">
            <label htmlFor="name" className="text-sm leading-none font-medium">
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
            {isPending ? t('invite.creatingAccount') : t('invite.createAccount')}
          </Button>
        </form>
      </div>
    </div>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}
