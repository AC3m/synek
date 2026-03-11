import { useTranslation } from 'react-i18next'
import { cn } from '~/lib/utils'
import { Button } from '~/components/ui/button'
import { Link, useParams } from 'react-router'
import { Logo } from '~/components/layout/Logo'

interface HeroSectionProps {
  className?: string
}

export function HeroSection({ className }: HeroSectionProps) {
  const { t } = useTranslation('landing')
  const { locale = 'pl' } = useParams<{ locale: string }>()

  function scrollTo(id: string) {
    document.querySelector(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section
      id="get-started"
      className={cn(
        'flex min-h-screen flex-col items-center justify-center px-4 pt-14 text-center bg-background',
        className
      )}
    >
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="flex flex-col items-center gap-6">
          <Logo size="lg" className="mb-2" />
          
          {/* Beta badge */}
          <span className="inline-block rounded-full border border-border bg-surface-2 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80">
            {t('hero.badge')}
          </span>
        </div>

        <h1 className="text-4xl font-black italic uppercase tracking-tighter leading-[0.9] sm:text-6xl lg:text-8xl">
          {t('hero.headline')}
        </h1>

        <p className="mx-auto max-w-2xl text-base text-muted-foreground sm:text-xl">
          {t('hero.subheadline')}
        </p>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button asChild size="lg">
            <Link to={`/${locale}/register`}>{t('beta.cta')}</Link>
          </Button>
          <button
            onClick={() => scrollTo('#log-in')}
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {t('hero.ctaLogIn')}
          </button>
        </div>

        <p className="text-sm text-muted-foreground">{t('hero.betaNote')}</p>
      </div>
    </section>
  )
}
