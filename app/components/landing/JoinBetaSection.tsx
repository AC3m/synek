import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Button } from '~/components/ui/button'
import { cn } from '~/lib/utils'

interface JoinBetaSectionProps {
  className?: string
}

export function JoinBetaSection({ className }: JoinBetaSectionProps) {
  const { t } = useTranslation('landing')

  return (
    <section id="join-beta" className={cn('bg-muted/40 px-4 py-24', className)}>
      <div className="mx-auto max-w-md text-center">
        <span className="mb-3 inline-block rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          {t('beta.badge')}
        </span>
        <h2 className="text-3xl font-bold tracking-tight">{t('beta.title')}</h2>
        <p className="mt-2 text-muted-foreground">{t('beta.subtitle')}</p>
        <div className="mt-8">
          <Button asChild size="lg">
            <Link to="/register">{t('beta.cta')}</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
