import { useTranslation } from 'react-i18next';

export function FragColumn() {
  const { t } = useTranslation('landing');
  const days = [
    { key: 'mon', label: t('mock.fragColumn.mon'), sessions: ['easy'] as const },
    { key: 'tue', label: t('mock.fragColumn.tue'), sessions: ['tempo', 'easy'] as const },
    { key: 'wed', label: t('mock.fragColumn.wed'), sessions: [] as const },
  ];

  return (
    <div
      className="absolute inset-x-[10%] inset-y-[6%] grid grid-cols-3 gap-3"
      style={{ transform: 'perspective(900px) rotateY(-6deg) rotateX(4deg)' }}
    >
      {days.map((d) => (
        <div
          key={d.key}
          data-testid="frag-column-day"
          className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-2.5"
        >
          <div className="landing-mono text-[10px] tracking-[0.1em] uppercase opacity-60">
            {d.label}
          </div>
          {d.sessions.map((kind, j) => (
            <div
              key={j}
              className="flex min-h-[64px] flex-col justify-between rounded-md border border-white/10 bg-white/[0.04] p-2 text-[11px]"
              style={{
                borderLeftColor: kind === 'tempo' ? '#fb923c' : '#4ade80',
                borderLeftWidth: 3,
              }}
            >
              <div className="font-semibold">
                {kind === 'tempo' ? t('mock.fragColumn.threshold') : t('mock.fragColumn.easy')}
              </div>
              <div className="landing-mono opacity-70">{kind === 'tempo' ? '12 km' : '8 km'}</div>
              <div className="landing-mono opacity-50">
                {kind === 'tempo' ? '3:32/km' : '5:00/km'}
              </div>
            </div>
          ))}
          {d.sessions.length === 0 && (
            <div className="landing-mono flex flex-1 items-center justify-center rounded-md border border-dashed border-white/10 text-[10px] tracking-[0.1em] uppercase opacity-50">
              {t('mock.fragColumn.rest')}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
