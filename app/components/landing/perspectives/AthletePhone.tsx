import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';

export function AthletePhone() {
  const { t } = useTranslation('landing');
  return (
    <div
      data-testid="athlete-phone"
      className="relative mx-auto w-[220px] rounded-[28px] border border-white/10 bg-[var(--landing-bg)] p-3 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.8)]"
    >
      <div className="absolute top-2 left-1/2 h-1 w-12 -translate-x-1/2 rounded-full bg-white/30" />
      <div className="mt-4 overflow-hidden rounded-[20px] border border-white/10 bg-[var(--landing-bg-2)] p-3 text-[11px]">
        <div className="landing-mono text-[9.5px] tracking-[0.12em] uppercase opacity-60">
          {t('mock.athletePhone.today')}
        </div>
        <div className="mt-1 text-[14px] font-bold">{t('mock.athletePhone.sessionTitle')}</div>
        <div
          data-testid="athlete-phone-session"
          className="mt-3 flex flex-col gap-2 rounded-[12px] border border-white/10 bg-white/[0.03] p-2"
        >
          <div className="flex items-center justify-between">
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-semibold"
              style={{ background: 'rgba(74,222,128,.12)', color: '#4ade80' }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {t('mock.sport.run')}
            </span>
            <Check size={12} className="text-emerald-400" aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-1">
            <div className="landing-mono text-[9px] tracking-[0.1em] uppercase opacity-60">
              {t('mock.athletePhone.plan')}
            </div>
            <div className="font-semibold">{t('mock.athletePhone.planDetail')}</div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-[10px]">
            <div>
              <div className="landing-mono text-[8.5px] tracking-[0.1em] uppercase opacity-60">
                Dur
              </div>
              <div className="font-semibold">72m</div>
            </div>
            <div>
              <div className="landing-mono text-[8.5px] tracking-[0.1em] uppercase opacity-60">
                Pace
              </div>
              <div className="font-semibold">3:54/km</div>
            </div>
            <div>
              <div className="landing-mono text-[8.5px] tracking-[0.1em] uppercase opacity-60">
                HR
              </div>
              <div className="font-semibold">167</div>
            </div>
          </div>
        </div>
        <div className="landing-mono mt-2 text-[9px] tracking-[0.12em] uppercase opacity-50">
          {t('mock.athletePhone.tomorrow')}
        </div>
      </div>
    </div>
  );
}
