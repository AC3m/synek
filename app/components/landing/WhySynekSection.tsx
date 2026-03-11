import { useTranslation } from 'react-i18next'
import { Zap, Eye, Users, MessageSquare } from 'lucide-react'
import { cn } from '~/lib/utils'

const CARD_ICONS = [Zap, Eye, Users, MessageSquare]

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
      className={cn('bg-surface-2/50 border-y border-border/40 px-4 py-20 sm:py-32', className)}
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-black italic uppercase tracking-tighter sm:text-5xl lg:text-6xl">
            {t('whySynek.title')}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg font-medium text-muted-foreground/80">
            {t('whySynek.subtitle')}
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(({ n, Icon, title, desc }) => (
            <div
              key={n}
              className="group flex flex-col items-center text-center rounded-xl border border-border/50 bg-surface-1 p-8 shadow-sm transition-all hover:shadow-md hover:border-primary/20"
            >
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/5 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mb-3 text-lg font-bold uppercase tracking-tight">{title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground/90">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
