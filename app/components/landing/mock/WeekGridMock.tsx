import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { MockAppBar } from './MockAppBar';
import { WeekNav } from './WeekNav';
import { WeekSummary } from './WeekSummary';
import { SessionCard } from './SessionCard';
import { STATIC_WEEK_PLAN, totalCards } from './week-plan';
import { cn } from '~/lib/utils';

interface WeekGridMockProps {
  stepIntervalMs?: number;
}

export function WeekGridMock({ stepIntervalMs = 260 }: WeekGridMockProps) {
  const { t } = useTranslation('landing');
  const [step, setStep] = useState(0);
  const total = totalCards();

  useEffect(() => {
    let s = 0;
    const id = setInterval(() => {
      s += 1;
      if (s > total + 6) s = 0;
      setStep(s);
    }, stepIntervalMs);
    return () => clearInterval(id);
  }, [stepIntervalMs, total]);

  let cardCounter = 0;
  const cardIndex = STATIC_WEEK_PLAN.map((day) => day.cards.map(() => cardCounter++));

  return (
    <div
      data-testid="week-grid-mock"
      className="w-full overflow-hidden rounded-2xl border border-white/10 bg-[color-mix(in_oklab,var(--landing-bg)_92%,white_4%)] shadow-[0_24px_60px_-24px_rgba(0,0,0,0.6)]"
    >
      <MockAppBar />

      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex flex-col">
          <h3 className="landing-display text-[18px]">{t('mock.athleteView.title')}</h3>
          <span className="text-[11.5px] opacity-60">{t('mock.athleteView.subtitle')}</span>
        </div>
        <WeekNav weekNumber={17} dateRange={t('mock.athleteView.dateRange')} />
      </div>

      <div className="px-4">
        <WeekSummary
          plan={{
            distanceKm: 41,
            timeLabel: '6h 40',
            sessions: 8,
            load: t('mock.athleteView.loadMedium'),
          }}
          performance={{
            distanceKm: 31.6,
            distanceOfPlanPct: 77,
            timeLabel: '3h 37',
            sessionsDone: 6,
            sessionsTotal: 8,
            completionPct: 75,
          }}
        />
      </div>

      <div className="grid grid-cols-7 gap-2 p-4">
        {STATIC_WEEK_PLAN.map((day, di) => (
          <div
            key={di}
            data-testid="day-column"
            data-today={day.today ? 'true' : 'false'}
            className={cn(
              'flex min-h-[140px] flex-col gap-2 rounded-lg border p-2',
              day.today
                ? 'border-emerald-500/30 bg-emerald-500/[0.04] shadow-[inset_0_0_0_1px_rgba(16,185,129,0.05)]'
                : 'border-white/10 bg-white/[0.02]',
            )}
          >
            <div className="flex items-center justify-between">
              <span className="landing-mono text-[10px] tracking-[0.1em] uppercase opacity-60">
                {t(`mock.days.${day.dayKey}` as never)}
              </span>
              <span
                className={cn(
                  'text-[13px] leading-none font-semibold',
                  day.today ? 'text-emerald-400' : 'opacity-80',
                )}
              >
                {day.date}
              </span>
              <button
                type="button"
                aria-label={t('mock.session.addSession')}
                className="inline-flex h-5 w-5 items-center justify-center rounded border border-dashed border-white/10 opacity-50 hover:opacity-100"
              >
                <Plus size={11} aria-hidden="true" />
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              {day.cards.map((card, ci) => (
                <SessionCard
                  key={ci}
                  sport={card.sport}
                  state={card.state}
                  title={t(card.titleKey as never)}
                  meta={card.meta}
                  animatedOn={step >= cardIndex[di][ci] + 1}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
