import { useTranslation } from 'react-i18next';
import { LandingSection } from '../../primitives/LandingSection';
import { SectionHead } from '../../primitives/SectionHead';
import { PerspectivesVisual } from './PerspectivesVisual';
import { PerspectiveBullet } from './PerspectiveBullet';

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
        className="pointer-events-none absolute"
        style={{
          inset: '-20% -10% -20% -10%',
          zIndex: 0,
          background:
            'radial-gradient(50% 50% at 30% 50%, rgba(var(--grad-a-rgb), 0.28), transparent 70%), radial-gradient(45% 45% at 80% 40%, rgba(var(--grad-b-rgb), 0.22), transparent 70%)',
          filter: 'blur(60px)',
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
        <PerspectivesVisual />
        <div className="flex flex-col gap-4">
          {BULLET_KEYS.map((key) => (
            <PerspectiveBullet
              key={key}
              title={t(`perspectives.bullets.${key}.title` as never)}
              body={t(`perspectives.bullets.${key}.body` as never)}
            />
          ))}
        </div>
      </div>
    </LandingSection>
  );
}
