import { useTranslation } from 'react-i18next';
import { Link2 } from 'lucide-react';

export function StravaDataPlaceholder() {
  const { t } = useTranslation('athlete');

  return (
    <div className="mt-1.5 rounded border border-dashed p-1.5 bg-muted/20">
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <Link2 className="h-2.5 w-2.5" />
        <span className="font-medium">{t('strava.comingSoon')}</span>
      </div>
      <p className="text-[9px] text-muted-foreground mt-0.5">
        {t('strava.connectHint')}
      </p>
    </div>
  );
}
