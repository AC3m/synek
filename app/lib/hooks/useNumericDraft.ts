import { useEffect, useState } from 'react';

interface NumericDraftOptions {
  min?: number;
  max?: number;
}

/**
 * Manages draft string state for a single controlled numeric input, allowing
 * the field to be temporarily empty while the user is typing before committing
 * the parsed value on blur.
 *
 * - `min`/`max` options clamp the committed value silently.
 * - Draft resets automatically when `value` changes from outside (e.g., a mode
 *   switch in the parent that updates the underlying prop).
 *
 * Usage:
 *   const draft = useNumericDraft(value, (v) => onChange(v), fallback, { min: 1, max: 20 });
 *   <Input value={draft.value} onChange={draft.onChange} onBlur={draft.onBlur} />
 */
export function useNumericDraft(
  value: number,
  onCommit: (value: number) => void,
  fallback: number,
  options?: NumericDraftOptions,
) {
  const [draft, setDraft] = useState<string | null>(null);

  // Reset stale draft when the prop value changes from outside.
  useEffect(() => {
    setDraft(null);
  }, [value]);

  return {
    value: draft ?? String(value),
    onChange(e: React.ChangeEvent<HTMLInputElement>) {
      setDraft(e.target.value);
    },
    onBlur() {
      if (draft !== null) {
        const raw = parseInt(draft);
        let committed = isNaN(raw) ? fallback : raw;
        if (options?.min !== undefined) committed = Math.max(options.min, committed);
        if (options?.max !== undefined) committed = Math.min(options.max, committed);
        onCommit(committed);
        setDraft(null);
      }
    },
  };
}

/**
 * Manages draft string state for an array of per-set {repsMin, repsMax} pairs,
 * using the same temporary-empty-state pattern as useNumericDraft.
 *
 * - `getDisplay(i)` returns the current display strings for set i.
 * - `updateMin/Max/Both` update the draft for set i on input change.
 * - `commit()` clears the drafts (call alongside the parent onCommit in onBlur,
 *   so React batches both state updates into a single render).
 *
 * Drafts also auto-reset via useEffect when `perSetReps` changes from outside
 * (e.g., sets count change, reps mode switch).
 */
export function usePerSetRepsDraft(
  perSetReps: Array<{ repsMin: number; repsMax: number }> | null,
) {
  const [drafts, setDrafts] = useState<Array<{ min: string; max: string }> | null>(null);

  useEffect(() => {
    setDrafts(null);
  }, [perSetReps]);

  function fromProps(): Array<{ min: string; max: string }> {
    return (perSetReps ?? []).map((r) => ({ min: String(r.repsMin), max: String(r.repsMax) }));
  }

  function getDisplay(setIdx: number): { min: string; max: string } {
    if (drafts) return drafts[setIdx] ?? { min: '', max: '' };
    const rep = perSetReps?.[setIdx];
    return { min: String(rep?.repsMin ?? ''), max: String(rep?.repsMax ?? '') };
  }

  function updateMin(setIdx: number, value: string) {
    setDrafts((prev) => (prev ?? fromProps()).map((d, j) => (j === setIdx ? { ...d, min: value } : d)));
  }

  function updateMax(setIdx: number, value: string) {
    setDrafts((prev) => (prev ?? fromProps()).map((d, j) => (j === setIdx ? { ...d, max: value } : d)));
  }

  function updateBoth(setIdx: number, value: string) {
    setDrafts((prev) => (prev ?? fromProps()).map((d, j) => (j === setIdx ? { min: value, max: value } : d)));
  }

  function commit() {
    setDrafts(null);
  }

  return { getDisplay, updateMin, updateMax, updateBoth, commit };
}
