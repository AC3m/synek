import { cn } from '~/lib/utils';

const FILLED = new Set([0, 2, 4, 6, 8, 9, 11, 13, 15, 17, 19, 20]);
const SESSION_KINDS = ['easy', 'tempo', 'long'] as const;
type SessionKind = (typeof SESSION_KINDS)[number];

const KIND_LABEL: Record<SessionKind, string> = {
  easy: 'Easy',
  tempo: 'Tempo',
  long: 'Long',
};
const KIND_NUM: Record<SessionKind, string> = {
  easy: '8k',
  tempo: '12k',
  long: '22k',
};
const KIND_STRIPE: Record<SessionKind, string> = {
  easy: '#4ade80',
  tempo: '#fb923c',
  long: '#a3e635',
};

function kindFor(i: number): SessionKind {
  if (i % 5 === 2) return 'tempo';
  if (i % 7 === 3) return 'long';
  return 'easy';
}

export function WeekBoardMini() {
  return (
    <div className="relative h-full min-h-[260px]">
      <div
        className="absolute inset-x-6 inset-y-6 grid grid-cols-7 gap-1.5"
        style={{ transform: 'perspective(900px) rotateX(8deg) rotateY(-4deg)' }}
      >
        {Array.from({ length: 21 }).map((_, i) => {
          const filled = FILLED.has(i);
          if (!filled) {
            return (
              <div
                key={i}
                data-testid="mini-cell"
                data-filled="false"
                className="min-h-[54px] rounded border border-white/10 bg-white/[0.02]"
              />
            );
          }
          const kind = kindFor(i);
          return (
            <div
              key={i}
              data-testid="mini-cell"
              data-filled="true"
              className={cn(
                'flex min-h-[54px] flex-col justify-between rounded border border-white/10 bg-white/[0.05] p-1.5 text-[9.5px]',
              )}
              style={{ borderLeftColor: KIND_STRIPE[kind], borderLeftWidth: 2 }}
            >
              <span className="leading-tight font-semibold">{KIND_LABEL[kind]}</span>
              <span className="landing-mono opacity-60">{KIND_NUM[kind]}</span>
            </div>
          );
        })}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[40%] bg-gradient-to-t from-[var(--landing-bg-2)] to-transparent" />
    </div>
  );
}
