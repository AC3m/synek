import { useTranslation } from 'react-i18next';
import { cn } from '~/lib/utils';
import { Button } from '~/components/ui/button';
import { Link, useParams } from 'react-router';

interface HeroSectionProps {
  className?: string;
}

export function HeroSection({ className }: HeroSectionProps) {
  const { t } = useTranslation('landing');
  const { locale = 'pl' } = useParams<{ locale: string }>();

  return (
    <section id="get-started" className={cn('relative min-h-screen overflow-hidden', className)}>
      <div className="absolute inset-0">
        <img
          src="/hero-split.png"
          alt="Athlete checking her watch on the track, coach reviewing Synek on screen"
          className="h-full w-full object-cover object-center"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/10" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-background to-transparent" />
        {/* Covers the AI watermark in the bottom-right corner of the source image */}
        <div className="absolute right-0 bottom-0 h-[12%] w-[7%] bg-gradient-to-tl from-[oklch(0.04_0_0)] to-transparent" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col justify-center px-4 pt-24 pb-28">
        <div className="mx-auto w-full max-w-6xl">
          <div className="max-w-lg space-y-8">
            <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-bold tracking-[0.2em] text-white uppercase backdrop-blur-sm">
              {t('hero.badge')}
            </span>

            <h1 className="text-5xl leading-[1.05] font-black tracking-tight text-white uppercase italic sm:text-6xl lg:text-7xl">
              {t('hero.headline')}
            </h1>

            <p className="max-w-sm text-base leading-relaxed text-white/70 sm:text-lg">
              {t('hero.subheadline')}
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                asChild
                size="lg"
                className="h-14 bg-white px-8 text-sm font-bold tracking-wider text-black uppercase hover:bg-white/90"
              >
                <Link to={`/${locale}/register`}>{t('beta.cta')}</Link>
              </Button>
              <Link
                to={`/${locale}/login`}
                className="flex h-14 items-center justify-center rounded-lg border border-white/25 bg-white/10 px-8 text-sm font-bold tracking-wider text-white uppercase backdrop-blur-sm transition-colors hover:border-white/40 hover:bg-white/20"
              >
                {t('hero.ctaLogIn')}
              </Link>
            </div>

            <p className="text-sm text-white/60">{t('hero.betaNote')}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
