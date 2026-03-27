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
    <section
      id="join-beta"
      className={cn('border-y border-border/40 bg-background px-4 py-24 sm:py-32', className)}
    >
      <div className="mx-auto max-w-2xl text-center">
        <span className="mb-6 inline-block rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-[10px] font-bold tracking-[0.2em] text-primary uppercase">
          {t('beta.badge')}
        </span>
        <h2 className="text-4xl font-black tracking-tighter uppercase italic sm:text-6xl">
          {t('beta.title')}
        </h2>
        <p className="mt-6 text-lg leading-relaxed font-medium text-muted-foreground/80">
          {t('beta.subtitle')}
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button
            asChild
            size="lg"
            className="h-14 px-10 text-base font-bold tracking-wider uppercase italic transition-transform hover:scale-105 active:scale-95"
          >
            <Link to={`/${locale}/register`}>{t('beta.cta')}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
