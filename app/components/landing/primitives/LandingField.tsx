import { cn } from '~/lib/utils';

const INPUT_CLASS =
  'w-full rounded-lg border border-white/12 bg-white/[0.03] px-3 py-2.5 text-[14px] text-[var(--landing-fg)] outline-none placeholder:opacity-40 focus:border-emerald-400/40 transition-colors';

interface LandingFieldProps {
  id: string;
  label: string;
  type?: React.HTMLInputTypeAttribute;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  required?: boolean;
  error?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  autoComplete?: string;
  className?: string;
}

export function LandingField({
  id,
  label,
  type = 'text',
  placeholder,
  multiline,
  rows = 4,
  required,
  error,
  value,
  onChange,
  autoComplete,
  className,
}: LandingFieldProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label htmlFor={id} className="text-[12.5px] opacity-70">
        {label}
      </label>

      {multiline ? (
        <textarea
          id={id}
          required={required}
          placeholder={placeholder}
          rows={rows}
          value={value}
          onChange={onChange as React.ChangeEventHandler<HTMLTextAreaElement>}
          className={INPUT_CLASS}
        />
      ) : (
        <input
          id={id}
          type={type}
          required={required}
          placeholder={placeholder}
          value={value}
          onChange={onChange as React.ChangeEventHandler<HTMLInputElement>}
          autoComplete={autoComplete}
          className={INPUT_CLASS}
        />
      )}

      {error ? (
        <p role="alert" className="text-[12px] text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
