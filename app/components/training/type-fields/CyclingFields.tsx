import { useTranslation } from 'react-i18next';
import { Input } from '~/components/ui/input';
import type { CyclingData } from '~/types/training';

interface CyclingFieldsProps {
  data: Partial<CyclingData>;
  onChange: (data: Partial<CyclingData>) => void;
}

export function CyclingFields({ data, onChange }: CyclingFieldsProps) {
  const { t } = useTranslation('training');

  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-medium">{t('cycling.avgSpeedTarget')}</label>
        <Input
          type="number"
          step="0.1"
          placeholder="0"
          value={data.avg_speed_target_kmh ?? ''}
          onChange={(e) =>
            onChange({
              ...data,
              avg_speed_target_kmh: e.target.value ? parseFloat(e.target.value) : undefined,
            })
          }
        />
      </div>
      <div>
        <label className="text-sm font-medium">{t('cycling.hrZone')}</label>
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
        <label className="text-sm font-medium">{t('cycling.terrain')}</label>
        <select
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
          value={data.terrain ?? ''}
          onChange={(e) =>
            onChange({
              ...data,
              terrain: (e.target.value || undefined) as CyclingData['terrain'],
            })
          }
        >
          <option value="">-</option>
          {(['road', 'gravel', 'mtb', 'indoor'] as const).map((opt) => (
            <option key={opt} value={opt}>
              {t(`cycling.terrainOptions.${opt}`)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-sm font-medium">{t('cycling.elevationGain')}</label>
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
      <div>
        <label className="text-sm font-medium">{t('cycling.powerTarget')}</label>
        <Input
          type="number"
          placeholder="0"
          value={data.power_target_watts ?? ''}
          onChange={(e) =>
            onChange({
              ...data,
              power_target_watts: e.target.value ? parseInt(e.target.value) : undefined,
            })
          }
        />
      </div>
    </div>
  );
}
