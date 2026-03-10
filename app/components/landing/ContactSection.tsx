import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle2 } from 'lucide-react'
import { useAuth } from '~/lib/context/AuthContext'
import { useSubmitFeedback } from '~/lib/hooks/useFeedback'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { cn } from '~/lib/utils'

interface ContactSectionProps {
  className?: string
}

export function ContactSection({ className }: ContactSectionProps) {
  const { t } = useTranslation('landing')
  const { user } = useAuth()
  const { mutate, status } = useSubmitFeedback()

  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [message, setMessage] = useState('')
  const [honeypot, setHoneypot] = useState('')

  const isSuccess = status === 'success'
  const isError = status === 'error'
  const isPending = status === 'pending'

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (honeypot) return

    mutate(
      { name: name.trim(), email: email.trim(), message: message.trim(), userId: user?.id ?? null },
      {
        onSuccess: () => {
          setName(user?.name ?? '')
          setEmail(user?.email ?? '')
          setMessage('')
        },
      }
    )
  }

  return (
    <section id="contact" className={cn('bg-surface-2 px-4 py-16 sm:py-24', className)}>
      <div className="mx-auto max-w-md">
        {!isSuccess && (
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold tracking-tight">{t('contact.title')}</h2>
            <p className="mt-2 text-muted-foreground">{t('contact.subtitle')}</p>
            <p className="mt-1 text-sm font-medium text-primary">{t('contact.betaNote')}</p>
          </div>
        )}

        {isSuccess ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface-1 p-8 text-center">
            <CheckCircle2 className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">{t('contact.submitSuccess')}</p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-2xl bg-surface-1 p-6 sm:p-8"
          >
            <div className="space-y-1">
              <label htmlFor="contact-name" className="text-sm font-medium">
                {t('contact.name')}
              </label>
              <Input
                id="contact-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="contact-email" className="text-sm font-medium">
                {t('contact.email')}
              </label>
              <Input
                id="contact-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="contact-message" className="text-sm font-medium">
                {t('contact.message')}
              </label>
              <textarea
                id="contact-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('contact.messagePlaceholder')}
                required
                rows={5}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
              <p className="text-sm text-destructive">{t('contact.submitError')}</p>
            )}

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? '…' : t('contact.submit')}
            </Button>
          </form>
        )}
      </div>
    </section>
  )
}
