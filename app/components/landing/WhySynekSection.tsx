import { useTranslation } from 'react-i18next';
import { cn } from '~/lib/utils';

interface WhySynekSectionProps {
  className?: string;
}

export function WhySynekSection({ className }: WhySynekSectionProps) {
  const { t } = useTranslation('landing');

  const cards = ([1, 2, 3, 4] as const).map((n) => ({
    n,
    ordinal: String(n).padStart(2, '0'),
    title: t(`whySynek.card${n}.title` as never),
    desc: t(`whySynek.card${n}.desc` as never),
  }));

  return (
    <section id="why-synek" className={cn('px-4 py-24 sm:py-32', className)}>
      <div className="mx-auto max-w-6xl">
        <div className="mb-20 max-w-2xl">
          <h2 className="text-3xl font-black tracking-tighter uppercase italic sm:text-5xl lg:text-6xl">
            {t('whySynek.title')}
          </h2>
          <p className="mt-5 text-lg font-medium text-muted-foreground/80">
            {t('whySynek.subtitle')}
          </p>
        </div>

        {/* Editorial grid — 1px gap lines act as dividers */}
        <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(({ n, ordinal, title, desc }) => (
            <div
              key={n}
              className="group flex flex-col gap-8 bg-background px-8 py-10 transition-colors hover:bg-surface-2/60"
            >
              <span className="font-mono text-5xl font-black text-foreground/8 tabular-nums transition-colors group-hover:text-foreground/14">
                {ordinal}
              </span>
              <div className="flex flex-col gap-2.5">
                <h3 className="text-sm font-bold tracking-widest uppercase">{title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground/80">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
