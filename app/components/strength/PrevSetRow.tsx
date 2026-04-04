import { useTranslation } from 'react-i18next';
import { cn } from '~/lib/utils';
import type { LoadUnit } from '~/types/training';

interface PrevSetRowProps {
  reps: number | null;
  load: number | null;
  loadUnit: LoadUnit;
  isTopSetOnly?: boolean;
  colSpan?: number;
  className?: string;
  'data-testid'?: string;
}

export function PrevSetRow({
  reps,
  load,
  loadUnit,
  isTopSetOnly = false,
  className,
  'data-testid': testId,
}: PrevSetRowProps) {
  const { t } = useTranslation('training');
  const unit = loadUnit === 'sec' ? 's' : 'kg';

  const hasData = reps != null || load != null;

  return (
    <div
      data-testid={testId}
      className={cn(
        'col-span-full pb-0.5 pl-[calc(2.5rem+0.5rem)] text-xs text-muted-foreground',
        className,
      )}
    >
      {hasData ? (
        <>
          {t('strength.logger.prev')} {reps != null ? reps : t('strength.logger.prevNone')}{' '}
          {t('strength.logger.reps')}
          {' · '}
          {load != null ? `${load} ${unit}` : t('strength.logger.prevNone')}
          {isTopSetOnly && (
            <span className="ml-1 text-muted-foreground/60">{t('strength.logger.prevTopSet')}</span>
          )}
        </>
      ) : (
        <>
          {t('strength.logger.prev')} {t('strength.logger.prevNone')}
        </>
      )}
    </div>
  );
}
