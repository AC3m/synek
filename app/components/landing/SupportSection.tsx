import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, HelpCircle, Bug, Zap, UserRound } from 'lucide-react';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { useAuth } from '~/lib/context/AuthContext';
import { useSubmitSupport } from '~/lib/hooks/useSupport';
import { SupportSubmissionError } from '~/lib/queries/support';
import { SUPPORT_CATEGORIES, supportSchema, type SupportCategory } from '~/lib/schemas/support';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { cn } from '~/lib/utils';

const CATEGORY_ICONS: Record<SupportCategory, React.ElementType> = {
  general: HelpCircle,
  bug: Bug,
  strava: Zap,
  account: UserRound,
};

const MAX_MESSAGE = 5000;

interface SupportSectionProps {
  className?: string;
}

export function SupportSection({ className }: SupportSectionProps) {
  const { t } = useTranslation('landing');
  const { user } = useAuth();
  const { mutate, status, reset } = useSubmitSupport();
  const turnstileRef = useRef<TurnstileInstance>(null);

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [category, setCategory] = useState<SupportCategory>('general');
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [cfToken, setCfToken] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isSuccess = status === 'success';
  const isPending = status === 'pending';

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (honeypot) return;

    const result = supportSchema.safeParse({
      name: name.trim(),
      email: email.trim(),
      message: message.trim(),
      category,
      cfToken,
    });

    if (!result.success) {
      const errs: Record<string, string> = {};
      for (const issue of result.error.issues) {
        errs[String(issue.path[0])] = issue.message;
      }
      setFieldErrors(errs);
      return;
    }

    setFieldErrors({});
    setErrorMsg(null);

    mutate(
      { ...result.data, userId: user?.id ?? null, honeypot },
      {
        onSuccess: () => {
          setMessage('');
        },
        onError: (err) => {
          if (err instanceof SupportSubmissionError) {
            if (err.code === 'turnstile_failed') {
              setErrorMsg(t('errors.turnstileFailed', { ns: 'common' }));
              setCfToken('');
              turnstileRef.current?.reset();
            } else if (err.code === 'rate_limited') {
              setErrorMsg(t('errors.rateLimited', { ns: 'common' }));
            } else if (err.code === 'invalid_email') {
              setFieldErrors({ email: t('support.invalidEmail') });
            } else {
              setErrorMsg(t('support.submitError'));
            }
          } else {
            setErrorMsg(t('support.submitError'));
          }
        },
      },
    );
  }

  return (
    <section
      id="support"
      className={cn(
        'border-t border-border/40 bg-surface-2/50 px-4 pt-28 pb-24 sm:pt-36 sm:pb-32',
        className,
      )}
    >
      <div className="mx-auto max-w-md">
        {!isSuccess && (
          <div className="mb-12 text-center">
            <h1 className="text-3xl font-black tracking-tighter uppercase italic sm:text-5xl">
              {t('support.title')}
            </h1>
            <p className="mt-4 font-medium text-muted-foreground">{t('support.subtitle')}</p>
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/8 px-3 py-1 text-[10px] font-bold tracking-[0.2em] text-primary uppercase">
              {t('support.responseNote')}
            </p>
          </div>
        )}

        {isSuccess ? (
          <div className="flex flex-col items-center gap-5 rounded-xl border border-border/50 bg-surface-1 p-12 text-center shadow-sm">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10 text-green-600">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <p className="font-bold tracking-tight uppercase">{t('support.submitSuccess')}</p>
              <p className="text-xs text-muted-foreground">{t('support.submitSuccessSubtitle')}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 text-xs text-muted-foreground"
              onClick={() => {
                reset();
                setCfToken('');
                turnstileRef.current?.reset();
              }}
            >
              {t('support.submitAnother')}
            </Button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            noValidate
            aria-label="Support request form"
            className="space-y-5 rounded-xl border border-border/50 bg-surface-1 p-8 shadow-sm"
          >
            {/* Category */}
            <fieldset>
              <legend className="mb-3 block text-[10px] font-bold tracking-wider text-muted-foreground/80 uppercase">
                {t('support.categoryLabel')}
              </legend>
              <div className="grid grid-cols-2 gap-2">
                {SUPPORT_CATEGORIES.map((c) => {
                  const Icon = CATEGORY_ICONS[c];
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCategory(c)}
                      aria-pressed={category === c}
                      className={cn(
                        'flex items-center gap-2 rounded-md border px-3 py-2.5 text-xs font-semibold tracking-wide transition-colors',
                        category === c
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-background text-foreground hover:bg-muted',
                      )}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      {t(`support.category.${c}`)}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {/* Name */}
            <div className="space-y-2">
              <label
                htmlFor="support-name"
                className="block text-[10px] font-bold tracking-wider text-muted-foreground/80 uppercase"
              >
                {t('support.name')}
              </label>
              <Input
                id="support-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
                aria-required="true"
                className="h-11 bg-background/50 transition-colors focus:bg-background"
              />
              {fieldErrors.name && (
                <p className="text-xs font-medium text-destructive" role="alert">
                  {fieldErrors.name}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label
                htmlFor="support-email"
                className="block text-[10px] font-bold tracking-wider text-muted-foreground/80 uppercase"
              >
                {t('support.email')}
              </label>
              <Input
                id="support-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                aria-required="true"
                className="h-11 bg-background/50 transition-colors focus:bg-background"
              />
              {fieldErrors.email && (
                <p className="text-xs font-medium text-destructive" role="alert">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            {/* Message */}
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <label
                  htmlFor="support-message"
                  className="block text-[10px] font-bold tracking-wider text-muted-foreground/80 uppercase"
                >
                  {t('support.message')}
                </label>
                <span
                  className={cn(
                    'text-[10px] tabular-nums',
                    message.length > MAX_MESSAGE * 0.9
                      ? 'text-destructive'
                      : 'text-muted-foreground/40',
                  )}
                >
                  {message.length}/{MAX_MESSAGE}
                </span>
              </div>
              <textarea
                id="support-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('support.messagePlaceholder')}
                required
                aria-required="true"
                maxLength={MAX_MESSAGE}
                rows={6}
                className="w-full resize-none rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background transition-colors placeholder:text-muted-foreground/50 focus:bg-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              />
              {fieldErrors.message && (
                <p className="text-xs font-medium text-destructive" role="alert">
                  {fieldErrors.message}
                </p>
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

            <Turnstile
              ref={turnstileRef}
              siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY ?? ''}
              onSuccess={setCfToken}
              onError={() => setErrorMsg(t('errors.turnstileFailed', { ns: 'common' }))}
              onExpire={() => setCfToken('')}
            />

            {errorMsg && (
              <p className="text-xs font-medium text-destructive" role="alert" aria-live="polite">
                {errorMsg}
              </p>
            )}

            {!cfToken && !errorMsg && (
              <p className="text-center text-xs text-muted-foreground">
                {t('errors.turnstileVerifying', { ns: 'common' })}
              </p>
            )}

            <Button
              type="submit"
              className="h-12 w-full text-sm font-bold tracking-widest uppercase italic"
              disabled={isPending || !cfToken}
            >
              {isPending ? '…' : t('support.submit')}
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}
