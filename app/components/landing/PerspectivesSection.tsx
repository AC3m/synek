import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { LandingSection } from './shared/LandingSection';
import { SectionHead } from './shared/SectionHead';
import { CoachBoard } from './perspectives/CoachBoard';
import { AthletePhone } from './perspectives/AthletePhone';
import { SyncLine } from './perspectives/SyncLine';

const BULLET_KEYS = ['drag', 'notes', 'status', 'mobile'] as const;

export function PerspectivesSection() {
  const { t } = useTranslation('landing');
  return (
    <LandingSection
      id="perspectives"
      className="relative overflow-hidden"
      innerClassName="relative"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          background:
            'radial-gradient(60% 50% at 50% 30%, rgb(var(--grad-b-rgb) / 0.18), transparent)',
        }}
      />
      <SectionHead
        eyebrow={t('perspectives.eyebrow')}
        heading={
          <>
            {t('perspectives.h2a')}
            <br />
            {t('perspectives.h2b')}
          </>
        }
        lede={t('perspectives.lede')}
      />

      <div className="mt-12 grid items-center gap-10 lg:grid-cols-[1.4fr_1fr] lg:gap-12">
        <div className="relative">
          <CoachBoard />
          <SyncLine />
          <div className="absolute top-1/2 -right-10 hidden -translate-y-1/2 lg:block">
            <AthletePhone />
          </div>
        </div>
        <div className="flex flex-col gap-4">
          {BULLET_KEYS.map((key) => (
            <div
              key={key}
              data-testid="perspective-bullet"
              className="flex flex-col gap-1 border-t border-white/10 pt-4"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="inline-flex h-5 w-5 items-center justify-center rounded-sm text-white"
                  style={{ background: 'var(--grad)' }}
                  aria-hidden="true"
                >
                  <Check size={11} />
                </span>
                <span className="text-[15px] font-semibold">
                  {t(`perspectives.bullets.${key}.title` as never)}
                </span>
              </div>
              <p className="pl-[30px] text-[13.5px] leading-relaxed opacity-70">
                {t(`perspectives.bullets.${key}.body` as never)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </LandingSection>
  );
}
