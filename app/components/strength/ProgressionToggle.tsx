import { ArrowUp, Minus, ArrowDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '~/lib/utils';
import type { ProgressionIntent } from '~/types/training';

interface ProgressionToggleProps {
  value: ProgressionIntent | null;
  onChange: (v: ProgressionIntent | null) => void;
  readOnly?: boolean;
  className?: string;
}

const ACTIVE_STYLES: Record<ProgressionIntent, string> = {
  up: 'bg-green-500 text-white',
  maintain: 'bg-blue-500 text-white',
  down: 'bg-amber-500 text-white',
};

const BADGE_STYLES: Record<ProgressionIntent, string> = {
  up: 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400',
  maintain: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
  down: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
};

export function ProgressionToggle({
  value,
  onChange,
  readOnly = false,
  className,
}: ProgressionToggleProps) {
  const { t } = useTranslation('training');

  const options = [
    {
      intent: 'up' as ProgressionIntent,
      Icon: ArrowUp,
      label: t('strength.progression.up'),
      shortLabel: t('strength.progression.upShort'),
    },
    {
      intent: 'maintain' as ProgressionIntent,
      Icon: Minus,
      label: t('strength.progression.maintain'),
      shortLabel: t('strength.progression.maintainShort'),
    },
    {
      intent: 'down' as ProgressionIntent,
      Icon: ArrowDown,
      label: t('strength.progression.down'),
      shortLabel: t('strength.progression.downShort'),
    },
  ];

  if (readOnly) {
    const active = options.find((o) => o.intent === value);
    if (!active) return null;
    return (
      <span
        title={active.label}
        className={cn(
          'inline-flex size-6 items-center justify-center rounded-full',
          BADGE_STYLES[active.intent],
          className,
        )}
      >
        <active.Icon className="size-3" />
      </span>
    );
  }

  return (
    <div
      className={cn(
        'inline-flex divide-x divide-border overflow-hidden rounded border border-input',
        className,
      )}
      role="group"
      aria-label={t('strength.progression.hint')}
    >
      {options.map(({ intent, Icon, label, shortLabel }) => {
        const isActive = value === intent;
        return (
          <button
            key={intent}
            type="button"
            aria-label={label}
            aria-pressed={isActive}
            onClick={() => onChange(isActive ? null : intent)}
            className={cn(
              'inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium transition-colors',
              isActive
                ? ACTIVE_STYLES[intent]
                : 'bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            <Icon className="size-3 shrink-0" />
            {shortLabel}
          </button>
        );
      })}
    </div>
  );
}
