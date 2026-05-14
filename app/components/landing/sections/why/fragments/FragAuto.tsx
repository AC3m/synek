import { useTranslation } from 'react-i18next';
import { Check, RefreshCcw } from 'lucide-react';

export function FragAuto() {
  const { t } = useTranslation('landing');
  const rows: Array<[string, string, string]> = [
    [t('mock.fragAuto.row1Title'), '8.1 km', '5:14/km'],
    [t('mock.fragAuto.row2Title'), '12.0 km', '3:54/km'],
    [t('mock.fragAuto.row3Title'), '19.0 km', '5:00/km'],
  ];
  return (
    <div
      data-testid="frag-auto"
      className="absolute inset-x-[8%] inset-y-[12%] flex flex-col gap-3"
    >
      <div
        className="flex items-center gap-3 rounded-xl border p-4"
        style={{
          background:
            'linear-gradient(120deg, rgb(var(--grad-a-rgb) / 0.1), rgb(var(--grad-c-rgb) / 0.08))',
          borderColor: 'color-mix(in oklab, var(--grad-a) 24%, var(--landing-line))',
        }}
      >
        <span
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-white"
          style={{ background: 'var(--grad)' }}
        >
          <RefreshCcw size={14} aria-hidden="true" />
        </span>
        <div className="flex-1">
          <div className="text-[13px] font-semibold">{t('mock.fragAuto.title')}</div>
          <div className="text-[11.5px] opacity-60">{t('mock.fragAuto.subtitle')}</div>
        </div>
        <span className="landing-mono text-[10px] tracking-[0.1em] uppercase opacity-70">
          {t('mock.fragAuto.status')}
        </span>
      </div>

      {rows.map(([title, distance, pace]) => (
        <div
          key={title}
          className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2"
        >
          <span className="text-[12.5px]">{title}</span>
          <span className="landing-mono flex items-center gap-3 text-[11px] opacity-70">
            <span>{distance}</span>
            <span>{pace}</span>
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
              <Check size={10} aria-hidden="true" />
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}
