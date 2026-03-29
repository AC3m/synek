import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FormModal } from '~/components/ui/form-modal';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Textarea } from '~/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { TRAINING_TYPES } from '~/types/training';
import type { Goal, CreateGoalInput, UpdateGoalInput, TrainingType } from '~/types/training';
import { cn } from '~/lib/utils';

interface GoalDialogProps {
  open: boolean;
  onClose: () => void;
  athleteId: string;
  goal?: Goal;
  onCreate?: (input: CreateGoalInput) => void;
  onUpdate?: (input: UpdateGoalInput) => void;
  isSaving?: boolean;
  className?: string;
}

interface FormState {
  name: string;
  discipline: TrainingType;
  competitionDate: string;
  preparationWeeks: string;
  goalDistanceKm: string;
  goalTimeHh: string;
  goalTimeMm: string;
  goalTimeSs: string;
  notes: string;
}

function toSeconds(hh: string, mm: string, ss: string): number | undefined {
  const h = parseInt(hh, 10) || 0;
  const m = parseInt(mm, 10) || 0;
  const s = parseInt(ss, 10) || 0;
  const total = h * 3600 + m * 60 + s;
  return total > 0 ? total : undefined;
}

function fromSeconds(seconds: number | null): { hh: string; mm: string; ss: string } {
  if (!seconds) return { hh: '', mm: '', ss: '' };
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return {
    hh: h > 0 ? String(h) : '',
    mm: String(m).padStart(h > 0 ? 2 : 1, '0'),
    ss: String(s).padStart(2, '0'),
  };
}

const DEFAULT_FORM_STATE: FormState = {
  name: '',
  discipline: 'run',
  competitionDate: '',
  preparationWeeks: '8',
  goalDistanceKm: '',
  goalTimeHh: '',
  goalTimeMm: '',
  goalTimeSs: '',
  notes: '',
};

export function GoalDialog({
  open,
  onClose,
  athleteId,
  goal,
  onCreate,
  onUpdate,
  isSaving,
  className,
}: GoalDialogProps) {
  const { t } = useTranslation('training');

  const [form, setForm] = useState<FormState>(DEFAULT_FORM_STATE);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  useEffect(() => {
    if (goal) {
      const time = fromSeconds(goal.goalTimeSeconds);
      setForm({
        name: goal.name,
        discipline: goal.discipline,
        competitionDate: goal.competitionDate,
        preparationWeeks: String(goal.preparationWeeks),
        goalDistanceKm: goal.goalDistanceKm != null ? String(goal.goalDistanceKm) : '',
        goalTimeHh: time.hh,
        goalTimeMm: time.mm,
        goalTimeSs: time.ss,
        notes: goal.notes ?? '',
      });
    } else {
      setForm(DEFAULT_FORM_STATE);
    }
    setErrors({});
  }, [open, goal]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate(): boolean {
    const next: typeof errors = {};
    if (!form.name.trim()) next.name = t('goal.validation.required');
    if (!form.competitionDate) next.competitionDate = t('goal.validation.required');
    const weeks = parseInt(form.preparationWeeks, 10);
    if (isNaN(weeks) || weeks < 0 || weeks > 52)
      next.preparationWeeks = t('goal.validation.prepWeeksRange');
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSave() {
    if (!validate()) return;

    const preparationWeeks = parseInt(form.preparationWeeks, 10);
    const goalDistanceKm = form.goalDistanceKm ? parseFloat(form.goalDistanceKm) : undefined;
    const goalTimeSeconds = toSeconds(form.goalTimeHh, form.goalTimeMm, form.goalTimeSs);
    const notes = form.notes.trim() || undefined;

    if (goal) {
      onUpdate?.({
        id: goal.id,
        name: form.name.trim(),
        discipline: form.discipline,
        competitionDate: form.competitionDate,
        preparationWeeks,
        goalDistanceKm: goalDistanceKm ?? null,
        goalTimeSeconds: goalTimeSeconds ?? null,
        notes: notes ?? null,
      });
    } else {
      onCreate?.({
        athleteId,
        name: form.name.trim(),
        discipline: form.discipline,
        competitionDate: form.competitionDate,
        preparationWeeks,
        goalDistanceKm,
        goalTimeSeconds,
        notes,
      });
    }
  }

  const title = goal ? t('goal.edit') : t('goal.create');

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={title}
      onSave={handleSave}
      isSaving={isSaving}
      className={className}
    >
      <div className="flex flex-col gap-4">
        {/* Name */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="goal-name">{t('goal.name')}</Label>
          <Input
            id="goal-name"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder={t('goal.namePlaceholder')}
            className={cn(errors.name && 'border-destructive')}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
        </div>

        {/* Discipline */}
        <div className="flex flex-col gap-1.5">
          <Label>{t('goal.discipline')}</Label>
          <Select
            value={form.discipline}
            onValueChange={(v) => set('discipline', v as TrainingType)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRAINING_TYPES.filter((t) => t !== 'rest_day').map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Competition Date */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="goal-date">{t('goal.competitionDate')}</Label>
          <Input
            id="goal-date"
            type="date"
            value={form.competitionDate}
            onChange={(e) => set('competitionDate', e.target.value)}
            className={cn(errors.competitionDate && 'border-destructive')}
          />
          {errors.competitionDate && (
            <p className="text-xs text-destructive">{errors.competitionDate}</p>
          )}
        </div>

        {/* Preparation Weeks */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="goal-prep-weeks">{t('goal.preparationWeeks')}</Label>
          <Input
            id="goal-prep-weeks"
            type="number"
            min={0}
            max={52}
            value={form.preparationWeeks}
            onChange={(e) => set('preparationWeeks', e.target.value)}
            className={cn(errors.preparationWeeks && 'border-destructive')}
          />
          {errors.preparationWeeks && (
            <p className="text-xs text-destructive">{errors.preparationWeeks}</p>
          )}
        </div>

        {/* Goal Distance */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="goal-distance">{t('goal.goalDistance')}</Label>
          <Input
            id="goal-distance"
            type="number"
            min={0}
            step={0.1}
            value={form.goalDistanceKm}
            onChange={(e) => set('goalDistanceKm', e.target.value)}
            placeholder={t('goal.placeholder.distance')}
          />
        </div>

        {/* Goal Time */}
        <div className="flex flex-col gap-1.5">
          <Label>{t('goal.goalTime')}</Label>
          <div className="flex items-center gap-1">
            <Input
              type="number"
              min={0}
              max={23}
              placeholder="hh"
              value={form.goalTimeHh}
              onChange={(e) => set('goalTimeHh', e.target.value)}
              className="w-16 text-center"
            />
            <span className="text-muted-foreground">:</span>
            <Input
              type="number"
              min={0}
              max={59}
              placeholder="mm"
              value={form.goalTimeMm}
              onChange={(e) => set('goalTimeMm', e.target.value)}
              className="w-16 text-center"
            />
            <span className="text-muted-foreground">:</span>
            <Input
              type="number"
              min={0}
              max={59}
              placeholder="ss"
              value={form.goalTimeSs}
              onChange={(e) => set('goalTimeSs', e.target.value)}
              className="w-16 text-center"
            />
          </div>
        </div>

        {/* Notes */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="goal-notes">{t('goal.notes')}</Label>
          <Textarea
            id="goal-notes"
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder={t('goal.notesPlaceholder')}
            rows={3}
          />
        </div>
      </div>
    </FormModal>
  );
}
