import { useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { LandingSection } from './shared/LandingSection';
import { SectionHead } from './shared/SectionHead';
import { SegmentedToggle } from './shared/SegmentedToggle';
import { LandingField } from './shared/LandingField';
import { GradientButton } from './shared/GradientButton';

type Role = 'coach' | 'athlete' | 'other';

const ROLE_OPTIONS = [
  { value: 'coach' as const, label: '' },
  { value: 'athlete' as const, label: '' },
  { value: 'other' as const, label: '' },
];

export function LandingContactSection() {
  const { t } = useTranslation('landing');
  const [role, setRole] = useState<Role>('coach');
  const [sent, setSent] = useState(false);
  const nameId = useId();
  const emailId = useId();
  const msgId = useId();

  const localizedOptions = ROLE_OPTIONS.map((o) => ({
    ...o,
    label: t(`contactSection.roles.${o.value}` as never),
  }));

  const placeholderKey: Record<Role, string> = {
    coach: 'contactSection.msgPhCoach',
    athlete: 'contactSection.msgPhAth',
    other: 'contactSection.msgPhOther',
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <LandingSection id="contact">
      <div className="grid gap-12 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <SectionHead
            eyebrow={t('contactSection.eyebrow')}
            heading={t('contactSection.h2')}
            lede={t('contactSection.lede')}
          />
          <div className="mt-2 flex flex-col gap-2 text-[13.5px] opacity-70">
            <span className="landing-mono">hello@synek.app</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <SegmentedToggle
            options={localizedOptions}
            value={role}
            onChange={setRole}
            label={t('contactSection.roleLabel')}
            className="self-start"
          />

          <LandingField
            id={nameId}
            label={t('contactSection.name')}
            placeholder={t('contactSection.namePh')}
            required
          />

          <LandingField
            id={emailId}
            label={t('contactSection.email')}
            type="email"
            placeholder={t('contactSection.emailPh')}
            required
          />

          <LandingField
            id={msgId}
            label={t('contactSection.msg')}
            multiline
            placeholder={t(placeholderKey[role] as never)}
            required
          />

          <div className="flex items-center gap-4">
            <GradientButton type="submit" size="md">
              {t('contactSection.send')}
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
            </GradientButton>
            {sent ? (
              <span className="text-[13px] text-emerald-400">{t('contactSection.sent')}</span>
            ) : null}
          </div>
        </form>
      </div>
    </LandingSection>
  );
}
