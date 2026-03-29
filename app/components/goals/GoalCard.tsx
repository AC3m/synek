import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trophy, Calendar, Clock, Ruler, Pencil, Trash2 } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { trainingTypeConfig, competitionConfig } from '~/lib/utils/training-types';
import type { Goal, AchievementStatus } from '~/types/training';
import { cn } from '~/lib/utils';
import { format, parseISO, isPast as isDatePast } from 'date-fns';
import { formatTime } from '~/lib/utils/format';

interface GoalCardProps {
  goal: Goal;
  canEdit: boolean;
  achievementStatus?: AchievementStatus;
  onEdit: (goal: Goal) => void;
  onDelete: (goal: Goal) => void;
  className?: string;
}

export function GoalCard({
  goal,
  canEdit,
  achievementStatus,
  onEdit,
  onDelete,
  className,
}: GoalCardProps) {
  const { t } = useTranslation('training');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const typeConfig = trainingTypeConfig[goal.discipline];
  const status = achievementStatus ?? 'pending';

  const statusColor =
    status === 'achieved'
      ? cn(competitionConfig.color, competitionConfig.bgColor)
      : 'text-muted-foreground bg-muted';

  const isPast = isDatePast(parseISO(goal.competitionDate));

  return (
    <div
      className={cn('flex flex-col gap-3 rounded-lg border p-4', isPast && 'opacity-80', className)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Trophy className={cn('size-4 shrink-0', competitionConfig.color)} />
          <span className="truncate font-semibold">{goal.name}</span>
          <Badge className={cn('shrink-0 text-xs', typeConfig.color, typeConfig.bgColor)}>
            {t(`common:trainingTypes.${goal.discipline}` as never)}
          </Badge>
        </div>
        {canEdit && (
          <div className="flex shrink-0 gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => onEdit(goal)}
              aria-label={t('goal.edit')}
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-destructive hover:text-destructive"
              onClick={() => setConfirmDelete(true)}
              aria-label={t('goal.delete')}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Date and prep weeks */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <Calendar className="size-3.5" />
          {format(parseISO(goal.competitionDate), 'd MMM yyyy')}
        </span>
        {goal.preparationWeeks > 0 && (
          <span>{t('goal.prepWeeksShort', { weeks: goal.preparationWeeks })}</span>
        )}
      </div>

      {/* Targets */}
      {(goal.goalDistanceKm != null || goal.goalTimeSeconds != null) && (
        <div className="flex gap-3 text-sm">
          {goal.goalDistanceKm != null && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <Ruler className="size-3.5" />
              {goal.goalDistanceKm} km
            </span>
          )}
          {goal.goalTimeSeconds != null && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <Clock className="size-3.5" />
              {formatTime(goal.goalTimeSeconds)}
            </span>
          )}
        </div>
      )}

      {/* Achievement status (only shown when results are known) */}
      {isPast && status !== 'pending' && (
        <Badge className={cn('self-start text-xs', statusColor)}>
          {t(`competition.${status}`)}
        </Badge>
      )}

      {/* Notes */}
      {goal.notes && <p className="line-clamp-2 text-xs text-muted-foreground">{goal.notes}</p>}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="flex flex-col gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3">
          <p className="text-sm text-destructive">{t('goal.deleteConfirm')}</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>
              {t('common:actions.cancel' as never)}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                setConfirmDelete(false);
                onDelete(goal);
              }}
            >
              {t('goal.delete')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
