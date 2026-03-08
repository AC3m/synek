import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '~/components/ui/button';
import {
  getNextWeekId,
  getPrevWeekId,
  getWeekDateRange,
  getCurrentWeekId,
  parseWeekId,
} from '~/lib/utils/date';

interface WeekNavigationProps {
  weekId: string;
  basePath: 'coach' | 'trainee';
}

export function WeekNavigation({ weekId, basePath }: WeekNavigationProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { weekNumber } = parseWeekId(weekId);
  const { formatted } = getWeekDateRange(weekId);
  const isCurrentWeek = weekId === getCurrentWeekId();

  return (
    <div className="flex items-center gap-1.5 sm:gap-3">
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 sm:h-9 sm:w-9"
        onClick={() => navigate(`/${basePath}/week/${getPrevWeekId(weekId)}`)}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="text-center min-w-[120px] sm:min-w-[180px]">
        <h2 className="text-sm sm:text-lg font-semibold">
          {t('week')} {weekNumber}
        </h2>
        <p className="text-[10px] sm:text-sm text-muted-foreground">{formatted}</p>
      </div>

      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 sm:h-9 sm:w-9"
        onClick={() => navigate(`/${basePath}/week/${getNextWeekId(weekId)}`)}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {!isCurrentWeek && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            navigate(`/${basePath}/week/${getCurrentWeekId()}`)
          }
          className="ml-1 sm:ml-2 text-xs"
        >
          {t('common:today', 'Today')}
        </Button>
      )}
    </div>
  );
}
