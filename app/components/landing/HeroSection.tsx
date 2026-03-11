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
        'flex min-h-screen flex-col items-center justify-center px-4 pt-24 pb-16 text-center bg-background',
        className
      )}
    >
      <div className="mx-auto max-w-4xl space-y-10">
        <div className="flex flex-col items-center gap-6">
          <Logo size="md" className="mb-2" />
          
          {/* Beta badge */}
          <span className="inline-block rounded-full border border-border bg-surface-2 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground/80">
            {t('hero.badge')}
          </span>
        </div>

        <h1 className="text-4xl font-black italic uppercase tracking-tight leading-[1.1] sm:text-5xl lg:text-6xl px-4">
          {t('hero.headline')}
        </h1>

        <p className="mx-auto max-w-2xl text-base text-muted-foreground sm:text-xl leading-relaxed">
          {t('hero.subheadline')}
        </p>

        <div className="flex flex-col items-center gap-4 pt-4">
          <Button asChild size="lg" className="h-12 px-8 text-sm uppercase tracking-wider font-bold">
            <Link to={`/${locale}/register`}>{t('beta.cta')}</Link>
          </Button>
          <button
            onClick={() => scrollTo('#log-in')}
            className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline px-4 py-1"
          >
            {t('hero.ctaLogIn')}
          </button>
        </div>

        <p className="text-sm text-muted-foreground pt-6">{t('hero.betaNote')}</p>
      </div>
    </section>
  )
}
