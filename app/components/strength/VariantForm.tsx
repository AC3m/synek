import { Fragment, memo, useRef, useState, useCallback } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown, ExternalLink, Link2, Minus, ArrowLeftRight, List } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '~/lib/utils';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import type { StrengthVariant, StrengthVariantExercise, PerSetRep } from '~/types/training';

// Hoisted — doesn't change between renders
const VIDEO_URL_REGEX = /^https?:\/\/.+/;

// ---------------------------------------------------------------------------
// Superset color palette — one per group, cycling if > 5 groups
// ---------------------------------------------------------------------------

const SUPERSET_COLORS = [
  { leftBorder: 'border-l-orange-400', button: 'text-orange-600' },
  { leftBorder: 'border-l-violet-400', button: 'text-violet-600' },
  { leftBorder: 'border-l-emerald-400', button: 'text-emerald-600' },
  { leftBorder: 'border-l-rose-400', button: 'text-rose-600' },
  { leftBorder: 'border-l-sky-400', button: 'text-sky-600' },
] as const;

function getSupersetColor(groupId: number) {
  return SUPERSET_COLORS[(groupId - 1) % SUPERSET_COLORS.length];
}

// ---------------------------------------------------------------------------

interface FormExercise {
  id?: string;
  name: string;
  videoUrl: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  perSetReps: { repsMin: number; repsMax: number }[] | null;
  loadUnit: 'kg' | 'sec';
  supersetGroup?: number | null;
}

function convertToFormExercises(exercises: StrengthVariantExercise[]): FormExercise[] {
  return exercises.map((ex) => ({
    id: ex.id,
    name: ex.name,
    videoUrl: ex.videoUrl ?? '',
    sets: ex.sets,
    repsMin: ex.repsMin,
    repsMax: ex.repsMax,
    perSetReps: ex.perSetReps ?? null,
    loadUnit: ex.loadUnit,
    supersetGroup: ex.supersetGroup,
  }));
}

function createEmptyExercise(): FormExercise {
  return { name: '', videoUrl: '', sets: 3, repsMin: 8, repsMax: 12, perSetReps: null, loadUnit: 'kg' };
}

// ---------------------------------------------------------------------------
// Superset helpers
// ---------------------------------------------------------------------------

function initLinks(exercises: StrengthVariantExercise[]): boolean[] {
  return exercises
    .slice(0, -1)
    .map(
      (ex, i) => ex.supersetGroup !== null && exercises[i + 1].supersetGroup === ex.supersetGroup,
    );
}

function computeSupersetGroups(links: boolean[], count: number): (number | null)[] {
  const groups: (number | null)[] = new Array(count).fill(null);
  let groupId = 0;
  for (let i = 0; i < links.length; i++) {
    if (links[i]) {
      if (groups[i] === null) {
        groupId++;
        groups[i] = groupId;
      }
      groups[i + 1] = groups[i];
    }
  }
  return groups;
}

function removeLinkForExercise(links: boolean[], i: number): boolean[] {
  if (links.length === 0) return links;
  const next = [...links];
  if (i === 0) {
    next.splice(0, 1);
  } else if (i >= links.length) {
    next.splice(links.length - 1, 1);
  } else {
    const bridge = next[i - 1] && next[i];
    next.splice(i, 1);
    next[i - 1] = bridge;
  }
  return next;
}

// ---------------------------------------------------------------------------
// ExerciseRow — isolated so editing one row doesn't re-render siblings
// ---------------------------------------------------------------------------

interface ExerciseRowProps {
  exercise: FormExercise;
  index: number;
  total: number;
  supersetGroupId: number | null;
  nameRef: React.RefObject<HTMLInputElement | null>;
  onChange: (index: number, updated: Partial<FormExercise>) => void;
  onRemove: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onNameKeyDown: (index: number, e: React.KeyboardEvent<HTMLInputElement>) => void;
}

