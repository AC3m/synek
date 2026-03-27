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
  getTodayDayOfWeek,
} from '~/lib/utils/date';
import { useLocalePath } from '~/lib/hooks/useLocalePath';
import { useIsMobile } from '~/lib/hooks/useIsMobile';
import type { DayOfWeek } from '~/types/training';

interface WeekNavigationProps {
  weekId: string;
  basePath: 'coach' | 'athlete';
  selectedDay?: DayOfWeek;
  isLoading?: boolean;
}

export function WeekNavigation({ weekId, basePath, selectedDay, isLoading }: WeekNavigationProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const localePath = useLocalePath();
  const isMobile = useIsMobile();
  const { weekNumber } = parseWeekId(weekId);
  const { formatted } = getWeekDateRange(weekId);
  const isCurrentWeek = weekId === getCurrentWeekId();

  // If on desktop: disabled if current week is viewed.
  // If on mobile: disabled if current week is viewed AND the selected day is today.
  const isTodayDisabled =
    isCurrentWeek && (!isMobile || (!!selectedDay && selectedDay === getTodayDayOfWeek()));

  return (
    <div className="ml-auto flex flex-1 items-center gap-1 sm:gap-2">
      <Button
        variant="ghost"
        size="icon"
        disabled={isLoading}
        className="h-11 w-11 shrink-0 rounded-full"
        onClick={() => navigate(localePath(`/${basePath}/week/${getPrevWeekId(weekId)}`))}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="min-w-0 flex-1 px-1 text-center">
        <span className="text-sm font-semibold tracking-tight whitespace-nowrap">
          {t('week')} {weekNumber}
        </span>
        <span className="ml-1.5 hidden text-xs text-[color:var(--foreground-secondary)] sm:inline">
          · {formatted}
        </span>
      </div>

      <Button
        variant="ghost"
        size="icon"
        disabled={isLoading}
        className="h-11 w-11 shrink-0 rounded-full"
        onClick={() => navigate(localePath(`/${basePath}/week/${getNextWeekId(weekId)}`))}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        disabled={isTodayDisabled}
        onClick={() =>
          navigate(localePath(`/${basePath}/week/${getCurrentWeekId()}`), {
            state: { resetToToday: Date.now() },
          })
        }
        className="min-h-[36px] shrink-0 rounded-full bg-surface-2 px-3 py-1.5 text-xs transition-colors hover:bg-surface-3"
      >
        {t('common:today', 'Today')}
      </Button>
    </div>
  );
}
