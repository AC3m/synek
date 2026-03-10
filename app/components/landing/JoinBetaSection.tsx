import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router'
import { Button } from '~/components/ui/button'
import { cn } from '~/lib/utils'

interface JoinBetaSectionProps {
  className?: string
}

export function JoinBetaSection({ className }: JoinBetaSectionProps) {
  const { t } = useTranslation('landing')
  const { locale = 'pl' } = useParams<{ locale: string }>()

  return (
    <section
      id="join-beta"
      className={cn('bg-background border-t border-b border-[color:var(--separator)] px-4 py-16 sm:py-24', className)}
    >
      <div className="mx-auto max-w-md text-center">
        <span className="mb-3 inline-block rounded-full border border-border bg-surface-2 px-3 py-1 text-xs text-muted-foreground">
          {t('beta.badge')}
        </span>
        <h2 className="text-3xl font-bold tracking-tight">{t('beta.title')}</h2>
        <p className="mt-2 text-muted-foreground">{t('beta.subtitle')}</p>
        <div className="mt-8">
          <Button asChild size="lg">
            <Link to={`/${locale}/register`}>{t('beta.cta')}</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
