import { useTranslation } from 'react-i18next';
import { cn } from '~/lib/utils';

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;

const ATHLETES = [
  {
    name: 'Mateusz K.',
    pace: '3:54/km',
    cells: [
      { d: 1, k: 'run' },
      { d: 3, k: 'gym' },
      { d: 5, k: 'run' },
      { d: 6, k: 'long' },
    ],
  },
  {
    name: 'Sara H.',
    pace: '4:12/km',
    cells: [
      { d: 0, k: 'run' },
      { d: 2, k: 'tempo' },
      { d: 4, k: 'gym' },
      { d: 6, k: 'long' },
    ],
  },
  {
    name: 'Jan W.',
    pace: '3:42/km',
    cells: [
      { d: 1, k: 'tempo' },
      { d: 2, k: 'gym' },
      { d: 4, k: 'run' },
      { d: 6, k: 'long' },
    ],
  },
  {
    name: 'Eva L.',
    pace: '4:36/km',
    cells: [
      { d: 0, k: 'easy' },
      { d: 3, k: 'run' },
      { d: 5, k: 'gym' },
      { d: 6, k: 'long' },
    ],
  },
] as const;

const KIND_BG: Record<string, string> = {
  run: 'bg-emerald-400/15 border-emerald-400/35',
  long: 'bg-emerald-400/25 border-emerald-400/45',
  easy: 'bg-emerald-400/10 border-emerald-400/25',
  tempo: 'bg-orange-400/15 border-orange-400/35',
  gym: 'bg-orange-300/15 border-orange-300/35',
};

export function CoachBoard() {
  const { t } = useTranslation('landing');
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-white/10 bg-[color-mix(in_oklab,var(--landing-bg)_92%,white_4%)] shadow-[0_30px_70px_-30px_rgba(0,0,0,0.7)]">
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-2 text-[12px]">
        <span className="font-semibold">{t('mock.coachBoard.weekTitle')}</span>
        <span className="landing-mono text-[10.5px] opacity-60">
          {t('mock.coachBoard.athletesCount')}
        </span>
      </header>
      <div className="grid grid-cols-[140px_repeat(7,1fr)] gap-px bg-white/[0.05] text-[11px]">
        <div className="bg-[var(--landing-bg)] px-3 py-2 opacity-60">
          {t('mock.coachBoard.athleteHeader')}
        </div>
        {DAYS.map((d, i) => (
          <div
            key={i}
            data-testid="coach-day-header"
            className="landing-mono bg-[var(--landing-bg)] px-2 py-2 text-center tracking-[0.1em] uppercase opacity-60"
          >
            {d}
          </div>
        ))}

        {ATHLETES.map((athlete) => (
          <div key={athlete.name} className="contents" data-testid="coach-row">
            <div className="bg-[var(--landing-bg)] px-3 py-2">
              <div className="font-semibold">{athlete.name}</div>
              <div className="landing-mono text-[10px] opacity-60">{athlete.pace}</div>
            </div>
            {DAYS.map((_, i) => {
              const cell = athlete.cells.find((c) => c.d === i);
              return (
                <div key={i} className="relative bg-[var(--landing-bg)] p-1.5">
                  {cell ? (
                    <div className={cn('h-full min-h-[34px] rounded border', KIND_BG[cell.k])} />
                  ) : (
                    <div className="h-full min-h-[34px] rounded border border-dashed border-white/5" />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
