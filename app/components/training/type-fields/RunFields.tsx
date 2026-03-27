import { useTranslation } from 'react-i18next';
import { Input } from '~/components/ui/input';
import type { RunData } from '~/types/training';

interface RunFieldsProps {
  data: Partial<RunData>;
  onChange: (data: Partial<RunData>) => void;
}

export function RunFields({ data, onChange }: RunFieldsProps) {
  const { t } = useTranslation('training');

  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-medium">{t('run.hrZone')}</label>
        <Input
          type="number"
          min={1}
          max={5}
          placeholder="1-5"
          value={data.hr_zone ?? ''}
          onChange={(e) =>
            onChange({
              ...data,
              hr_zone: e.target.value ? parseInt(e.target.value) : undefined,
            })
          }
        />
      </div>
      <div>
        <label className="text-sm font-medium">{t('run.terrain')}</label>
        <select
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
          value={data.terrain ?? ''}
          onChange={(e) =>
            onChange({
              ...data,
              terrain: (e.target.value || undefined) as RunData['terrain'],
            })
          }
        >
          <option value="">-</option>
          {(['road', 'trail', 'track', 'treadmill'] as const).map((opt) => (
            <option key={opt} value={opt}>
              {t(`run.terrainOptions.${opt}`)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-sm font-medium">{t('run.elevationGain')}</label>
        <Input
          type="number"
          placeholder="0"
          value={data.elevation_gain_m ?? ''}
          onChange={(e) =>
            onChange({
              ...data,
              elevation_gain_m: e.target.value ? parseInt(e.target.value) : undefined,
            })
          }
        />
      </div>
    </div>
  );
}
