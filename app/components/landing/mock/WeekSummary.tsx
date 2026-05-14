import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SegmentedToggle } from '~/components/landing/shared/SegmentedToggle';

interface WeekSummaryProps {
  plan: {
    distanceKm: number;
    timeLabel: string;
    sessions: number;
    load: string;
  };
  performance: {
    distanceKm: number;
    distanceOfPlanPct: number;
    timeLabel: string;
    sessionsDone: number;
    sessionsTotal: number;
    completionPct: number;
  };
}

function StatBlock({
  label,
  value,
  unit,
  sub,
}: {
  label: string;
  value: string;
  unit?: string;
  sub?: string;
}) {
  return (
    <div data-testid="stat-block" className="flex flex-col items-start gap-0.5 text-left">
      <div className="landing-mono text-[9.5px] tracking-[0.1em] uppercase opacity-50">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className="text-[18px] leading-none font-semibold">{value}</span>
        {unit ? <span className="text-[11px] opacity-60">{unit}</span> : null}
      </div>
      {sub ? <div className="text-[10.5px] opacity-55">{sub}</div> : null}
    </div>
  );
}

export function WeekSummary({ plan, performance }: WeekSummaryProps) {
  const { t } = useTranslation('landing');
  const [mode, setMode] = useState<'cumulative' | 'by-sport'>('cumulative');
  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
      <header className="mb-3 flex items-center justify-between gap-3">
        <span className="landing-mono text-[10.5px] tracking-[0.1em] uppercase opacity-60">
          {t('mock.weekSummary.title')}
        </span>
        <SegmentedToggle
          options={[
            { value: 'cumulative' as const, label: t('mock.weekSummary.cumulative') },
            { value: 'by-sport' as const, label: t('mock.weekSummary.bySport') },
          ]}
          value={mode}
          onChange={setMode}
        />
      </header>
      <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-5">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10.5px] font-semibold tracking-[0.06em]">
            <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
            {t('mock.weekSummary.plan')}
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <StatBlock
              label={t('mock.weekSummary.distance')}
              value={plan.distanceKm.toFixed(1)}
              unit="km"
            />
            <StatBlock label={t('mock.weekSummary.time')} value={plan.timeLabel} unit="min" />
            <StatBlock label={t('mock.weekSummary.sessions')} value={String(plan.sessions)} />
            <StatBlock label={t('mock.weekSummary.load')} value={plan.load} />
          </div>
        </div>
        <div className="w-px self-stretch bg-white/10" aria-hidden="true" />
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10.5px] font-semibold tracking-[0.06em]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {t('mock.weekSummary.performance')}
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <StatBlock
              label={t('mock.weekSummary.distance')}
              value={performance.distanceKm.toFixed(1)}
              unit="km"
              sub={`${performance.distanceOfPlanPct}% ${t('mock.weekSummary.ofPlan')}`}
            />
            <StatBlock
              label={t('mock.weekSummary.time')}
              value={performance.timeLabel}
              unit="min"
            />
            <StatBlock
              label={t('mock.weekSummary.sessions')}
              value={String(performance.sessionsDone)}
              unit={`/ ${performance.sessionsTotal}`}
            />
            <div data-testid="stat-block" className="flex flex-col items-start gap-1 text-left">
              <div className="landing-mono text-[9.5px] tracking-[0.1em] uppercase opacity-50">
                {t('mock.weekSummary.completion')}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-[18px] leading-none font-semibold">
                  {performance.completionPct}
                </span>
                <span className="text-[11px] opacity-60">%</span>
              </div>
              <div className="mt-1 h-1 rounded-full bg-white/10">
                <div
                  data-testid="progress-fill"
                  className="h-full rounded-full bg-[var(--grad-b)]"
                  style={{ width: `${performance.completionPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
