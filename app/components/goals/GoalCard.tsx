import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trophy, Calendar, Clock, Ruler, Pencil, Trash2 } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { trainingTypeConfig, competitionConfig } from '~/lib/utils/training-types';
import type { Goal, AchievementStatus } from '~/types/training';
import { cn } from '~/lib/utils';
import { format, parseISO } from 'date-fns';

interface GoalCardProps {
  goal: Goal;
  canEdit: boolean;
  achievementStatus?: AchievementStatus;
  onEdit: (goal: Goal) => void;
  onDelete: (goal: Goal) => void;
  className?: string;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function GoalCard({ goal, canEdit, achievementStatus, onEdit, onDelete, className }: GoalCardProps) {
  const { t } = useTranslation('training');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const typeConfig = trainingTypeConfig[goal.discipline];
  const status = achievementStatus ?? 'pending';

  const statusColor =
    status === 'achieved'
      ? cn(competitionConfig.color, competitionConfig.bgColor)
      : 'text-muted-foreground bg-muted';

  const isPast = new Date(goal.competitionDate) < new Date();

  return (
    <div
      className={cn(
        'rounded-lg border p-4 flex flex-col gap-3',
        isPast && 'opacity-80',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Trophy className={cn('size-4 shrink-0', competitionConfig.color)} />
          <span className="font-semibold truncate">{goal.name}</span>
          <Badge className={cn('text-xs shrink-0', typeConfig.color, typeConfig.bgColor)}>
            {t(`common:trainingTypes.${goal.discipline}` as never)}
          </Badge>
        </div>
        {canEdit && (
          <div className="flex gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="size-7" onClick={() => onEdit(goal)}>
              <Pencil className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-destructive hover:text-destructive"
              onClick={() => setConfirmDelete(true)}
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
      {goal.notes && (
        <p className="text-xs text-muted-foreground line-clamp-2">{goal.notes}</p>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 flex flex-col gap-2">
          <p className="text-sm text-destructive">{t('goal.deleteConfirm')}</p>
          <div className="flex gap-2 justify-end">
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
