import { useTranslation } from 'react-i18next';
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import type { SwimmingData } from '~/types/training';

interface SwimmingFieldsProps {
  data: Partial<SwimmingData>;
  onChange: (data: Partial<SwimmingData>) => void;
}

export function SwimmingFields({ data, onChange }: SwimmingFieldsProps) {
  const { t } = useTranslation('training');

  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-medium">{t('swimming.laps')}</label>
        <Input
          type="number"
          placeholder="0"
          value={data.laps ?? ''}
          onChange={(e) =>
            onChange({
              ...data,
              laps: e.target.value ? parseInt(e.target.value) : undefined,
            })
          }
        />
      </div>
      <div>
        <label className="text-sm font-medium">{t('swimming.poolLength')}</label>
        <Input
          type="number"
          placeholder="25"
          value={data.pool_length_m ?? ''}
          onChange={(e) =>
            onChange({
              ...data,
              pool_length_m: e.target.value ? parseInt(e.target.value) : undefined,
            })
          }
        />
      </div>
      <div>
        <label className="text-sm font-medium">{t('swimming.strokeType')}</label>
        <select
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
          value={data.stroke_type ?? ''}
          onChange={(e) =>
            onChange({
              ...data,
              stroke_type: (e.target.value || undefined) as SwimmingData['stroke_type'],
            })
          }
        >
          <option value="">-</option>
          {(['freestyle', 'backstroke', 'breaststroke', 'butterfly', 'mixed'] as const).map(
            (opt) => (
              <option key={opt} value={opt}>
                {t(`swimming.strokeOptions.${opt}`)}
              </option>
            ),
          )}
        </select>
      </div>
      <div>
        <label className="text-sm font-medium">{t('swimming.drillDescription')}</label>
        <Textarea
          placeholder=""
          value={data.drill_description ?? ''}
          rows={2}
          onChange={(e) =>
            onChange({
              ...data,
              drill_description: e.target.value || undefined,
            })
          }
        />
      </div>
    </div>
  );
}
