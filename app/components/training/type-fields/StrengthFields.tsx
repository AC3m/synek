import { useTranslation } from 'react-i18next';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import type { StrengthData, Exercise } from '~/types/training';

interface StrengthFieldsProps {
  data: Partial<StrengthData>;
  onChange: (data: Partial<StrengthData>) => void;
}

export function StrengthFields({ data, onChange }: StrengthFieldsProps) {
  const { t } = useTranslation('training');
  const exercises = data.exercises ?? [];

  const addExercise = () => {
    onChange({
      ...data,
      exercises: [...exercises, { name: '' }],
    });
  };

  const updateExercise = (index: number, updates: Partial<Exercise>) => {
    const updated = [...exercises];
    updated[index] = { ...updated[index], ...updates };
    onChange({ ...data, exercises: updated });
  };

  const removeExercise = (index: number) => {
    onChange({
      ...data,
      exercises: exercises.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-medium">{t('strength.muscleGroups')}</label>
        <Input
          placeholder="e.g. legs, core, upper body"
          value={(data.muscle_groups ?? []).join(', ')}
          onChange={(e) =>
            onChange({
              ...data,
              muscle_groups: e.target.value
                ? e.target.value.split(',').map((s) => s.trim())
                : undefined,
            })
          }
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium">{t('strength.exercises')}</label>
          <Button variant="ghost" size="sm" onClick={addExercise}>
            <Plus className="h-3 w-3 mr-1" />
            {t('strength.exercise.name')}
          </Button>
        </div>

        {exercises.map((ex, i) => (
          <div
            key={i}
            className="border rounded-md p-2 mb-2 space-y-2"
          >
            <div className="flex items-center gap-2">
              <Input
                placeholder={t('strength.exercise.name')}
                value={ex.name}
                onChange={(e) => updateExercise(i, { name: e.target.value })}
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive"
                onClick={() => removeExercise(i)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">
                  {t('strength.exercise.sets')}
                </label>
                <Input
                  type="number"
                  value={ex.sets ?? ''}
                  onChange={(e) =>
                    updateExercise(i, {
                      sets: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">
                  {t('strength.exercise.reps')}
                </label>
                <Input
                  value={ex.reps ?? ''}
                  onChange={(e) =>
                    updateExercise(i, {
                      reps: e.target.value || undefined,
                    })
                  }
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">
                  {t('strength.exercise.weight')}
                </label>
                <Input
                  type="number"
                  step="0.5"
                  value={ex.weight_kg ?? ''}
                  onChange={(e) =>
                    updateExercise(i, {
                      weight_kg: e.target.value
                        ? parseFloat(e.target.value)
                        : undefined,
                    })
                  }
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">
                  {t('strength.exercise.rest')}
                </label>
                <Input
                  type="number"
                  value={ex.rest_seconds ?? ''}
                  onChange={(e) =>
                    updateExercise(i, {
                      rest_seconds: e.target.value
                        ? parseInt(e.target.value)
                        : undefined,
                    })
                  }
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
