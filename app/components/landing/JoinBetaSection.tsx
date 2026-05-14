import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { useParams } from 'react-router';
import { LandingSection } from './shared/LandingSection';
import { Eyebrow } from './shared/Eyebrow';
import { GradText } from './shared/GradText';
import { CtaButtonPair } from './shared/CtaButtonPair';

interface JoinBetaSectionProps {
  className?: string;
}

export function JoinBetaSection({ className }: JoinBetaSectionProps) {
  const { t } = useTranslation('landing');
  const { locale = 'pl' } = useParams<{ locale: string }>();

  return (
    <LandingSection id="join" maxWidth="5xl" className={className}>
      <div
        className="relative overflow-hidden rounded-3xl border border-white/10 px-8 py-16 text-center"
        style={{
          background:
            'linear-gradient(135deg, color-mix(in oklab, var(--landing-bg-2) 88%, var(--grad-b) 8%), var(--landing-bg-2))',
        }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-px opacity-40"
          style={{
            background:
              'radial-gradient(circle at 50% 0%, rgb(var(--grad-a-rgb) / 0.5), transparent 60%)',
          }}
        />
        <div className="relative flex flex-col items-center gap-5">
          <Eyebrow>{t('joinBeta.eyebrow')}</Eyebrow>
          <h2 className="landing-display text-[clamp(34px,5vw,52px)] leading-[1.05] text-balance">
            {t('joinBeta.h2a')} <GradText>{t('joinBeta.h2b')}</GradText>
          </h2>
          <p className="max-w-xl text-[15.5px] text-balance opacity-70">{t('joinBeta.lede')}</p>

          <div className="mt-2">
            <CtaButtonPair
              primary={{ label: t('joinBeta.coach'), to: `/${locale}/register` }}
              secondary={{ label: t('joinBeta.athlete'), to: `/${locale}/register` }}
            />
          </div>

          <ul className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[12.5px] opacity-70">
            {(['fp1', 'fp2', 'fp3'] as const).map((key, i) => (
              <li
                key={key}
                data-testid="fineprint-item"
                className="inline-flex items-center gap-1.5"
              >
                {i === 0 ? (
                  <Check size={13} aria-hidden="true" />
                ) : (
                  <span className="opacity-40">·</span>
                )}
                {t(`joinBeta.${key}` as never)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </LandingSection>
  );
}
