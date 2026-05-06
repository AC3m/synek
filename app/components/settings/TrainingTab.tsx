import { useTranslation } from 'react-i18next';
import { Switch } from '~/components/ui/switch';
import { useTrainingPreferences } from '~/lib/hooks/useTrainingPreferences';

export function TrainingTab() {
  const { t } = useTranslation('common');
  const { preferences, update } = useTrainingPreferences();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          {t('settings.training.strengthSection')}
        </p>
        <div className="mt-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">{t('settings.training.adjustSets')}</p>
            <p className="text-xs text-muted-foreground">{t('settings.training.adjustSetsSub')}</p>
          </div>
          <Switch
            checked={preferences.allowSetAdjustment}
            onCheckedChange={(checked) => update({ allowSetAdjustment: checked })}
            aria-label={t('settings.training.adjustSets')}
          />
        </div>
      </div>
    </div>
  );
}
