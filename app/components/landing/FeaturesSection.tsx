import { useTranslation } from 'react-i18next'
import { cn } from '~/lib/utils'
import { StravaLogo } from '~/components/training/StravaLogo'

interface FeaturesSectionProps {
  className?: string
}

function BrandedBullet() {
  return (
    <svg
      className="mt-1 h-4 w-4 shrink-0 text-primary"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M17 22.5L20.5 1.5H24.5L21 22.5H17Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function FeaturesSection({ className }: FeaturesSectionProps) {
  const { t } = useTranslation('landing')

  const items = ([1, 2, 3, 4, 5, 6] as const).map((n) => ({
    n,
    title: t(`features.item${n}.title` as never) as string,
    desc: t(`features.item${n}.desc` as never) as string,
  }))

  return (
    <section id="features" className={cn('px-4 py-24 sm:py-32', className)}>
      <div className="mx-auto max-w-6xl">
        <div className="mb-20 text-center">
          <h2 className="text-3xl font-black italic uppercase tracking-tighter sm:text-5xl lg:text-6xl">
            {t('features.title')}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg font-medium text-muted-foreground/80">
            {t('features.subtitle')}
          </p>
        </div>

        <div className="grid gap-x-12 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(({ n, title, desc }) => (
            <div key={n} className="flex gap-4">
              <BrandedBullet />
              <div>
                <h3 className="text-lg font-bold uppercase tracking-tight leading-tight">
                  {n === 5 ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center">
                        <StravaLogo />
                      </div>
                      <span style={{ color: '#FC5200' }} className="block text-[10px] font-black italic">
                        {t('features.item5.approvalBadge')}
                      </span>
                    </div>
                  ) : (
                    title
                  )}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground/90">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