const ExerciseRow = memo(function ExerciseRow({
  exercise,
  index,
  total,
  supersetGroupId,
  nameRef,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  onNameKeyDown,
}: ExerciseRowProps) {
  const { t } = useTranslation('training');
  const [showVideo, setShowVideo] = useState(!!exercise.videoUrl);

  type RepsMode = 'exact' | 'range' | 'perSet';
  const [repsMode, setRepsMode] = useState<RepsMode>(() => {
    if (exercise.perSetReps) return 'perSet';
    if (exercise.repsMin !== exercise.repsMax) return 'range';
    return 'exact';
  });

  const setsPreset = [1, 2, 3, 4, 5, 6];
  const isCustomSets = !setsPreset.includes(exercise.sets);
  const videoIsValid = !exercise.videoUrl || VIDEO_URL_REGEX.test(exercise.videoUrl);
  const color = supersetGroupId !== null ? getSupersetColor(supersetGroupId) : null;
  const perSetHasRange = exercise.perSetReps?.some((r) => r.repsMin !== r.repsMax) ?? false;

  function handleRepsMode(mode: RepsMode) {
    if (mode === repsMode) return;
    const prev = repsMode;
    setRepsMode(mode);

    if (mode === 'exact') {
      if (prev === 'perSet') {
        const first = exercise.perSetReps?.[0];
        const val = first?.repsMin ?? exercise.repsMin;
        onChange(index, { repsMin: val, repsMax: val, perSetReps: null });
      } else {
        onChange(index, { repsMax: exercise.repsMin });
      }
    } else if (mode === 'range') {
      if (prev === 'perSet') {
        const first = exercise.perSetReps?.[0];
        onChange(index, {
          repsMin: first?.repsMin ?? exercise.repsMin,
          repsMax: first?.repsMax ?? exercise.repsMax,
          perSetReps: null,
        });
      }
    } else {
      const useRange = prev === 'range';
      const arr = Array.from({ length: exercise.sets }, () => ({
        repsMin: exercise.repsMin,
        repsMax: useRange ? exercise.repsMax : exercise.repsMin,
      }));
      onChange(index, { perSetReps: arr });
    }
  }

  function handlePerSetChange(setIdx: number, field: 'repsMin' | 'repsMax' | 'both', value: number) {
    const updated = [...(exercise.perSetReps ?? [])];
    if (field === 'both') {
      updated[setIdx] = { repsMin: value, repsMax: value };
    } else if (field === 'repsMin') {
      updated[setIdx] = { ...updated[setIdx], repsMin: value, repsMax: Math.max(value, updated[setIdx].repsMax) };
    } else {
      updated[setIdx] = { ...updated[setIdx], repsMax: value };
    }
    onChange(index, { perSetReps: updated });
  }

  return (
    <div
      className={cn('rounded-lg border bg-muted/30 p-3', color && `border-l-2 ${color.leftBorder}`)}
    >
      <div className="flex items-center gap-2">
        {/* Reorder buttons */}
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            aria-label="Move up"
            onClick={() => onMoveUp(index)}
            disabled={index === 0}
            className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <ChevronUp className="size-3.5" />
          </button>
          <button
            type="button"
            aria-label="Move down"
            onClick={() => onMoveDown(index)}
            disabled={index === total - 1}
            className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <ChevronDown className="size-3.5" />
          </button>
        </div>

        {/* Exercise name */}
        <div className="flex-1">
          <Input
            ref={index === 0 ? (nameRef as React.RefObject<HTMLInputElement>) : undefined}
            value={exercise.name}
            onChange={(e) => onChange(index, { name: e.target.value })}
            onKeyDown={(e) => onNameKeyDown(index, e)}
            placeholder={t('strength.exercise.name')}
            aria-label={t('strength.exercise.name')}
            className="h-9"
          />
        </div>

        {/* Remove */}
        <button
          type="button"
          aria-label={t('strength.variant.delete')}
          onClick={() => onRemove(index)}
          className="rounded p-1.5 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      {/* Sets + Reps */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        {/* Sets */}
        <div>
          <Label className="text-xs">{t('strength.exercise.sets')}</Label>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            {setsPreset.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onChange(index, { sets: n })}
                className={cn(
                  'min-h-[36px] min-w-[36px] rounded border text-sm font-medium transition-colors',
                  exercise.sets === n
                    ? 'border-orange-600 bg-orange-600 text-white'
                    : 'border-input bg-background hover:bg-accent',
                )}
              >
                {n}
              </button>
            ))}
            {isCustomSets ? (
              <>
                <Input
                  type="number"
                  min={7}
                  max={20}
                  value={exercise.sets}
                  onChange={(e) => onChange(index, { sets: parseInt(e.target.value) || 7 })}
                  className="h-9 w-16"
                  aria-label={t('strength.exercise.sets')}
                />
                <button
                  type="button"
                  onClick={() => onChange(index, { sets: 3 })}
                  className="text-xs text-muted-foreground hover:text-foreground"
                  aria-label="Reset sets"
                >
                  ×
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => onChange(index, { sets: 7 })}
                className="ml-1 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
              >
                6+
              </button>
            )}
          </div>
        </div>

        {/* Reps */}
        <div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">{t('strength.exercise.reps')}</Label>
            <div className="flex gap-0.5" role="group" aria-label={t('strength.exercise.reps')}>
              {([
                { mode: 'exact', Icon: Minus, label: t('strength.exercise.repsMode.exact') },
                { mode: 'range', Icon: ArrowLeftRight, label: t('strength.exercise.repsMode.range') },
                { mode: 'perSet', Icon: List, label: t('strength.exercise.repsMode.perSet') },
              ] as const).map(({ mode, Icon, label }) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => handleRepsMode(mode)}
                  aria-label={label}
                  aria-pressed={repsMode === mode}
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded transition-colors',
                    repsMode === mode
                      ? 'bg-orange-600 text-white'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  )}
                >
                  <Icon className="h-3 w-3" />
                </button>
              ))}
            </div>
          </div>

          {repsMode === 'perSet' ? (
            <div className="mt-1 space-y-1">
              {(exercise.perSetReps ?? []).map((rep, setIdx) => (
                <div key={setIdx} className="flex items-center gap-1">
                  <span className="w-7 text-xs text-muted-foreground">
                    {t('strength.exercise.setLabel', { n: setIdx + 1 })}
                  </span>
                  {perSetHasRange ? (
                    <>
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        value={rep.repsMin}
                        onChange={(e) =>
                          handlePerSetChange(setIdx, 'repsMin', parseInt(e.target.value) || 1)
                        }
                        className="h-7 w-14 text-xs"
                      />
                      <span className="text-xs text-muted-foreground">–</span>
                      <Input
                        type="number"
                        min={rep.repsMin}
                        max={100}
                        value={rep.repsMax}
                        onChange={(e) =>
                          handlePerSetChange(
                            setIdx,
                            'repsMax',
                            parseInt(e.target.value) || rep.repsMin,
                          )
                        }
                        className="h-7 w-14 text-xs"
                      />
                    </>
                  ) : (
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={rep.repsMin}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 1;
                        handlePerSetChange(setIdx, 'both', val);
                      }}
                      className="h-7 w-14 text-xs"
                    />
                  )}
                </div>
              ))}
            </div>
          ) : repsMode === 'range' ? (
            <div className="mt-1 flex items-center gap-1">
              <Input
                type="number"
                min={1}
                max={100}
                value={exercise.repsMin}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 1;
                  onChange(index, { repsMin: val, repsMax: Math.max(val, exercise.repsMax) });
                }}
                className="h-9 w-16"
                aria-label={t('strength.exercise.repsMin')}
              />
              <span className="text-muted-foreground">–</span>
              <Input
                type="number"
                min={exercise.repsMin}
                max={100}
                value={exercise.repsMax}
                onChange={(e) =>
                  onChange(index, { repsMax: parseInt(e.target.value) || exercise.repsMin })
                }
                className="h-9 w-16"
                aria-label={t('strength.exercise.repsMax')}
              />
            </div>
          ) : (
            <Input
              type="number"
              min={1}
              max={100}
              value={exercise.repsMin}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 1;
                onChange(index, { repsMin: val, repsMax: val });
              }}
              className="mt-1 h-9 w-16"
              aria-label={t('strength.exercise.reps')}
            />
          )}
        </div>
      </div>

      {/* Load unit toggle */}
      <div className="mt-2 flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{t('strength.exercise.loadUnit')}:</span>
        <div className="flex overflow-hidden rounded-md border text-xs">
          {(['kg', 'sec'] as const).map((unit) => (
            <button
              key={unit}
              type="button"
              onClick={() => onChange(index, { loadUnit: unit })}
              className={cn(
                'px-2.5 py-1 font-medium transition-colors',
                exercise.loadUnit === unit
                  ? 'bg-foreground text-background'
                  : 'bg-background text-muted-foreground hover:bg-accent',
              )}
            >
              {unit}
            </button>
          ))}
        </div>
      </div>

      {/* Video URL */}
      <div className="mt-2">
        {showVideo ? (
          <div className="flex items-center gap-2">
            <Input
              type="url"
              value={exercise.videoUrl}
              onChange={(e) => onChange(index, { videoUrl: e.target.value })}
              placeholder="https://..."
              aria-label={t('strength.exercise.videoUrl')}
              className={cn('h-8 flex-1 text-sm', !videoIsValid && 'border-destructive')}
            />
            {exercise.videoUrl && videoIsValid && (
              <a
                href={exercise.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground"
                aria-label="Open video"
              >
                <ExternalLink className="size-4" />
              </a>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowVideo(true)}
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            {t('strength.exercise.addVideo')}
          </button>
        )}
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// VariantForm
// ---------------------------------------------------------------------------

interface VariantFormProps {
  initial?: StrengthVariant;
  onSave: (data: { name: string; description: string; exercises: FormExercise[] }) => void;
  onCancel?: () => void;
  isSaving?: boolean;
  hideActions?: boolean;
  className?: string;
}

export function VariantForm({
  initial,
  onSave,
  onCancel,
  isSaving,
  hideActions,
  className,
}: VariantFormProps) {
  const { t } = useTranslation('training');

  const [name, setName] = useState(() => initial?.name ?? '');
  const [description, setDescription] = useState(() => initial?.description ?? '');
  const [exercises, setExercises] = useState<FormExercise[]>(() =>
    initial?.exercises.length ? convertToFormExercises(initial.exercises) : [createEmptyExercise()],
  );
  const [links, setLinks] = useState<boolean[]>(() =>
    initial?.exercises.length ? initLinks(initial.exercises) : [],
  );

  const nameInputRef = useRef<HTMLInputElement>(null);
  const exerciseNameRefs = useRef<Map<number, HTMLInputElement | null>>(new Map());

  const handleExerciseChange = useCallback((index: number, updated: Partial<FormExercise>) => {
    setExercises((prev) =>
      prev.map((ex, i) => {
        if (i !== index) return ex;
        const merged = { ...ex, ...updated };
        // Sync perSetReps array length when sets changes
        if ('sets' in updated && merged.perSetReps) {
          const target = merged.sets;
          const arr = [...merged.perSetReps];
          if (arr.length < target) {
            const last = arr[arr.length - 1] ?? { repsMin: merged.repsMin, repsMax: merged.repsMax };
            while (arr.length < target) arr.push({ ...last });
          } else if (arr.length > target) {
            arr.length = target;
          }
          merged.perSetReps = arr;
        }
        return merged;
      }),
    );
  }, []);

  const handleAddExercise = useCallback(() => {
    setExercises((prev) => [...prev, createEmptyExercise()]);
    setLinks((prev) => [...prev, false]);
    requestAnimationFrame(() => {
      setExercises((current) => {
        const newIndex = current.length - 1;
        const input = exerciseNameRefs.current.get(newIndex);
        input?.focus();
        return current;
      });
    });
  }, []);

  const handleRemoveExercise = useCallback((index: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== index));
    setLinks((prev) => removeLinkForExercise(prev, index));
  }, []);

  const handleMoveUp = useCallback((index: number) => {
    if (index === 0) return;
    setExercises((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }, []);

  const handleMoveDown = useCallback((index: number) => {
    setExercises((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }, []);

  const handleToggleLink = useCallback((index: number) => {
    setLinks((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  }, []);

  const handleNameKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (index === exercises.length - 1) {
          handleAddExercise();
        } else {
          const next = exerciseNameRefs.current.get(index + 1);
          next?.focus();
        }
      }
    },
    [exercises.length, handleAddExercise],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const supersetGroups = computeSupersetGroups(links, exercises.length);
    const exercisesWithGroups = exercises.map((ex, i) => ({
      ...ex,
      supersetGroup: supersetGroups[i],
    }));
    onSave({ name: name.trim(), description: description.trim(), exercises: exercisesWithGroups });
  };

  // Compute live superset group IDs for coloring during editing
  const displayGroups = computeSupersetGroups(links, exercises.length);

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-6', className)}>
      {/* Variant name */}
      <div className="space-y-1.5">
        <Label htmlFor="variant-name">{t('strength.variant.name')}</Label>
        <Input
          id="variant-name"
          ref={nameInputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('strength.variant.name')}
          required
          autoFocus={!initial}
          className="text-base"
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="variant-desc">{t('strength.variant.description')}</Label>
        <Input
          id="variant-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional notes about this template..."
        />
      </div>

      {/* Exercise list */}
      <div className="space-y-3">
        <Label>{t('strength.exercises')}</Label>
        <div className="space-y-1">
          {exercises.map((ex, i) => {
            const groupId = displayGroups[i];
            const connectorGroupId = links[i] ? (displayGroups[i] ?? displayGroups[i + 1]) : null;
            const connectorColor =
              connectorGroupId !== null ? getSupersetColor(connectorGroupId!) : null;

            return (
              <Fragment key={i}>
                <ExerciseRow
                  exercise={ex}
                  index={i}
                  total={exercises.length}
                  supersetGroupId={groupId}
                  nameRef={
                    {
                      current: exerciseNameRefs.current.get(i) ?? null,
                    } as React.RefObject<HTMLInputElement | null>
                  }
                  onChange={handleExerciseChange}
                  onRemove={handleRemoveExercise}
                  onMoveUp={handleMoveUp}
                  onMoveDown={handleMoveDown}
                  onNameKeyDown={handleNameKeyDown}
                />
                {i < exercises.length - 1 && (
                  <button
                    type="button"
                    onClick={() => handleToggleLink(i)}
                    className={cn(
                      'ml-4 flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium transition-colors',
                      links[i] && connectorColor
                        ? connectorColor.button
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <Link2 className="size-3" />
                    {links[i] ? t('strength.superset.unlink') : t('strength.superset.link')}
                  </button>
                )}
              </Fragment>
            );
          })}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={handleAddExercise}>
          <Plus className="mr-1.5 size-4" />
          Add exercise
        </Button>
      </div>

      {/* Actions */}
      {!hideActions && (
        <div className="flex gap-2">
          <Button type="submit" disabled={isSaving || !name.trim()}>
            {isSaving ? 'Saving…' : 'Save'}
          </Button>
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      )}
    </form>
  );
}
