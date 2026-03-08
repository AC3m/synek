import { useTranslation } from 'react-i18next';
import { Textarea } from '~/components/ui/textarea';
import type { RestDayData } from '~/types/training';

interface RestDayFieldsProps {
  data: Partial<RestDayData>;
  onChange: (data: Partial<RestDayData>) => void;
}

export function RestDayFields({ data, onChange }: RestDayFieldsProps) {
  const { t } = useTranslation('training');

  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-medium">
          {t('restDay.activitySuggestion')}
        </label>
        <Textarea
          placeholder="e.g. Light walk, stretching, foam rolling"
          value={data.activity_suggestion ?? ''}
          rows={2}
          onChange={(e) =>
            onChange({
              ...data,
              activity_suggestion: e.target.value || undefined,
            })
          }
        />
      </div>
    </div>
  );
}
