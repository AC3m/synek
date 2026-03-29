import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '~/lib/utils';
import {
  SUPERSET_COLORS,
  getSupersetColor,
  formatRepsTarget,
  groupExercises,
} from '~/lib/utils/strength';
import { DeltaIndicator } from '~/components/strength/DeltaIndicator';
import { ProgressionToggle } from '~/components/strength/ProgressionToggle';
import { Input } from '~/components/ui/input';
import type {
  SetEntry,
  StrengthVariantExercise,
  StrengthSessionExercise,
  ProgressionIntent,
} from '~/types/training';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LogRowChange {
  variantExerciseId: string;
  actualReps: number | null;
  loadKg: number | null;
  setsData: SetEntry[];
  progression: ProgressionIntent | null;
}

interface SetState {
  reps: string;
  load: string;
}

function initSets(count: number, logged: StrengthSessionExercise | undefined): SetState[] {
  if (logged?.setsData && logged.setsData.length > 0) {
    return Array.from({ length: count }, (_, i) => ({
      reps: logged.setsData[i]?.reps?.toString() ?? '',
      load: logged.setsData[i]?.loadKg?.toString() ?? '',
    }));
  }
  return Array.from({ length: count }, () => ({ reps: '', load: '' }));
}

function deriveTopSet(sets: SetState[]): { actualReps: number | null; loadKg: number | null } {
  let topIdx = 0;
  for (let i = 1; i < sets.length; i++) {
    const curr = parseFloat(sets[i].load);
    const top = parseFloat(sets[topIdx].load);
    if (!isNaN(curr) && (isNaN(top) || curr > top)) topIdx = i;
  }
  const top = sets[topIdx];
  return {
    actualReps: top?.reps !== '' ? parseInt(top.reps) : null,
    loadKg: top?.load !== '' ? parseFloat(top.load) : null,
  };
}

// ---------------------------------------------------------------------------
// ExerciseCard — memoised so only changed card re-renders
// ---------------------------------------------------------------------------

interface ExerciseCardProps {
  exercise: StrengthVariantExercise;
  logged: StrengthSessionExercise | undefined;
  prefill: StrengthSessionExercise | undefined;
  readOnly: boolean;
  isInSuperset?: boolean;
  onChange: (change: LogRowChange) => void;
}

