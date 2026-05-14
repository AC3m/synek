import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, HelpCircle, Bug, Zap, UserRound } from 'lucide-react';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { useAuth } from '~/lib/context/AuthContext';
import { useSubmitSupport } from '~/lib/hooks/useSupport';
import { SupportSubmissionError } from '~/lib/queries/support';
import { SUPPORT_CATEGORIES, supportSchema, type SupportCategory } from '~/lib/schemas/support';
import { GradientButton } from '~/components/landing/primitives/GradientButton';
import { LandingField } from '~/components/landing/primitives/LandingField';
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
        'border-t border-white/[0.06] px-5 pt-28 pb-24 sm:px-8 sm:pt-36 sm:pb-32',
        className,
      )}
    >
      <div className="mx-auto max-w-md">
        {!isSuccess && (
          <div className="mb-12 text-center">
            <h1 className="landing-display text-3xl sm:text-5xl">{t('support.title')}</h1>
            <p className="mt-4 text-[15px] opacity-70">{t('support.subtitle')}</p>
            <span className="landing-mono mt-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-1 text-[10px] tracking-[0.2em] text-emerald-400 uppercase">
              {t('support.responseNote')}
            </span>
          </div>
        )}

        {isSuccess ? (
          <div className="flex flex-col items-center gap-5 rounded-2xl border border-white/10 bg-white/[0.025] p-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold tracking-tight">{t('support.submitSuccess')}</p>
              <p className="text-[13px] opacity-60">{t('support.submitSuccessSubtitle')}</p>
            </div>
            <button
              type="button"
              className="mt-2 text-[12.5px] opacity-50 transition-opacity hover:opacity-80"
              onClick={() => {
                reset();
                setCfToken('');
                turnstileRef.current?.reset();
              }}
            >
              {t('support.submitAnother')}
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            noValidate
            aria-label="Support request form"
            className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.025] p-8"
          >
            {/* Category */}
            <fieldset>
              <legend className="landing-mono mb-3 block text-[10px] tracking-wider uppercase opacity-50">
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
                        'flex items-center gap-2 rounded-lg border px-3 py-2.5 text-[12.5px] font-medium transition-colors',
                        category === c
                          ? 'border-emerald-500/40 bg-emerald-500/[0.08] text-emerald-400'
                          : 'border-white/10 bg-white/[0.03] opacity-70 hover:opacity-100',
                      )}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      {t(`support.category.${c}`)}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <LandingField
              id="support-name"
              label={t('support.name')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
              error={fieldErrors.name}
            />

            <LandingField
              id="support-email"
              label={t('support.email')}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              error={fieldErrors.email}
            />

            <div className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between">
                <label htmlFor="support-message" className="text-[12.5px] opacity-70">
                  {t('support.message')}
                </label>
                <span
                  className={cn(
                    'text-[10px] tabular-nums',
                    message.length > MAX_MESSAGE * 0.9 ? 'text-destructive' : 'opacity-40',
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
                className="w-full resize-none rounded-lg border border-white/12 bg-white/[0.03] px-3 py-2.5 text-[14px] transition-colors outline-none placeholder:opacity-40 focus:border-emerald-400/40"
              />
              {fieldErrors.message && (
                <p className="text-[12px] text-destructive" role="alert">
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
              <p className="text-[12px] text-destructive" role="alert" aria-live="polite">
                {errorMsg}
              </p>
            )}

            {!cfToken && !errorMsg && (
              <p className="text-center text-[12px] opacity-50">
                {t('errors.turnstileVerifying', { ns: 'common' })}
              </p>
            )}

            <GradientButton
              type="submit"
              size="lg"
              className="w-full"
              disabled={isPending || !cfToken}
            >
              {isPending ? '…' : t('support.submit')}
            </GradientButton>
          </form>
        )}
      </div>
    </section>
  );
}
