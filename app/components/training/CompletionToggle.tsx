import { useTranslation } from 'react-i18next';
import { Checkbox } from '~/components/ui/checkbox';
import { CheckCircle2 } from 'lucide-react';

interface CompletionToggleProps {
  isCompleted: boolean;
  onChange: (completed: boolean) => void;
}

export function CompletionToggle({ isCompleted, onChange }: CompletionToggleProps) {
  const { t } = useTranslation('athlete');

  return (
    <label className="flex items-center gap-1.5 cursor-pointer group/toggle">
      <Checkbox
        checked={isCompleted}
        onCheckedChange={(checked) => onChange(checked === true)}
        className="h-3.5 w-3.5"
      />
      <span
        className={`text-[10px] font-medium transition-colors ${
          isCompleted
            ? 'text-green-700'
            : 'text-muted-foreground group-hover/toggle:text-foreground'
        }`}
      >
        {isCompleted ? (
          <span className="flex items-center gap-0.5">
            <CheckCircle2 className="h-2.5 w-2.5" />
            {t('completion.completed')}
          </span>
        ) : (
          t('completion.markComplete')
        )}
      </span>
    </label>
  );
}
