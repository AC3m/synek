import { useTranslation } from 'react-i18next'
import { CheckCircle2 } from 'lucide-react'
import { cn } from '~/lib/utils'

interface FeaturesSectionProps {
  className?: string
}

export function FeaturesSection({ className }: FeaturesSectionProps) {
  const { t } = useTranslation('landing')

  const items = ([1, 2, 3, 4, 5] as const).map((n) => ({
    n,
    title: t(`features.item${n}.title` as never),
    desc: t(`features.item${n}.desc` as never),
  }))

  return (
    <section id="features" className={cn('px-4 py-24', className)}>
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {t('features.title')}
          </h2>
          <p className="mt-3 text-lg text-muted-foreground">
            {t('features.subtitle')}
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(({ n, title, desc }) => (
            <div key={n} className="flex gap-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
