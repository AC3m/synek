import { useTranslation } from 'react-i18next';
import { cn } from '~/lib/utils';
import { StravaLogo } from '~/components/training/StravaLogo';

interface FeaturesSectionProps {
  className?: string;
}

export function FeaturesSection({ className }: FeaturesSectionProps) {
  const { t } = useTranslation('landing');

  const items = ([1, 2, 3, 4, 5, 6] as const).map((n) => ({
    n,
    ordinal: String(n).padStart(2, '0'),
    title: t(`features.item${n}.title` as never) as string,
    desc: t(`features.item${n}.desc` as never) as string,
  }));

  return (
    <section
      id="features"
      className={cn('border-t border-border/40 bg-surface-2/40 px-4 py-24 sm:py-32', className)}
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-20 max-w-2xl">
          <h2 className="text-3xl font-black tracking-tighter uppercase italic sm:text-5xl lg:text-6xl">
            {t('features.title')}
          </h2>
          <p className="mt-5 text-lg font-medium text-muted-foreground/80">
            {t('features.subtitle')}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3">
          {items.map(({ n, ordinal, title, desc }) => (
            <div key={n} className="border-t border-border/60 py-10 pr-12">
              <span className="font-mono text-xs font-bold tracking-widest text-muted-foreground/35 uppercase tabular-nums">
                {ordinal}
              </span>
              <h3 className="mt-4 text-base leading-snug font-bold tracking-tight uppercase">
                {n === 5 ? (
                  <div className="space-y-1.5">
                    <StravaLogo />
                    <span
                      style={{ color: '#FC5200' }}
                      className="block text-[10px] font-black italic"
                    >
                      {t('features.item5.approvalBadge')}
                    </span>
                  </div>
                ) : (
                  title
                )}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground/80">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
