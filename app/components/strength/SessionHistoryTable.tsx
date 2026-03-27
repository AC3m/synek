import { memo, useMemo, useState } from 'react';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { cn } from '~/lib/utils';
import { ProgressionToggle } from '~/components/strength/ProgressionToggle';
import type { StrengthVariantExercise, ProgressLog } from '~/types/training';

type SortCol = 'date' | 'load' | 'volume';
type SortDir = 'asc' | 'desc';

interface SessionHistoryTableProps {
  exercises: StrengthVariantExercise[];
  logs: ProgressLog[];
  className?: string;
}

export const SessionHistoryTable = memo(function SessionHistoryTable({
  exercises,
  logs,
  className,
}: SessionHistoryTableProps) {
  const { t } = useTranslation('training');

  const [sort, setSort] = useState<{ col: SortCol; dir: SortDir }>(() => ({
    col: 'date',
    dir: 'desc',
  }));

  // Group by session, build index map in one pass
  const bySession = useMemo(
    () =>
      logs.reduce<Record<string, ProgressLog[]>>((acc, log) => {
        (acc[log.sessionId] ??= []).push(log);
        return acc;
      }, {}),
    [logs],
  );

  const exerciseMap = useMemo(
    () =>
      exercises.reduce<Record<string, StrengthVariantExercise>>((acc, ex) => {
        acc[ex.id] = ex;
        return acc;
      }, {}),
    [exercises],
  );

  // Compute session-level aggregates
  const sessions = useMemo(() => {
    return Object.entries(bySession).map(([sessionId, sessionLogs]) => {
      const date = sessionLogs[0]?.sessionDate ?? '';
      const totalVolume = sessionLogs.reduce((sum, log) => {
        const sets = exerciseMap[log.exerciseId]?.sets ?? 1;
        return sum + sets * (log.actualReps ?? 0) * (log.loadKg ?? 0);
      }, 0);
      const maxLoad = Math.max(...sessionLogs.map((l) => l.loadKg ?? 0));
      return { sessionId, date, totalVolume: Math.round(totalVolume), maxLoad, logs: sessionLogs };
    });
  }, [bySession, exerciseMap]);

  // Sort sessions
  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => {
      let cmp = 0;
      if (sort.col === 'date') cmp = a.date.localeCompare(b.date);
      else if (sort.col === 'load') cmp = a.maxLoad - b.maxLoad;
      else if (sort.col === 'volume') cmp = a.totalVolume - b.totalVolume;
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [sessions, sort]);

  function toggleSort(col: SortCol) {
    setSort((prev) =>
      prev.col === col ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'desc' },
    );
  }

  function sortHeader(col: SortCol, label: string) {
    return (
      <th
        className="cursor-pointer pr-3 pb-2 text-left text-xs tracking-widest whitespace-nowrap text-muted-foreground uppercase select-none"
        onClick={() => toggleSort(col)}
      >
        {label}
        {sort.col === col && <span className="ml-1">{sort.dir === 'asc' ? '↑' : '↓'}</span>}
      </th>
    );
  }

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full text-sm">
        <thead>
          <tr>
            {sortHeader('date', t('strength.analysis.tableDate'))}
            <th className="pr-3 pb-2 text-left text-xs tracking-widest text-muted-foreground uppercase">
              {t('strength.analysis.tableExercise')}
            </th>
            <th className="pr-3 pb-2 text-left text-xs tracking-widest whitespace-nowrap text-muted-foreground uppercase">
              {t('strength.analysis.tableSetsReps')}
            </th>
            {sortHeader('load', t('strength.analysis.tableLoad'))}
            {sortHeader('volume', t('strength.analysis.tableVolume'))}
            <th className="pb-2 text-left text-xs tracking-widest whitespace-nowrap text-muted-foreground uppercase">
              {t('strength.analysis.tableNextIntent')}
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedSessions.map((session) =>
            session.logs.map((log, i) => {
              const ex = exerciseMap[log.exerciseId];
              const rowVol = (ex?.sets ?? 1) * (log.actualReps ?? 0) * (log.loadKg ?? 0);
              const isFirst = i === 0;
              return (
                <tr
                  key={`${session.sessionId}-${log.exerciseId}-${i}`}
                  className={cn('border-b', isFirst && 'border-t border-t-border')}
                >
                  <td className="py-1.5 pr-3 align-top text-xs whitespace-nowrap text-muted-foreground">
                    {isFirst && session.date ? (
                      <>
                        <div>{format(parseISO(session.date), 'MMM d')}</div>
                        <div className="text-[10px]">
                          {formatDistanceToNow(parseISO(session.date), { addSuffix: true })}
                        </div>
                      </>
                    ) : null}
                  </td>
                  <td className="max-w-[140px] py-1.5 pr-3 text-xs">
                    <span className="block truncate" title={log.exerciseName}>
                      {log.exerciseName}
                    </span>
                  </td>
                  <td className="py-1.5 pr-3 text-xs">
                    {ex?.sets ?? '—'}×{log.actualReps ?? '—'}
                  </td>
                  <td className="py-1.5 pr-3 text-xs">
                    {log.loadKg != null ? `${log.loadKg} kg` : '—'}
                  </td>
                  <td className="py-1.5 pr-3 text-xs">
                    {Math.round(rowVol) > 0 ? `${Math.round(rowVol)} kg` : '—'}
                  </td>
                  <td className="py-1.5">
                    <ProgressionToggle value={log.progression} onChange={() => {}} readOnly />
                  </td>
                </tr>
              );
            }),
          )}
        </tbody>
      </table>
    </div>
  );
});
