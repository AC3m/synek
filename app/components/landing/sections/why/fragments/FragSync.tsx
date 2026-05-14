import { useTranslation } from 'react-i18next';
import { Copy, ListChecks, Pencil } from 'lucide-react';

export function FragSync() {
  const { t } = useTranslation('landing');
  const rows = [
    { label: t('mock.fragSync.action1'), Icon: Copy },
    { label: t('mock.fragSync.action2'), Icon: Pencil },
    { label: t('mock.fragSync.action3'), Icon: ListChecks },
  ];
  return (
    <div
      data-testid="frag-sync"
      className="absolute inset-x-[8%] inset-y-[10%] flex flex-col gap-3 rounded-2xl border border-white/10 bg-[color-mix(in_oklab,var(--landing-bg-2)_90%,white_2%)] p-4 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.6)]"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[13px] font-semibold">{t('mock.fragSync.blockTitle')}</div>
          <div className="text-[11.5px] opacity-60">{t('mock.fragSync.blockSubtitle')}</div>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[10.5px] opacity-80">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: 'var(--grad-a)' }}
            aria-hidden="true"
          />
          {t('mock.fragSync.live')}
        </div>
      </div>
      <div className="grid gap-2">
        {rows.map(({ label, Icon }) => (
          <div
            key={label}
            className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[12.5px]"
          >
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-white/[0.05]">
              <Icon size={13} aria-hidden="true" />
            </span>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
