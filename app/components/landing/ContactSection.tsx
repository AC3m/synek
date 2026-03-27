import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2 } from 'lucide-react';
import { useAuth } from '~/lib/context/AuthContext';
import { useSubmitFeedback } from '~/lib/hooks/useFeedback';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { cn } from '~/lib/utils';

interface ContactSectionProps {
  className?: string;
}

export function ContactSection({ className }: ContactSectionProps) {
  const { t } = useTranslation('landing');
  const { user } = useAuth();
  const { mutate, status } = useSubmitFeedback();

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState('');

  const isSuccess = status === 'success';
  const isError = status === 'error';
  const isPending = status === 'pending';

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (honeypot) return;

    mutate(
      { name: name.trim(), email: email.trim(), message: message.trim(), userId: user?.id ?? null },
      {
        onSuccess: () => {
          setName(user?.name ?? '');
          setEmail(user?.email ?? '');
          setMessage('');
        },
      },
    );
  }

  return (
    <section id="contact" className={cn('bg-surface-2/50 px-4 py-24 sm:py-32', className)}>
      <div className="mx-auto max-w-md">
        {!isSuccess && (
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-black tracking-tighter uppercase italic sm:text-5xl">
              {t('contact.title')}
            </h2>
            <p className="mt-4 font-medium text-muted-foreground">{t('contact.subtitle')}</p>
            <p className="mt-2 text-[10px] font-bold tracking-[0.2em] text-primary uppercase">
              {t('contact.betaNote')}
            </p>
          </div>
        )}

        {isSuccess ? (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-border/50 bg-surface-1 p-12 text-center shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10 text-green-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <p className="font-bold tracking-tight uppercase">{t('contact.submitSuccess')}</p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-5 rounded-xl border border-border/50 bg-surface-1 p-8 shadow-sm"
          >
            <div className="space-y-2">
              <label
                htmlFor="contact-name"
                className="text-[10px] font-bold tracking-wider text-muted-foreground/80 uppercase"
              >
                {t('contact.name')}
              </label>
              <Input
                id="contact-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
                className="h-11 bg-background/50 transition-colors focus:bg-background"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="contact-email"
                className="text-[10px] font-bold tracking-wider text-muted-foreground/80 uppercase"
              >
                {t('contact.email')}
              </label>
              <Input
                id="contact-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                className="h-11 bg-background/50 transition-colors focus:bg-background"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="contact-message"
                className="text-[10px] font-bold tracking-wider text-muted-foreground/80 uppercase"
              >
                {t('contact.message')}
              </label>
              <textarea
                id="contact-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('contact.messagePlaceholder')}
                required
                rows={5}
                className="w-full resize-none rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background transition-colors placeholder:text-muted-foreground/50 focus:bg-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              />
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

            {isError && (
              <p className="text-xs font-medium text-destructive">{t('contact.submitError')}</p>
            )}

            <Button
              type="submit"
              className="h-12 w-full text-sm font-bold tracking-widest uppercase italic"
              disabled={isPending}
            >
              {isPending ? '…' : t('contact.submit')}
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}
