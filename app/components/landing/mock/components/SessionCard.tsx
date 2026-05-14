import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { SportPill } from './SportPill';
import { SPORT_COLORS, type Sport } from '../data/sports';
import { cn } from '~/lib/utils';

export type SessionState =
  | 'completed'
  | 'completed-sync'
  | 'completed-confirm'
  | 'planned'
  | 'planned-mark';

interface SessionCardProps {
  sport: Sport;
  title: string;
  state: SessionState;
  meta?: Array<[string, string]>;
  animatedOn?: boolean;
}

function isCompleted(state: SessionState) {
  return state === 'completed' || state === 'completed-sync' || state === 'completed-confirm';
}

export function SessionCard({ sport, title, state, meta, animatedOn = true }: SessionCardProps) {
  const { t } = useTranslation('landing');
  const c = SPORT_COLORS[sport];
  const completed = isCompleted(state);
  return (
    <div
      data-testid="session-card"
      data-animated={animatedOn ? 'true' : 'false'}
      className={cn(
        'relative flex flex-col gap-1.5 rounded-[10px] border border-white/10 bg-white/[0.04] p-2.5 transition-[opacity,transform] duration-300',
        animatedOn ? 'translate-y-0 opacity-100' : 'translate-y-[3px] opacity-45',
      )}
    >
      <span
        className="absolute top-0 left-0 h-full w-1 rounded-l-[10px]"
        style={{ background: c.fg }}
        aria-hidden="true"
      />
      <div className="flex items-center justify-between gap-2 pl-1">
        <SportPill sport={sport} />
        {completed ? (
          <Check
            data-testid="session-card-check"
            size={12}
            className="opacity-80"
            aria-hidden="true"
          />
        ) : null}
      </div>
      <div className="pl-1 text-left text-[12px] leading-snug font-semibold">{title}</div>
      {meta && meta.length > 0 ? (
        <dl className="flex flex-wrap gap-x-3 gap-y-0.5 pl-1 text-[10.5px] opacity-70">
          {meta.map(([k, v], i) => (
            <span key={i} className="inline-flex items-baseline gap-1">
              <dt className="landing-mono text-[9px] tracking-[0.1em] uppercase opacity-70">{k}</dt>
              <dd>{v}</dd>
            </span>
          ))}
        </dl>
      ) : null}
      {state === 'planned-mark' ? (
        <button
          type="button"
          className="mt-1 ml-1 inline-flex items-center justify-center self-start rounded-md border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-medium opacity-90 hover:opacity-100"
        >
          {t('mock.session.markComplete')}
        </button>
      ) : null}
    </div>
  );
}
