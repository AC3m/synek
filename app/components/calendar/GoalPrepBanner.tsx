import { useTranslation } from 'react-i18next';
import { Trophy } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';
import { isWeekInPrepWindow, isCompetitionWeek } from '~/lib/utils/goals';
import { competitionConfig } from '~/lib/utils/training-types';
import type { Goal } from '~/types/training';
import { cn } from '~/lib/utils';

interface GoalPrepBannerProps {
  goals: Goal[];
  weekStart: string;
  className?: string;
}

export function GoalPrepBanner({ goals, weekStart, className }: GoalPrepBannerProps) {
  const { t } = useTranslation('training');

  const prepGoals = goals.filter((g) => isWeekInPrepWindow(weekStart, g));

  if (prepGoals.length === 0) return null;

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {prepGoals.map((goal) => {
        const daysUntil = differenceInDays(parseISO(goal.competitionDate), new Date());
        const isCompWeek = isCompetitionWeek(weekStart, goal);

        return (
          <div
            key={goal.id}
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm border',
              competitionConfig.bgColor,
              competitionConfig.borderColor
            )}
          >
            <Trophy className={cn('size-3.5 shrink-0', competitionConfig.color)} />
            <span className={cn('font-medium', competitionConfig.color)}>
              {isCompWeek
                ? t('goalPrep.competitionWeek', { goalName: goal.name })
                : t('goalPrep.banner', { goalName: goal.name })}
            </span>
            <span className="ml-auto text-xs text-muted-foreground">
              {isCompWeek
                ? t('goalPrep.thisWeek')
                : daysUntil > 0
                  ? t('goalPrep.daysUntil', { days: daysUntil })
                  : null}
            </span>
          </div>
        );
      })}
    </div>
  );
}
