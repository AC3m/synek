import { cn } from '~/lib/utils';

interface Option<T extends string> {
  readonly value: T;
  readonly label: string;
}

type Variant = 'dark' | 'auto';

interface SegmentedToggleProps<T extends string> {
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  label?: string;
  variant?: Variant;
  className?: string;
}

const CONTAINER: Record<Variant, string> = {
  dark: 'border border-white/10 bg-white/[0.04]',
  auto: 'border border-border bg-muted',
};

const ACTIVE_BTN: Record<Variant, string> = {
  dark: 'bg-white text-black shadow-[0_1px_0_rgba(0,0,0,0.1)]',
  auto: 'bg-background text-foreground shadow-sm',
};

const INACTIVE_BTN: Record<Variant, string> = {
  dark: 'text-white/70 hover:text-white',
  auto: 'text-muted-foreground hover:text-foreground',
};

export function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
  label,
  variant = 'dark',
  className,
}: SegmentedToggleProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        'inline-flex items-center rounded-md p-0.5 text-[11px] font-semibold',
        CONTAINER[variant],
        className,
      )}
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => {
              if (!active) onChange(opt.value);
            }}
            className={cn(
              'rounded-sm px-2 py-1 tracking-wide transition-colors',
              active ? ACTIVE_BTN[variant] : INACTIVE_BTN[variant],
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
