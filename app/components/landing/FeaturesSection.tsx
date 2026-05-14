import { useTranslation } from 'react-i18next';
import { Activity, Calendar, Compass, Copy, Users } from 'lucide-react';
import { LandingSection } from './shared/LandingSection';
import { SectionHead } from './shared/SectionHead';
import { BentoCard } from './features/BentoCard';
import { WeekBoardMini } from './features/WeekBoardMini';
import { PrivacyStrip } from './features/PrivacyStrip';

const SPORT_TAG_KEYS = ['run', 'bike', 'swim', 'gym', 'mobility'] as const;

export function FeaturesSection() {
  const { t } = useTranslation('landing');

  return (
    <LandingSection id="features">
      <SectionHead
        eyebrow={t('features.eyebrow')}
        heading={t('features.h2')}
        lede={t('features.lede')}
      />

      <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-6">
        <BentoCard
          icon={<Calendar size={16} aria-hidden="true" />}
          title={t('features.week.title')}
          body={t('features.week.body')}
          span={4}
          rows={2}
          spotlight={<WeekBoardMini />}
        />

        <BentoCard
          icon={<Activity size={16} aria-hidden="true" />}
          title={t('features.sport.title')}
          body={t('features.sport.body')}
          span={2}
          footer={
            <div className="flex flex-wrap gap-1.5">
              {SPORT_TAG_KEYS.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10.5px] opacity-80"
                >
                  {t(`features.sportTags.${tag}` as never)}
                </span>
              ))}
            </div>
          }
        />

        <BentoCard
          icon={<Users size={16} aria-hidden="true" />}
          title={t('features.dual.title')}
          body={t('features.dual.body')}
          span={2}
          footer={
            <div className="flex items-center gap-2">
              <span
                className="h-1.5 flex-1 rounded-full opacity-80"
                style={{ background: 'var(--grad)' }}
                aria-hidden="true"
              />
              <span className="landing-mono text-[10.5px] opacity-60">{t('features.synced')}</span>
            </div>
          }
        />

        <BentoCard
          icon={<Compass size={16} aria-hidden="true" />}
          title={t('features.self.title')}
          body={t('features.self.body')}
          span={3}
        />

        <BentoCard
          icon={<Copy size={16} aria-hidden="true" />}
          title={t('features.templates.title')}
          body={t('features.templates.body')}
          span={3}
        />

        <div className="md:col-span-6">
          <PrivacyStrip title={t('features.privacy.title')} body={t('features.privacy.body')} />
        </div>
      </div>
    </LandingSection>
  );
}
