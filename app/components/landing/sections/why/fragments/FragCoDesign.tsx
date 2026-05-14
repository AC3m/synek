import { useTranslation } from 'react-i18next';
import { CheckCircle2, Circle, CircleDashed } from 'lucide-react';

type State = 'done' | 'doing' | 'next';

const ICON: Record<State, typeof CheckCircle2> = {
  done: CheckCircle2,
  doing: Circle,
  next: CircleDashed,
};

const COLOR: Record<State, string> = {
  done: 'text-emerald-400',
  doing: 'text-amber-300',
  next: 'opacity-60',
};

const ITEMS: Array<{ state: State; key: string }> = [
  { state: 'done', key: 'mock.fragCoDesign.item1' },
  { state: 'doing', key: 'mock.fragCoDesign.item2' },
  { state: 'doing', key: 'mock.fragCoDesign.item3' },
  { state: 'next', key: 'mock.fragCoDesign.item4' },
  { state: 'next', key: 'mock.fragCoDesign.item5' },
];

const STATE_LABEL_KEY: Record<State, string> = {
  done: 'mock.fragCoDesign.shipped',
  doing: 'mock.fragCoDesign.inProgress',
  next: 'mock.fragCoDesign.nextUp',
};

export function FragCoDesign() {
  const { t } = useTranslation('landing');
  return (
    <div className="absolute inset-x-[8%] inset-y-[10%] flex flex-col gap-3 rounded-2xl border border-white/10 bg-[color-mix(in_oklab,var(--landing-bg-2)_90%,white_2%)] p-4">
      <header className="flex items-center justify-between">
        <span className="landing-mono text-[10px] tracking-[0.18em] uppercase opacity-60">
          {t('mock.fragCoDesign.title')}
        </span>
        <span className="text-[10.5px] opacity-60">{t('mock.fragCoDesign.version')}</span>
      </header>
      <ul className="flex flex-col gap-1.5">
        {ITEMS.map((item) => {
          const Icon = ICON[item.state];
          return (
            <li
              key={item.key}
              data-testid="frag-codesign-item"
              className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[12.5px]"
            >
              <Icon size={14} className={COLOR[item.state]} aria-hidden="true" />
              <span className="flex-1">{t(item.key as never)}</span>
              <span
                className={`landing-mono text-[10px] tracking-[0.1em] uppercase ${COLOR[item.state]}`}
              >
                {t(STATE_LABEL_KEY[item.state] as never)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
