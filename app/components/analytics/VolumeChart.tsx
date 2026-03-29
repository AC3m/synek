import { useTranslation } from 'react-i18next';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { cn } from '~/lib/utils';
import type { AnalyticsBucket } from '~/types/training';

// Explicit hex colors — CSS vars are unreliable in SVG fill attributes
const COLOR_DISTANCE = '#6366f1';     // indigo-500, pops on dark and light
const COLOR_COMPLETED = '#10b981';    // emerald-500
const COLOR_PENDING = 'rgba(255,255,255,0.10)';
const COLOR_GRID = 'rgba(255,255,255,0.06)';
const COLOR_TICK = 'rgba(255,255,255,0.35)';
const COLOR_CURSOR = 'rgba(255,255,255,0.04)';

interface VolumeChartProps {
  namespace: 'coach' | 'athlete';
  buckets: AnalyticsBucket[];
  className?: string;
}

interface TooltipEntry {
  value: number;
  name: string;
  color: string;
  payload: Record<string, unknown>;
}

interface TooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}

function DistanceTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  if (!entry || entry.value === 0) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-zinc-900/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      <p className="mb-1.5 font-semibold text-white/80">{label}</p>
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
        <span className="text-white/50">{entry.name}:</span>
        <span className="font-medium text-white">{(entry.value as number).toFixed(1)} km</span>
      </div>
    </div>
  );
}

function SessionsTooltip({ active, payload, label, completedLabel, totalLabel }: TooltipProps & { completedLabel: string; totalLabel: string }) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;
  const completed = data.completedSessions as number;
  const total = data.totalSessions as number;
  if (total === 0) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-zinc-900/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      <p className="mb-1.5 font-semibold text-white/80">{label}</p>
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLOR_COMPLETED }} />
        <span className="text-white/50">{completedLabel}:</span>
        <span className="font-medium text-white">{completed}/{total}</span>
      </div>
    </div>
  );
}

export function VolumeChart({ namespace, buckets, className }: VolumeChartProps) {
  const { t } = useTranslation(namespace);

  const distanceLabel = t('analytics.chart.distance' as never);
  const sessionsLabel = t('analytics.chart.sessions' as never);
  const completedLabel = t('analytics.totals.completion' as never);

  // Pre-compute pending sessions so stacking shows total = completed + pending
  const sessionData = buckets.map((b) => ({
    ...b,
    pendingSessions: Math.max(0, b.totalSessions - b.completedSessions),
  }));

  // Determine bar size based on bucket count — fewer buckets = wider bars
  const barSize = buckets.length <= 12 ? 16 : buckets.length <= 31 ? 8 : 5;

  const axisProps = {
    tick: { fontSize: 10, fill: COLOR_TICK },
    axisLine: false as const,
    tickLine: false as const,
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Distance chart */}
      <div>
        <p className="mb-3 text-[10px] font-bold tracking-[0.15em] text-white/40 uppercase">
          {distanceLabel}
        </p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={buckets} barSize={barSize} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={COLOR_GRID} />
            <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" />
            <YAxis {...axisProps} />
            <Tooltip
              content={<DistanceTooltip />}
              cursor={{ fill: COLOR_CURSOR }}
            />
            <Bar
              dataKey="totalDistanceKm"
              name={distanceLabel}
              fill={COLOR_DISTANCE}
              radius={[3, 3, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Sessions chart — stacked: completed (green) + pending (muted) */}
      <div>
        <p className="mb-3 text-[10px] font-bold tracking-[0.15em] text-white/40 uppercase">
          {sessionsLabel}
        </p>
        <ResponsiveContainer width="100%" height={130}>
          <BarChart data={sessionData} barSize={barSize} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={COLOR_GRID} />
            <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" />
            <YAxis {...axisProps} allowDecimals={false} />
            <Tooltip
              content={<SessionsTooltip completedLabel={completedLabel} totalLabel={sessionsLabel} />}
              cursor={{ fill: COLOR_CURSOR }}
            />
            <Bar
              dataKey="completedSessions"
              name={completedLabel}
              fill={COLOR_COMPLETED}
              radius={[0, 0, 0, 0]}
              stackId="s"
            />
            <Bar
              dataKey="pendingSessions"
              name={sessionsLabel}
              fill={COLOR_PENDING}
              radius={[3, 3, 0, 0]}
              stackId="s"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
