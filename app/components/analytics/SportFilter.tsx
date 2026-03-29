import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { trainingTypeConfig, iconMap } from '~/lib/utils/training-types';
import { cn } from '~/lib/utils';
import type { TrainingType } from '~/types/training';

const ALL_SPORTS = '__all__' as const;
const SPORT_OPTIONS: TrainingType[] = [
  'run',
  'cycling',
  'swimming',
  'strength',
  'yoga',
  'mobility',
  'walk',
  'hike',
  'other',
];

interface SportFilterProps {
  namespace: 'coach' | 'athlete';
  value: TrainingType | undefined;
  onChange: (value: TrainingType | undefined) => void;
  className?: string;
}

export function SportFilter({ namespace, value, onChange, className }: SportFilterProps) {
  const { t } = useTranslation([namespace, 'common']);

  const selectValue = value ?? ALL_SPORTS;

  const handleChange = (v: string) => {
    onChange(v === ALL_SPORTS ? undefined : (v as TrainingType));
  };

  const config = value ? trainingTypeConfig[value] : null;
  const Icon = config ? iconMap[config.icon] : null;

  return (
    <Select value={selectValue} onValueChange={handleChange}>
      <SelectTrigger className={cn('h-8 w-auto min-w-[140px] text-xs', className)}>
        <SelectValue>
          {config && Icon ? (
            <span className="flex items-center gap-1.5">
              <Icon className={cn('h-3 w-3', config.color)} />
              <span>{t(`common:trainingTypes.${value}` as never)}</span>
            </span>
          ) : (
            t(`${namespace}:analytics.filter.allSports` as never)
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_SPORTS} className="text-xs">
          {t(`${namespace}:analytics.filter.allSports` as never)}
        </SelectItem>
        {SPORT_OPTIONS.map((sport) => {
          const cfg = trainingTypeConfig[sport];
          const SportIcon = iconMap[cfg.icon];
          return (
            <SelectItem key={sport} value={sport} className="text-xs">
              <span className="flex items-center gap-1.5">
                {SportIcon && <SportIcon className={cn('h-3 w-3', cfg.color)} />}
                <span>{t(`common:trainingTypes.${sport}` as never)}</span>
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
