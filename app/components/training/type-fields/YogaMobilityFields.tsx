import { useTranslation } from 'react-i18next';
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import type { YogaMobilityData } from '~/types/training';

interface YogaMobilityFieldsProps {
  data: Partial<YogaMobilityData>;
  onChange: (data: Partial<YogaMobilityData>) => void;
}

export function YogaMobilityFields({ data, onChange }: YogaMobilityFieldsProps) {
  const { t } = useTranslation('training');

  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-medium">{t('yogaMobility.focusArea')}</label>
        <Input
          placeholder="e.g. hips, shoulders, full body"
          value={data.focus_area ?? ''}
          onChange={(e) =>
            onChange({ ...data, focus_area: e.target.value || undefined })
          }
        />
      </div>
      <div>
        <label className="text-sm font-medium">{t('yogaMobility.style')}</label>
        <Input
          placeholder="e.g. Vinyasa, Yin, Hatha"
          value={data.style ?? ''}
          onChange={(e) =>
            onChange({ ...data, style: e.target.value || undefined })
          }
        />
      </div>
      <div>
        <label className="text-sm font-medium">{t('yogaMobility.poses')}</label>
        <Textarea
          placeholder="One per line"
          value={(data.poses ?? []).join('\n')}
          rows={3}
          onChange={(e) =>
            onChange({
              ...data,
              poses: e.target.value
                ? e.target.value.split('\n').filter(Boolean)
                : undefined,
            })
          }
        />
      </div>
    </div>
  );
}
