import { useTranslation } from 'react-i18next'
import { Calendar, Eye, User, MessageSquare } from 'lucide-react'
import { cn } from '~/lib/utils'

const CARD_ICONS = [Calendar, Eye, User, MessageSquare]

interface WhySynekSectionProps {
  className?: string
}

export function WhySynekSection({ className }: WhySynekSectionProps) {
  const { t } = useTranslation('landing')

  const cards = ([1, 2, 3, 4] as const).map((n) => ({
    n,
    Icon: CARD_ICONS[n - 1],
    title: t(`whySynek.card${n}.title` as never),
    desc: t(`whySynek.card${n}.desc` as never),
  }))

  return (
    <section
      id="why-synek"
      className={cn('bg-muted/40 px-4 py-16 sm:py-24', className)}
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {t('whySynek.title')}
          </h2>
          <p className="mt-3 text-lg text-muted-foreground">
            {t('whySynek.subtitle')}
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(({ n, Icon, title, desc }) => (
            <div
              key={n}
              className="rounded-xl border bg-background p-6 shadow-sm"
            >
              <Icon className="mb-4 h-8 w-8 text-primary" />
              <h3 className="mb-2 font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
