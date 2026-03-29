import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '~/lib/utils';
import { PeriodSelector } from '~/components/analytics/PeriodSelector';
import { SportFilter } from '~/components/analytics/SportFilter';
import { VolumeChart } from '~/components/analytics/VolumeChart';
import { GoalCard } from '~/components/goals/GoalCard';
import { useAnalytics } from '~/lib/hooks/useAnalytics';
import { computeGoalAchievement } from '~/lib/utils/goals';
import type { AnalyticsPeriod, Goal, TrainingType } from '~/types/training';

interface AnalyticsViewProps {
  namespace: 'coach' | 'athlete';
  athleteId: string;
  goals: Goal[];
  className?: string;
}

interface StatChipProps {
  label: string;
  value: string;
  sub?: string;
}

function StatChip({ label, value, sub }: StatChipProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-bold tracking-[0.15em] text-white/35 uppercase">{label}</span>
      <div className="flex items-baseline gap-1">
        <span className="text-lg font-semibold tabular-nums text-white/90">{value}</span>
        {sub && <span className="text-[11px] text-white/40">{sub}</span>}
      </div>
    </div>
  );
}

function formatTotalDuration(minutes: number): { value: string; unit: string } {
  if (minutes < 60) return { value: String(minutes), unit: 'min' };
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return { value: String(h), unit: 'h' };
  return { value: `${h}h ${m}`, unit: 'min' };
}

export function AnalyticsView({ namespace, athleteId, goals, className }: AnalyticsViewProps) {
  const { t } = useTranslation(namespace);
  const [period, setPeriod] = useState<AnalyticsPeriod>('month');
  const [goalId, setGoalId] = useState<string | undefined>(goals[0]?.id);
  const [sportFilter, setSportFilter] = useState<TrainingType | undefined>(undefined);

  const { data, isLoading } = useAnalytics({
    athleteId,
    period,
    goalId: period === 'goal' ? goalId : undefined,
    trainingType: sportFilter,
  });

  const title = t('analytics.title' as never);
  const distanceLabel = t('analytics.totals.distance' as never);
  const sessionsLabel = t('analytics.totals.sessions' as never);
  const timeLabel = t('analytics.totals.time' as never);
  const completionLabel = t('analytics.totals.completion' as never);

  const totals = data?.totals;
  const duration = totals ? formatTotalDuration(totals.totalDurationMinutes) : null;

  return (
    <div className={cn('overflow-hidden rounded-xl border border-white/[0.07] bg-zinc-950', className)}>
      {/* Header */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-[10px] font-bold tracking-[0.18em] text-white/40 uppercase">{title}</span>
          <SportFilter namespace={namespace} value={sportFilter} onChange={setSportFilter} />
        </div>
        <PeriodSelector
          namespace={namespace}
          period={period}
          goalId={goalId}
          goals={goals}
          onPeriodChange={setPeriod}
          onGoalChange={setGoalId}
          className="mt-3"
        />
      </div>

      {/* Goal card — shown between header and totals when in goal period */}
      {period === 'goal' && !isLoading && data?.competitions.map((comp) => {
        const goal = goals.find((g) => g.id === comp.goalId);
        if (!goal) return null;
        return (
          <div key={comp.goalId} className="border-t border-white/[0.06] px-5 py-4">
            <GoalCard
              goal={goal}
              canEdit={false}
              achievementStatus={computeGoalAchievement(goal, {
                resultDistanceKm: comp.resultDistanceKm,
                resultTimeSeconds: comp.resultTimeSeconds,
              })}
              onEdit={() => {}}
              onDelete={() => {}}
            />
          </div>
        );
      })}

      {/* Totals strip */}
      {totals && !isLoading && (
        <div className="grid grid-cols-4 gap-px border-t border-white/[0.06] bg-white/[0.04]">
          <div className="bg-zinc-950 px-4 py-3">
            <StatChip
              label={distanceLabel}
              value={totals.totalDistanceKm.toFixed(1)}
              sub="km"
            />
          </div>
          <div className="bg-zinc-950 px-4 py-3">
            <StatChip
              label={sessionsLabel}
              value={`${totals.completedSessions}/${totals.totalSessions}`}
            />
          </div>
          <div className="bg-zinc-950 px-4 py-3">
            <StatChip
              label={timeLabel}
              value={duration!.value}
              sub={duration!.unit}
            />
          </div>
          <div className="bg-zinc-950 px-4 py-3">
            <StatChip
              label={completionLabel}
              value={`${Math.round(totals.overallCompletionRate)}%`}
            />
          </div>
        </div>
      )}

      {/* Charts / empty / loading */}
      <div className="border-t border-white/[0.06] px-5 py-5">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          </div>
        ) : !data || data.buckets.length === 0 ? (
          <p className="py-8 text-center text-sm text-white/30">
            {t('analytics.empty' as never)}
          </p>
        ) : (
          <VolumeChart namespace={namespace} buckets={data.buckets} />
        )}
      </div>
    </div>
  );
}
