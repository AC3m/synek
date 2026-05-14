import { useTranslation } from 'react-i18next';
import { LandingSection } from '../../primitives/LandingSection';
import { GradText } from '../../primitives/GradText';
import { SectionHead } from '../../primitives/SectionHead';
import { WhyRow } from './WhyRow';
import { FragAuto } from './fragments/FragAuto';
import { FragColumn } from './fragments/FragColumn';
import { FragSync } from './fragments/FragSync';
import { FragCoDesign } from './fragments/FragCoDesign';

const ROW_KEYS = ['stopLogging', 'oneView', 'fullControl', 'builtWith'] as const;
const ART = [<FragAuto />, <FragColumn />, <FragSync />, <FragCoDesign />] as const;

export function WhySection() {
  const { t } = useTranslation('landing');
  return (
    <LandingSection id="why">
      <SectionHead
        eyebrow={t('why.eyebrow')}
        heading={
          <>
            {t('why.h2a')}
            <br />
            <GradText>{t('why.h2b')}</GradText>
          </>
        }
        lede={t('why.lede')}
      />
      <div className="mt-8 divide-y divide-white/5">
        {ROW_KEYS.map((key, i) => (
          <WhyRow
            key={key}
            index={i}
            total={ROW_KEYS.length}
            title={t(`why.rows.${key}.title` as never)}
            body={t(`why.rows.${key}.body` as never)}
            art={ART[i]}
            flip={i % 2 === 1}
          />
        ))}
      </div>
    </LandingSection>
  );
}
