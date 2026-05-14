import { useTranslation } from 'react-i18next';
import { cn } from '~/lib/utils';
import type { UserRole } from '~/lib/auth';

interface RolePickerProps {
  value: UserRole | null;
  onChange: (role: UserRole) => void;
  disabled?: boolean;
  className?: string;
}

export function RolePicker({ value, onChange, disabled, className }: RolePickerProps) {
  const { t } = useTranslation('common');
  return (
    <div className={cn('grid grid-cols-2 gap-2', className)}>
      {(['coach', 'athlete'] as const).map((role) => (
        <button
          key={role}
          type="button"
          data-testid={`role-btn-${role}`}
          disabled={disabled}
          onClick={() => onChange(role)}
          className={cn(
            'rounded-lg border px-4 py-3 text-sm font-medium transition-colors',
            value === role
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-background hover:bg-muted',
            disabled && 'cursor-not-allowed opacity-50',
          )}
        >
          {t(`roles.${role}` as never)}
        </button>
      ))}
    </div>
  );
}
