import { memo, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from 'recharts';
import { cn } from '~/lib/utils';
import type { StrengthVariantExercise, ProgressLog } from '~/types/training';

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

interface ProgressLineChartProps {
  exercises: StrengthVariantExercise[];
  logs: ProgressLog[];
  visibleExerciseIds: Set<string>;
  className?: string;
}

export const ProgressLineChart = memo(function ProgressLineChart({
  exercises,
  logs,
  visibleExerciseIds,
  className,
}: ProgressLineChartProps) {
  // Build index map: exerciseId → sorted logs
  const logsByExercise = useMemo(
    () =>
      logs.reduce<Record<string, ProgressLog[]>>((acc, log) => {
        (acc[log.exerciseId] ??= []).push(log);
        return acc;
      }, {}),
    [logs],
  );

  // Build unified date axis
  const allDates = useMemo(() => {
    const dateSet = new Set<string>();
    for (const log of logs) dateSet.add(log.sessionDate);
    return [...dateSet].sort();
  }, [logs]);

  // Build chart data — one row per date, one key per exercise
  const chartData = useMemo(
    () =>
      allDates.map((date) => {
        const row: Record<string, unknown> = { date };
        for (const ex of exercises) {
          const dayLogs = logsByExercise[ex.id]?.filter((l) => l.sessionDate === date);
          if (dayLogs?.length) row[ex.id] = dayLogs[0].loadKg;
        }
        return row;
      }),
    [allDates, exercises, logsByExercise],
  );

  // Find "confirmed progression" points
  const progressionDots = useMemo(() => {
    const dots: Array<{ exerciseId: string; date: string; value: number }> = [];
    for (const ex of exercises) {
      const exLogs = logsByExercise[ex.id] ?? [];
      for (let i = 1; i < exLogs.length; i++) {
        const prev = exLogs[i - 1];
        const curr = exLogs[i];
        if (
          prev.progression === 'up' &&
          curr.loadKg != null &&
          prev.loadKg != null &&
          curr.loadKg > prev.loadKg
        ) {
          dots.push({ exerciseId: ex.id, date: curr.sessionDate, value: curr.loadKg });
        }
      }
    }
    return dots;
  }, [exercises, logsByExercise]);

  if (allDates.length < 2) return null;

  return (
    <div className={cn('h-[280px]', className)}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 8, right: 20, bottom: 0, left: -8 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="date"
            tickFormatter={(d) => {
              try {
                return format(parseISO(d), 'MMM d');
              } catch {
                return d;
              }
            }}
            tick={{ fontSize: 11 }}
            interval="preserveStartEnd"
            minTickGap={40}
          />
          <YAxis tick={{ fontSize: 11 }} width={40} />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="rounded-lg border bg-background p-2 text-xs shadow-md">
                  <p className="mb-1 font-medium">
                    {(() => {
                      try {
                        return format(parseISO(label), 'MMM d, yyyy');
                      } catch {
                        return label;
                      }
                    })()}
                  </p>
                  {payload.map((entry) => {
                    const ex = exercises.find((e) => e.id === entry.dataKey);
                    return (
                      <p key={entry.dataKey as string} style={{ color: entry.color }}>
                        {ex?.name ?? entry.dataKey as string}: {entry.value} kg
                      </p>
                    );
                  })}
                </div>
              );
            }}
          />
          {exercises
            .filter((ex) => visibleExerciseIds.has(ex.id))
            .map((ex, i) => (
              <Line
                key={ex.id}
                type="monotone"
                dataKey={ex.id}
                name={ex.name}
                stroke={CHART_COLORS[i % CHART_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 4 }}
                connectNulls={false}
              />
            ))}
          {progressionDots
            .filter((d) => visibleExerciseIds.has(d.exerciseId))
            .map((d, i) => {
              const exIdx = exercises.findIndex((e) => e.id === d.exerciseId);
              return (
                <ReferenceDot
                  key={i}
                  x={d.date}
                  y={d.value}
                  r={6}
                  fill={CHART_COLORS[exIdx % CHART_COLORS.length]}
                  label={{ value: '▲', position: 'top', fontSize: 10 }}
                />
              );
            })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});
