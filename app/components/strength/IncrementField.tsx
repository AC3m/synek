import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '~/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '~/components/ui/collapsible';
import { Input } from '~/components/ui/input';
import type { LoadUnit } from '~/types/training';

interface IncrementFieldProps {
  value: number | null;
  loadUnit: LoadUnit;
  onChange: (value: number | null) => void;
  disabled?: boolean;
}

export function IncrementField({ value, loadUnit, onChange, disabled = false }: IncrementFieldProps) {
  const { t } = useTranslation('training');
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value?.toString() ?? '');

  const unit = loadUnit === 'sec' ? 's' : 'kg';
  const label =
    loadUnit === 'sec'
      ? t('strength.exercise.durationIncrement')
      : t('strength.exercise.incrementLabel');

  function handleBlur() {
    const parsed = parseFloat(inputValue);
    if (isNaN(parsed) || parsed <= 0) {
      onChange(null);
      setInputValue('');
    } else {
      onChange(parsed);
    }
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      {value != null && (
        <div data-testid="increment-chip" className="mb-1 text-xs text-muted-foreground">
          {t('strength.exercise.incrementChip', { value, unit })}
        </div>
      )}
      <CollapsibleTrigger
        disabled={disabled}
        className={cn(
          'flex min-h-[44px] w-full items-center justify-between gap-2 text-xs text-muted-foreground hover:text-foreground',
          disabled && 'cursor-not-allowed opacity-50',
        )}
        aria-label={t('strength.exercise.advancedToggle')}
      >
        <span>{t('strength.exercise.advancedToggle')}</span>
        <ChevronDown
          className={cn('size-3.5 transition-transform', open && 'rotate-180')}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 space-y-1">
          <label className="text-xs text-muted-foreground">{label}</label>
          <div className="relative">
            <Input
              type="number"
              min={0}
              step={loadUnit === 'sec' ? 1 : 0.5}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onBlur={handleBlur}
              disabled={disabled}
              className="h-8 pr-7 text-sm"
            />
            <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-xs text-muted-foreground">
              {unit}
            </span>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
