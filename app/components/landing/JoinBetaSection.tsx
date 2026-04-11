import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { Button } from '~/components/ui/button';
import { cn } from '~/lib/utils';

interface JoinBetaSectionProps {
  className?: string;
}

export function JoinBetaSection({ className }: JoinBetaSectionProps) {
  const { t } = useTranslation('landing');
  const { locale = 'pl' } = useParams<{ locale: string }>();

  return (
    <section id="join-beta" className={cn('bg-foreground px-4 py-24 sm:py-32', className)}>
      <div className="mx-auto max-w-2xl text-center">
        <span className="mb-8 inline-block rounded-full border border-background/20 bg-background/10 px-4 py-1.5 text-[10px] font-bold tracking-[0.2em] text-background uppercase">
          {t('beta.badge')}
        </span>
        <h2 className="text-4xl font-black tracking-tighter text-background uppercase italic sm:text-6xl">
          {t('beta.title')}
        </h2>
        <p className="mt-6 text-lg leading-relaxed font-medium text-background/55">
          {t('beta.subtitle')}
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button
            asChild
            size="lg"
            className="h-14 bg-background px-10 text-base font-bold tracking-wider text-foreground uppercase italic transition-transform hover:scale-[1.02] hover:bg-background/90 active:scale-95"
          >
            <Link to={`/${locale}/register`}>{t('beta.cta')}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
