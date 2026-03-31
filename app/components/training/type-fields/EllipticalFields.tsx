import { useTranslation } from 'react-i18next';
import { Input } from '~/components/ui/input';
import type { EllipticalData } from '~/types/training';

interface EllipticalFieldsProps {
  data: Partial<EllipticalData>;
  onChange: (data: Partial<EllipticalData>) => void;
}

export function EllipticalFields({ data, onChange }: EllipticalFieldsProps) {
  const { t } = useTranslation('training');

  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-medium">{t('elliptical.hrZone')}</label>
        <Input
          type="number"
          min={1}
          max={5}
          placeholder="1-5"
          value={data.hr_zone ?? ''}
          onChange={(e) =>
            onChange({
              ...data,
              hr_zone: e.target.value
                ? (parseInt(e.target.value) as EllipticalData['hr_zone'])
                : undefined,
            })
          }
        />
      </div>
      <div>
        <label className="text-sm font-medium">{t('elliptical.resistanceLevel')}</label>
        <Input
          type="number"
          min={1}
          placeholder="1-20"
          value={data.resistance_level ?? ''}
          onChange={(e) =>
            onChange({
              ...data,
              resistance_level: e.target.value ? parseInt(e.target.value) : undefined,
            })
          }
        />
      </div>
      <div>
        <label className="text-sm font-medium">{t('elliptical.inclineLevel')}</label>
        <Input
          type="number"
          min={0}
          placeholder="0-10"
          value={data.incline_level ?? ''}
          onChange={(e) =>
            onChange({
              ...data,
              incline_level: e.target.value ? parseInt(e.target.value) : undefined,
            })
          }
        />
      </div>
    </div>
  );
}
