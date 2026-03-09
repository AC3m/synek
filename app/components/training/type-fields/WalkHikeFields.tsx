import { useTranslation } from 'react-i18next';
import { Input } from '~/components/ui/input';
import { cn } from '~/lib/utils';
import type { WalkData, HikeData } from '~/types/training';

type WalkHikeData = WalkData | HikeData;

interface WalkHikeFieldsProps {
  data: Partial<WalkHikeData>;
  onChange: (data: Partial<WalkHikeData>) => void;
  className?: string;
}

export function WalkHikeFields({ data, onChange, className }: WalkHikeFieldsProps) {
  const { t } = useTranslation('training');

  const terrainOptions = ['road', 'trail', 'urban'] as const;

  return (
    <div className={cn('space-y-3', className)}>
      <div>
        <label className="text-sm font-medium">{t('walkHike.terrain')}</label>
        <div className="mt-1 flex flex-wrap gap-2">
          {terrainOptions.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange({ ...data, terrain: opt })}
              className={cn(
                'rounded-md border px-3 py-1 text-sm',
                data.terrain === opt
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background hover:bg-muted'
              )}
            >
              {t(`walkHike.terrainOptions.${opt}`)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">{t('walkHike.elevationGain')}</label>
        <Input
          type="number"
          min={0}
          placeholder="0"
          value={data.elevation_gain_m ?? ''}
          onChange={(e) =>
            onChange({
              ...data,
              elevation_gain_m: e.target.value ? Number(e.target.value) : undefined,
            })
          }
        />
      </div>
    </div>
  );
}
