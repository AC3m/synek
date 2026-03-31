import { useTranslation } from 'react-i18next';
import { Input } from '~/components/ui/input';
import type { PilatesData } from '~/types/training';

interface PilatesFieldsProps {
  data: Partial<PilatesData>;
  onChange: (data: Partial<PilatesData>) => void;
}

export function PilatesFields({ data, onChange }: PilatesFieldsProps) {
  const { t } = useTranslation('training');

  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-medium">{t('pilates.style')}</label>
        <select
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
          value={data.style ?? ''}
          onChange={(e) =>
            onChange({
              ...data,
              style: (e.target.value || undefined) as PilatesData['style'],
            })
          }
        >
          <option value="">-</option>
          {(['mat', 'reformer', 'clinical'] as const).map((opt) => (
            <option key={opt} value={opt}>
              {t(`pilates.styleOptions.${opt}`)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-sm font-medium">{t('pilates.focusArea')}</label>
        <Input
          placeholder="e.g. core, flexibility, posture"
          value={data.focus_area ?? ''}
          onChange={(e) => onChange({ ...data, focus_area: e.target.value || undefined })}
        />
      </div>
    </div>
  );
}