const ExerciseCard = memo(function ExerciseCard({
  exercise,
  logged,
  prefill,
  readOnly,
  isInSuperset = false,
  onChange,
}: ExerciseCardProps) {
  const { t } = useTranslation('training');

  const [sets, setSets] = useState<SetState[]>(() => initSets(exercise.sets, logged));
  const [progression, setProgression] = useState<ProgressionIntent | null>(
    logged?.progression ?? null,
  );
  const [saved, setSaved] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function commit(currentSets = sets, currentProgression = progression) {
    const setsData: SetEntry[] = currentSets.map((s) => ({
      reps: s.reps !== '' ? parseInt(s.reps) : null,
      loadKg: s.load !== '' ? parseFloat(s.load) : null,
    }));
    const { actualReps, loadKg } = deriveTopSet(currentSets);
    onChange({
      variantExerciseId: exercise.id,
      actualReps,
      loadKg,
      setsData,
      progression: currentProgression,
    });
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaved(true);
    saveTimerRef.current = setTimeout(() => setSaved(false), 1500);
  }

  function updateSet(index: number, field: 'reps' | 'load', value: string) {
    setSets((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function handleProgressionChange(intent: ProgressionIntent | null) {
    setProgression(intent);
    commit(sets, intent);
  }

  const currentTopLoad = useMemo(() => {
    const { loadKg } = deriveTopSet(sets);
    return loadKg;
  }, [sets]);

  const filledSetCount = sets.filter((s) => s.reps !== '' && s.load !== '').length;
  const allSetsComplete = filledSetCount === exercise.sets;

  return (
    <div
      className={cn(
        'bg-card transition-colors',
        !isInSuperset && 'rounded-lg border',
        !isInSuperset && !allSetsComplete && 'border-l-2 border-l-orange-300',
        !isInSuperset && allSetsComplete && 'border-l-2 border-l-green-400',
      )}
    >
      {/* Exercise header */}
      <div className="flex items-start justify-between border-b bg-muted/30 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold">{exercise.name}</span>
            {exercise.videoUrl && (
              <a
                href={exercise.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-muted-foreground hover:text-foreground"
                aria-label={`Watch ${exercise.name} demo`}
              >
                <ExternalLink className="size-3" />
              </a>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {exercise.sets} {t('strength.logger.sets')} · {t('strength.logger.target')}:{' '}
            {exercise.perSetReps ? (
              exercise.perSetReps.map((r) =>
                r.repsMin === r.repsMax ? String(r.repsMin) : `${r.repsMin}–${r.repsMax}`
              ).join('/')
            ) : (
              formatRepsTarget(exercise.repsMin, exercise.repsMax)
            )}{' '}
            {t('strength.logger.reps')}
          </p>
        </div>
        <div className="ml-2 flex shrink-0 items-center gap-2">
          {currentTopLoad != null && prefill?.loadKg != null && (
            <DeltaIndicator current={currentTopLoad} baseline={prefill.loadKg} unit="kg" />
          )}
          {saved && <span className="animate-pulse text-xs font-medium text-green-600">✓</span>}
        </div>
      </div>

      {/* Set rows */}
      <div className="px-3 py-2">
        <div className={cn(
          "mb-1.5 grid gap-2 text-[10px] tracking-widest text-muted-foreground uppercase",
          exercise.perSetReps ? "grid-cols-[4rem_1fr_1fr]" : "grid-cols-[2.5rem_1fr_1fr]"
        )}>
          <span>{t('strength.logger.set')}</span>
          <span>{t('strength.logger.reps')}</span>
          <span>{t('strength.logger.load')}</span>
        </div>

        <div className="space-y-1.5">
          {sets.map((set, i) => {
            const prefillSet = prefill?.setsData?.[i];
            return (
              <div key={i} className={cn(
                "grid items-center gap-2",
                exercise.perSetReps ? "grid-cols-[4rem_1fr_1fr]" : "grid-cols-[2.5rem_1fr_1fr]"
              )}>
                <span className="text-xs font-medium text-muted-foreground tabular-nums">
                  {exercise.perSetReps ? (
                    <>
                      {i + 1}{' '}
                      <span className="font-normal text-muted-foreground/60">
                        ({exercise.perSetReps[i]?.repsMin === exercise.perSetReps[i]?.repsMax
                          ? exercise.perSetReps[i]?.repsMin
                          : `${exercise.perSetReps[i]?.repsMin}–${exercise.perSetReps[i]?.repsMax}`})
                      </span>
                    </>
                  ) : (
                    i + 1
                  )}
                </span>
                {readOnly ? (
                  <>
                    <span className="text-sm">{set.reps || '—'}</span>
                    <span className="text-sm">
                      {set.load ? `${set.load} ${exercise.loadUnit === 'sec' ? 's' : 'kg'}` : '—'}
                    </span>
                  </>
                ) : (
                  <>
                    <Input
                      type="number"
                      min={0}
                      value={set.reps}
                      onChange={(e) => updateSet(i, 'reps', e.target.value)}
                      onBlur={() => commit()}
                      placeholder={prefillSet?.reps?.toString() ?? '—'}
                      className="h-8 text-sm"
                      aria-label={`Set ${i + 1} reps for ${exercise.name}`}
                    />
                    <div className="relative">
                      <Input
                        type="number"
                        min={0}
                        step={exercise.loadUnit === 'sec' ? 1 : 0.5}
                        value={set.load}
                        onChange={(e) => updateSet(i, 'load', e.target.value)}
                        onBlur={() => commit()}
                        placeholder={prefillSet?.loadKg?.toString() ?? '—'}
                        className="h-8 pr-7 text-sm"
                        aria-label={`Set ${i + 1} load for ${exercise.name}`}
                      />
                      <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-xs text-muted-foreground">
                        {exercise.loadUnit === 'sec' ? 's' : 'kg'}
                      </span>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Next session intent */}
      <div className="border-t px-3 py-2.5">
        <p className="mb-1.5 text-[10px] tracking-widest text-muted-foreground uppercase">
          {t('strength.logger.nextSession')}
        </p>
        <ProgressionToggle
          value={progression}
          onChange={handleProgressionChange}
          readOnly={readOnly}
        />
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// SessionExerciseLogger
// ---------------------------------------------------------------------------

interface SessionExerciseLoggerProps {
  exercises: StrengthVariantExercise[];
  loggedExercises: StrengthSessionExercise[];
  prefillData?: Record<string, StrengthSessionExercise>;
  readOnly?: boolean;
  variantName?: string;
  onChange: (changes: LogRowChange[]) => void;
  className?: string;
}

export function SessionExerciseLogger({
  exercises,
  loggedExercises,
  prefillData,
  readOnly = false,
  variantName,
  onChange,
  className,
}: SessionExerciseLoggerProps) {
  const { t } = useTranslation('training');

  const logMap = useMemo<Record<string, StrengthSessionExercise>>(() => {
    const map: Record<string, StrengthSessionExercise> = {};
    for (const se of loggedExercises) {
      if (se.variantExerciseId) map[se.variantExerciseId] = se;
    }
    return map;
  }, [loggedExercises]);

  const [pending, setPending] = useState<Record<string, LogRowChange>>({});
  const pendingRef = useRef<Record<string, LogRowChange>>({});

  const handleRowChange = useCallback(
    (change: LogRowChange) => {
      const updated = { ...pendingRef.current, [change.variantExerciseId]: change };
      pendingRef.current = updated;
      setPending(updated);
      onChange(Object.values(updated));
    },
    [onChange],
  );

  const totalVolume = useMemo(() => {
    let vol = 0;
    let hasAny = false;
    for (const ex of exercises) {
      if (ex.loadUnit === 'sec') continue; // seconds-based exercises don't contribute to kg volume
      const row = pending[ex.id] ?? logMap[ex.id];
      if (!row) continue;
      if (row.setsData && row.setsData.length > 0) {
        for (const s of row.setsData) {
          if (s.reps != null && s.loadKg != null) {
            vol += s.reps * s.loadKg;
            hasAny = true;
          }
        }
      } else if (row.actualReps != null && row.loadKg != null) {
        vol += ex.sets * row.actualReps * row.loadKg;
        hasAny = true;
      }
    }
    return hasAny ? Math.round(vol) : null;
  }, [exercises, logMap, pending]);

  const groups = groupExercises(exercises);

  return (
    <div className={cn('space-y-1', className)}>
      {/* Section header */}
      <div className="pb-1">
        <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          {t('strength.logger.sectionTitle')}
        </p>
        {variantName && <p className="mt-0.5 text-sm font-medium">{variantName}</p>}
      </div>

      {/* Exercise cards */}
      <div className="space-y-3">
        {groups.map((group) => {
          if (group.length === 1) {
            const ex = group[0];
            return (
              <ExerciseCard
                key={ex.id}
                exercise={ex}
                logged={logMap[ex.id]}
                prefill={prefillData?.[ex.id]}
                readOnly={readOnly}
                onChange={handleRowChange}
              />
            );
          }

          // Superset group — color by group ID
          const color = getSupersetColor(group[0].supersetGroup!);
          return (
            <div
              key={group[0].id}
              className={cn('overflow-hidden rounded-lg border', color.container)}
            >
              <div className={cn('px-3 py-1.5', color.header)}>
                <span
                  className={cn('text-[10px] font-semibold tracking-widest uppercase', color.label)}
                >
                  {t('strength.superset.label')}
                </span>
              </div>
              <div className="divide-y divide-border">
                {group.map((ex) => (
                  <ExerciseCard
                    key={ex.id}
                    exercise={ex}
                    logged={logMap[ex.id]}
                    prefill={prefillData?.[ex.id]}
                    readOnly={readOnly}
                    isInSuperset
                    onChange={handleRowChange}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Volume summary */}
      {totalVolume != null && (
        <div className="pt-1 text-xs text-muted-foreground">
          {t('strength.logger.sessionVolume', { volume: totalVolume.toLocaleString() })}
        </div>
      )}
    </div>
  );
}
