import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Skeleton } from '~/components/ui/skeleton';
import { ChevronDown, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '~/lib/utils';
import {
  getSupersetColor,
  formatRepsTarget,
  groupExercises,
  computePrefillSets,
  type SetState,
} from '~/lib/utils/strength';
import { DeltaIndicator } from '~/components/strength/DeltaIndicator';
import { ProgressionToggle } from '~/components/strength/ProgressionToggle';
import { CopySetButton } from '~/components/strength/CopySetButton';
import { PrefillBadge } from '~/components/strength/PrefillBadge';
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

function initSets(
  count: number,
  logged: StrengthSessionExercise | undefined,
  prefill: StrengthSessionExercise | undefined,
  exercise: StrengthVariantExercise,
): SetState[] {
  if (logged?.setsData && logged.setsData.length > 0) {
    return Array.from({ length: count }, (_, i) => ({
      reps: logged.setsData[i]?.reps?.toString() ?? '',
      load: logged.setsData[i]?.loadKg?.toString() ?? '',
      isPreFilled: false,
    }));
  }
  // No logged data but prefill exists — compute pre-filled values
  if (!logged && prefill) {
    return computePrefillSets(prefill, exercise);
  }
  return Array.from({ length: count }, () => ({ reps: '', load: '', isPreFilled: false }));
}

function serializeCommit(sets: SetState[], progression: ProgressionIntent | null): string {
  return JSON.stringify({
    sets: sets.map((s) => ({
      reps: s.reps !== '' ? parseInt(s.reps) : null,
      loadKg: s.load !== '' ? parseFloat(s.load) : null,
    })),
    progression,
  });
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
// PrevSummary — collapsible previous session banner above the set grid
// ---------------------------------------------------------------------------

interface PrevSummaryProps {
  prefill: StrengthSessionExercise;
  prefillDate: string;
  exercise: StrengthVariantExercise;
}

const PrevSummary = memo(function PrevSummary({
  prefill,
  prefillDate,
  exercise,
}: PrevSummaryProps) {
  const { t } = useTranslation('training');
  const [expanded, setExpanded] = useState(false);
  const unit = exercise.loadUnit === 'sec' ? 's' : 'kg';

  const formattedDate = format(parseISO(prefillDate), 'MMM d');

  const setLines = Array.from({ length: exercise.sets }, (_, i) => {
    const setData = prefill.setsData?.[i];
    const reps = setData?.reps ?? prefill.actualReps ?? null;
    const load = setData?.loadKg ?? prefill.loadKg ?? null;
    return { reps, load };
  });

  return (
    <div
      className="mb-2 rounded border border-dashed bg-muted/20 px-2.5 py-1.5"
      data-testid="prev-summary"
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-label={expanded ? t('strength.logger.prevCollapse') : t('strength.logger.prevExpand')}
        className="flex w-full items-center justify-between gap-2 text-xs text-muted-foreground"
        data-testid="prev-summary-toggle"
      >
        <span>
          {t('strength.logger.prevSession')} · {formattedDate}
        </span>
        <span className="flex items-center gap-1.5">
          {prefill.progression && (
            <ProgressionToggle value={prefill.progression} onChange={() => {}} readOnly />
          )}
          <ChevronDown
            className={cn('size-3.5 transition-transform duration-150', expanded && 'rotate-180')}
          />
        </span>
      </button>
      {expanded && (
        <div className="mt-1.5 space-y-0.5 border-t pt-1.5" data-testid="prev-summary-expanded">
          {setLines.map(({ reps, load }, i) => (
            <div
              key={i}
              data-testid={`prev-row-${i}`}
              className="flex gap-3 text-xs text-muted-foreground tabular-nums"
            >
              <span className="w-4">{i + 1}</span>
              <span>
                {reps ?? '—'} {t('strength.logger.reps')}
              </span>
              <span>{load != null ? `${load} ${unit}` : '—'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

// ---------------------------------------------------------------------------
// ExerciseCard — memoised so only changed card re-renders
// ---------------------------------------------------------------------------

interface ExerciseCardProps {
  exercise: StrengthVariantExercise;
  logged: StrengthSessionExercise | undefined;
  prefill: StrengthSessionExercise | undefined;
  prefillDate?: string | null;
  readOnly: boolean;
  isInSuperset?: boolean;
  onChange: (change: LogRowChange) => void;
}

const ExerciseCard = memo(function ExerciseCard({
  exercise,
  logged,
  prefill,
  prefillDate,
  readOnly,
  isInSuperset = false,
  onChange,
}: ExerciseCardProps) {
  const { t } = useTranslation('training');

  const [sets, setSets] = useState<SetState[]>(() =>
    initSets(exercise.sets, logged, prefill, exercise),
  );
  const [progression, setProgression] = useState<ProgressionIntent | null>(
    logged?.progression ?? null,
  );
  const [saved, setSaved] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCommittedRef = useRef<string | null>(null);

  // On first load the query may still be in-flight, so `logged` arrives after
  // mount and the useState initializers above run with undefined. Hydrate once
  // when real data lands, but never overwrite edits the user has already made.
  // Also skip re-hydration when pre-fill was already applied (sets[0].isPreFilled).
  // Separate refs so each hydration path gates independently.
  // loggedHydratedRef: logged data has been applied (fires once, always wins).
  // prefillHydratedRef: pre-fill has been applied (only when no logged data).
  const loggedHydratedRef = useRef(false);
  const prefillHydratedRef = useRef(false);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  // Logged data always takes priority — apply once on first arrival.
  useEffect(() => {
    if (logged && !loggedHydratedRef.current) {
      loggedHydratedRef.current = true;
      const newSets = initSets(exercise.sets, logged, prefill, exercise);
      const newProgression = logged.progression ?? null;
      setSets(newSets);
      setProgression(newProgression);
      lastCommittedRef.current = serializeCommit(newSets, newProgression);
    }
  }, [logged, exercise.sets]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pre-fill only when no logged data exists. Re-evaluates if logged arrives
  // after pre-fill (ensures logged data can still overwrite a pre-filled state).
  useEffect(() => {
    if (!logged && prefill && !prefillHydratedRef.current) {
      prefillHydratedRef.current = true;
      setSets(computePrefillSets(prefill, exercise));
    }
  }, [prefill, logged]); // eslint-disable-line react-hooks/exhaustive-deps

  function commit(currentSets = sets, currentProgression = progression) {
    const serialized = serializeCommit(currentSets, currentProgression);
    if (lastCommittedRef.current === serialized) return;
    lastCommittedRef.current = serialized;

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
      next[index] = { ...next[index], [field]: value, isPreFilled: false };
      return next;
    });
  }

  function handleCopyFromAbove(index: number) {
    const above = sets[index - 1];
    const updated = sets.map((s, i) =>
      i === index ? { reps: above.reps, load: above.load, isPreFilled: false } : s,
    );
    setSets(updated);
    commit(updated, progression);
  }

  function handleProgressionChange(intent: ProgressionIntent | null) {
    setProgression(intent);
    const confirmedSets = sets.map((s) => ({ ...s, isPreFilled: false }));
    setSets(confirmedSets);
    commit(confirmedSets, intent);
  }

  const { loadKg: currentTopLoad } = deriveTopSet(sets);

  const filledSetCount = sets.filter((s) => s.reps !== '' && s.load !== '').length;
  const allSetsComplete = filledSetCount === exercise.sets;

  // Compute the increment applied for PrefillBadge display
  const computedLoadDelta =
    prefill && exercise.progressionIncrement != null
      ? prefill.progression === 'up'
        ? exercise.progressionIncrement
        : prefill.progression === 'down'
          ? -exercise.progressionIncrement
          : null
      : null;

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
            {exercise.perSetReps
              ? exercise.perSetReps.map((r) => formatRepsTarget(r.repsMin, r.repsMax)).join('/')
              : formatRepsTarget(exercise.repsMin, exercise.repsMax)}{' '}
            {t('strength.logger.reps')}
          </p>
          {prefillDate && prefill && (
            <PrefillBadge
              data-testid="prefill-badge"
              direction={prefill.progression}
              incrementApplied={computedLoadDelta}
              fromDate={prefillDate}
              loadUnit={exercise.loadUnit}
            />
          )}
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
        {/* Previous session collapsible summary */}
        {prefill && prefillDate && (
          <PrevSummary prefill={prefill} prefillDate={prefillDate} exercise={exercise} />
        )}

        <div
          className={cn(
            'mb-1.5 grid gap-2 text-[10px] tracking-widest text-muted-foreground uppercase',
            exercise.perSetReps ? 'grid-cols-[4rem_1fr_1fr]' : 'grid-cols-[2.5rem_1fr_1fr]',
          )}
        >
          <span>{t('strength.logger.set')}</span>
          <span>{t('strength.logger.reps')}</span>
          <span>{t('strength.logger.load')}</span>
        </div>

        <div className="space-y-1.5">
          {sets.map((set, i) => (
            <div
              key={i}
              className={cn(
                'grid items-center gap-2',
                exercise.perSetReps ? 'grid-cols-[4rem_1fr_1fr]' : 'grid-cols-[2.5rem_1fr_1fr]',
              )}
            >
              <span className="text-xs font-medium text-muted-foreground tabular-nums">
                {exercise.perSetReps ? (
                  <>
                    {i + 1}{' '}
                    <span className="font-normal text-muted-foreground/60">
                      (
                      {exercise.perSetReps[i]
                        ? formatRepsTarget(
                            exercise.perSetReps[i].repsMin,
                            exercise.perSetReps[i].repsMax,
                          )
                        : ''}
                      )
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
                    className={cn(
                      'h-8 text-sm',
                      set.isPreFilled && 'bg-muted/60 text-muted-foreground italic',
                    )}
                    aria-label={`Set ${i + 1} reps for ${exercise.name}`}
                  />
                  <div className="flex items-center gap-1">
                    <div className="relative flex-1">
                      <Input
                        type="number"
                        min={0}
                        step={exercise.loadUnit === 'sec' ? 1 : 0.5}
                        value={set.load}
                        onChange={(e) => updateSet(i, 'load', e.target.value)}
                        onBlur={() => commit()}
                        className={cn(
                          'h-8 w-full pr-7 text-sm',
                          set.isPreFilled && 'bg-muted/60 text-muted-foreground italic',
                        )}
                        aria-label={`Set ${i + 1} load for ${exercise.name}`}
                      />
                      <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-xs text-muted-foreground">
                        {exercise.loadUnit === 'sec' ? 's' : 'kg'}
                      </span>
                    </div>
                    {i > 0 &&
                      (set.reps === '' || set.load === '' || set.isPreFilled) &&
                      (sets[i - 1].reps !== '' || sets[i - 1].load !== '') && (
                        <CopySetButton
                          onCopy={() => handleCopyFromAbove(i)}
                          disabled={false}
                          exerciseName={exercise.name}
                          setIndex={i}
                        />
                      )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {(!readOnly || progression) && (
        <div
          className={cn(
            'flex items-center gap-2 border-t px-3 py-2',
            !readOnly && 'justify-between',
          )}
        >
          <span className="text-[10px] tracking-widest text-muted-foreground uppercase">
            {t('strength.logger.nextSession')}
          </span>
          <ProgressionToggle
            value={progression}
            onChange={readOnly ? () => {} : handleProgressionChange}
            readOnly={readOnly}
          />
        </div>
      )}
    </div>
  );
});

// ---------------------------------------------------------------------------
// StrengthLoggerSkeleton — shown while the variant is loading
// ---------------------------------------------------------------------------

function ExerciseCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card">
      {/* Header */}
      <div className="flex items-start justify-between border-b bg-muted/30 px-3 py-2.5">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      {/* Set rows */}
      <div className="space-y-2 px-3 py-2">
        <div className="mb-1.5 grid grid-cols-[2.5rem_1fr_1fr] gap-2">
          <Skeleton className="h-3 w-5" />
          <Skeleton className="h-3 w-8" />
          <Skeleton className="h-3 w-10" />
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="grid grid-cols-[2.5rem_1fr_1fr] items-center gap-2">
            <Skeleton className="h-3 w-3" />
            <Skeleton className="h-8 w-full rounded-md" />
            <Skeleton className="h-8 w-full rounded-md" />
          </div>
        ))}
      </div>
      {/* Footer */}
      <div className="flex items-center justify-between border-t px-3 py-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-36 rounded" />
      </div>
    </div>
  );
}

export function StrengthLoggerSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-1', className)}>
      <div className="pb-1">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-1.5 h-4 w-40" />
      </div>
      <div className="space-y-3">
        <ExerciseCardSkeleton />
        <ExerciseCardSkeleton />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SessionExerciseLogger
// ---------------------------------------------------------------------------

interface SessionExerciseLoggerProps {
  exercises: StrengthVariantExercise[];
  loggedExercises: StrengthSessionExercise[];
  prefillData?: Record<string, StrengthSessionExercise>;
  prefillDate?: string | null;
  readOnly?: boolean;
  variantName?: string;
  onChange: (changes: LogRowChange[]) => void;
  className?: string;
}

export function SessionExerciseLogger({
  exercises,
  loggedExercises,
  prefillData,
  prefillDate,
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
      if (ex.loadUnit === 'sec') continue;
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

  const groups = useMemo(() => groupExercises(exercises), [exercises]);

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
                prefillDate={prefillDate}
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
                    prefillDate={prefillDate}
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
