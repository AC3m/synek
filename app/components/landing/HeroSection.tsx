import { useTranslation } from 'react-i18next';
import { Check, Lock, RefreshCcw } from 'lucide-react';
import { useParams } from 'react-router';
import { GradText } from './shared/GradText';
import { CtaButtonPair } from './shared/CtaButtonPair';
import { HeroBetaPill } from './hero/HeroBetaPill';
import { HeroBackground, type HeroBackgroundKind } from './hero/HeroBackground';
import { useIsCompactViewport } from './hero/useIsCompactViewport';
import { WeekGridMock } from './mock/WeekGridMock';
import { MobileWeekViewMock } from './mock/MobileWeekViewMock';
import { cn } from '~/lib/utils';

interface HeroSectionProps {
  background?: HeroBackgroundKind;
  className?: string;
}

export function HeroSection({ background = 'route', className }: HeroSectionProps) {
  const { t } = useTranslation('landing');
  const isCompact = useIsCompactViewport();
  const { locale = 'pl' } = useParams<{ locale: string }>();

  const meta = (
    <ul
      data-testid="hero-meta"
      className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12.5px] opacity-70"
    >
      <li className="inline-flex items-center gap-1.5">
        <Check size={14} aria-hidden="true" />
        {t('hero.meta1')}
      </li>
      <li className="inline-flex items-center gap-1.5">
        <Lock size={14} aria-hidden="true" />
        {t('hero.meta2')}
      </li>
      <li className="inline-flex items-center gap-1.5">
        <RefreshCcw size={14} aria-hidden="true" />
        {t('hero.meta3')}
      </li>
    </ul>
  );

  return (
    <section
      id="hero"
      className={cn(
        'relative flex min-h-dvh flex-col overflow-hidden',
        'pt-24 sm:pt-28',
        className,
      )}
    >
      <HeroBackground kind={background} />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center px-5 text-center sm:px-8">
        <HeroBetaPill>{t('hero.pill')}</HeroBetaPill>

        <h1 className="landing-display mt-6 text-[clamp(40px,7vw,64px)] leading-[1.05] tracking-tight text-balance">
          <span>{t('hero.h1a')}</span> <GradText>{t('hero.h1b')}</GradText>
        </h1>

        <p className="mt-4 max-w-xl text-base text-balance opacity-70 sm:text-lg">
          {t('hero.lede')}
        </p>

        <div className="mt-6">
          <CtaButtonPair
            primary={{ label: t('hero.coach'), to: `/${locale}/register` }}
            secondary={{ label: t('hero.athlete'), to: `/${locale}/register` }}
          />
        </div>

        {meta}

        <div className="relative mt-10 flex w-full flex-1 items-end justify-center pb-0">
          <div className="w-full max-w-5xl">
            {isCompact ? <MobileWeekViewMock /> : <WeekGridMock />}
          </div>
        </div>
      </div>
    </section>
  );
}
