import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Footprints,
  Bike,
  Dumbbell,
  Sparkles,
  StretchHorizontal,
  Waves,
  Moon,
  Activity,
  Pencil,
  Trash2,
  Zap,
  MoreVertical,
} from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Textarea } from '~/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { CompletionToggle } from '~/components/training/CompletionToggle';
import { AthleteFeedback } from '~/components/training/AthleteFeedback';
import { PerformanceEntry } from '~/components/training/PerformanceEntry';
import { trainingTypeConfig } from '~/lib/utils/training-types';
import { cn } from '~/lib/utils';
import type { TrainingSession, AthleteSessionUpdate } from '~/types/training';

const iconMap: Record<string, React.ElementType> = {
  Footprints,
  Bike,
  Dumbbell,
  Sparkles,
  StretchHorizontal,
  Waves,
  Moon,
  Activity,
};

interface SessionCardProps {
  session: TrainingSession;
  readonly?: boolean;
  /** Athlete mode: controls feedback UI direction (coach textarea vs athlete read-only) */
  athleteMode?: boolean;
  /** Show completion/notes/performance controls regardless of athleteMode (e.g. coach viewing own plan) */
  showAthleteControls?: boolean;
  stravaConnected?: boolean;
  onEdit?: (session: TrainingSession) => void;
  onDelete?: (sessionId: string) => void;
  onToggleComplete?: (sessionId: string, completed: boolean) => void;
  onUpdateNotes?: (sessionId: string, notes: string | null) => void;
  onUpdatePerformance?: (sessionId: string, update: Omit<AthleteSessionUpdate, 'id'>) => void;
  onUpdateCoachPostFeedback?: (sessionId: string, feedback: string | null) => void;
  onSyncStrava?: () => void;
}

export function SessionCard({
  session,
  readonly = false,
  athleteMode = false,
  showAthleteControls = false,
  stravaConnected = false,
  onEdit,
  onDelete,
  onToggleComplete,
  onUpdateNotes,
  onUpdatePerformance,
  onUpdateCoachPostFeedback,
  onSyncStrava,
}: SessionCardProps) {
  const { t } = useTranslation(['common', 'training']);
  const [coachFeedback, setCoachFeedback] = useState(session.coachPostFeedback ?? '');

  useEffect(() => {
    setCoachFeedback(session.coachPostFeedback ?? '');
  }, [session.id, session.coachPostFeedback]);

  const config = trainingTypeConfig[session.trainingType];
  const Icon = iconMap[config.icon] ?? Footprints;
  const isRestDay = session.trainingType === 'rest_day';

  return (
    <div
      className={cn(
        'group rounded-xl p-3 transition-all ring-1 ring-[color:var(--border)]',
        session.isCompleted ? 'bg-surface-2 opacity-70' : 'bg-surface-1'
      )}
    >
      <div className="flex items-start justify-between gap-1">
        {/* Sport badge pill — sport color only here */}
        <span
          className={cn(
            'inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full',
            config.bgColor,
            config.color
          )}
        >
          <Icon className="h-2.5 w-2.5" />
          {t(`common:trainingTypes.${session.trainingType}` as never)}
        </span>

        {!readonly && (onEdit || onDelete) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(session)}>
                  <Pencil className="mr-2 h-3.5 w-3.5" />
                  {t('common:actions.edit')}
                </DropdownMenuItem>
              )}
              {onEdit && onDelete && <DropdownMenuSeparator />}
              {onDelete && (
                <DropdownMenuItem
                  onClick={() => onDelete(session.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  {t('common:actions.delete')}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {session.description && (
        <p className="text-sm font-medium mt-2 line-clamp-2 leading-snug">{session.description}</p>
      )}

      {session.coachComments && (
        <p className="text-[10px] mt-1 text-muted-foreground italic line-clamp-2">
          {session.coachComments}
        </p>
      )}

      <div className="flex flex-wrap gap-2 mt-1.5">
        {session.plannedDurationMinutes != null && (
          <span className="text-xs text-[color:var(--foreground-secondary)]">
            {session.plannedDurationMinutes} {t('training:units.min')}
          </span>
        )}
        {session.plannedDistanceKm != null && (
          <span className="text-xs text-[color:var(--foreground-secondary)]">
            {session.plannedDistanceKm} {t('training:units.km')}
          </span>
        )}
      </div>

      {/* Actual performance chips — shown when completed */}
      {session.isCompleted &&
        (session.actualDurationMinutes != null ||
          session.actualDistanceKm != null ||
          session.actualPace != null ||
          session.avgHeartRate != null ||
          session.maxHeartRate != null ||
          session.rpe != null) && (
          <div className="flex flex-wrap gap-1 mt-1.5 pt-1.5 border-t border-[color:var(--separator)]">
            {session.actualDurationMinutes != null && (
              <span className="text-[10px] bg-surface-2 text-[color:var(--foreground-secondary)] px-1.5 py-0.5 rounded-md">
                {t('training:actualPerformance.duration')}: {session.actualDurationMinutes}{' '}
                {t('training:units.min')}
              </span>
            )}
            {session.actualDistanceKm != null && (
              <span className="text-[10px] bg-surface-2 text-[color:var(--foreground-secondary)] px-1.5 py-0.5 rounded-md">
                {t('training:actualPerformance.distance')}: {session.actualDistanceKm}{' '}
                {t('training:units.km')}
              </span>
            )}
            {session.actualPace != null && (
              <span className="text-[10px] bg-surface-2 text-[color:var(--foreground-secondary)] px-1.5 py-0.5 rounded-md">
                {t('training:actualPerformance.pace')}: {session.actualPace}{' '}
                {t('training:units.perKm')}
              </span>
            )}
            {session.avgHeartRate != null && (
              <span className="text-[10px] bg-surface-2 text-[color:var(--foreground-secondary)] px-1.5 py-0.5 rounded-md">
                {t('training:actualPerformance.avgHr')}: {session.avgHeartRate}{' '}
                {t('training:units.bpm')}
              </span>
            )}
            {session.maxHeartRate != null && (
              <span className="text-[10px] bg-surface-2 text-[color:var(--foreground-secondary)] px-1.5 py-0.5 rounded-md">
                {t('training:actualPerformance.maxHr')}: {session.maxHeartRate}{' '}
                {t('training:units.bpm')}
              </span>
            )}
            {session.rpe != null && (
              <span className="text-[10px] bg-surface-2 text-[color:var(--foreground-secondary)] px-1.5 py-0.5 rounded-md">
                {t('training:actualPerformance.rpe')}: {session.rpe}/10
              </span>
            )}
            {session.stravaActivityId != null && (
              <span
                title={t('strava.syncedBadge')}
                className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-md bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400"
              >
                <Zap className="h-2.5 w-2.5" />
                Strava
              </span>
            )}
          </div>
        )}

      {/* Athlete notes — shown to coach when the athlete has left notes */}
      {!athleteMode && session.athleteNotes && (
        <div className="mt-1.5 pt-1.5 border-t border-[color:var(--separator)]">
          <p className="text-[10px] font-medium text-muted-foreground mb-0.5">
            {t('training:athleteNotes.label')}
          </p>
          <p className="text-[10px] italic">{session.athleteNotes}</p>
        </div>
      )}

      {/* Coach post-training feedback — shown when completed */}
      {session.isCompleted && (
        <div className="mt-1.5 pt-1.5 border-t border-[color:var(--separator)]">
          {!athleteMode ? (
            <div>
              <p className="text-[10px] font-medium text-muted-foreground mb-0.5">
                {t('training:coachPostFeedback.label')}
              </p>
              <Textarea
                value={coachFeedback}
                placeholder={t('training:coachPostFeedback.placeholder')}
                rows={2}
                className="text-[10px] min-h-0 resize-none"
                onChange={(e) => setCoachFeedback(e.target.value)}
                onBlur={() => {
                  const val = coachFeedback || null;
                  if (val !== session.coachPostFeedback) {
                    onUpdateCoachPostFeedback?.(session.id, val);
                  }
                }}
              />
            </div>
          ) : (
            session.coachPostFeedback ? (
              <p className="text-[10px] text-muted-foreground italic">
                {session.coachPostFeedback}
              </p>
            ) : (
              <p className="text-[10px] text-muted-foreground/50 italic">
                {t('training:coachPostFeedback.empty')}
              </p>
            )
          )}
        </div>
      )}

      {/* Athlete-specific features */}
      {(athleteMode || showAthleteControls) && !isRestDay && (
        <div className="mt-2 pt-1.5 border-t border-[color:var(--separator)] space-y-1">
          <CompletionToggle
            isCompleted={session.isCompleted}
            onChange={(completed) =>
              onToggleComplete?.(session.id, completed)
            }
          />

          {session.isCompleted && (
            <PerformanceEntry
              session={session}
              onChange={(update) => onUpdatePerformance?.(session.id, update)}
            />
          )}

          {session.isCompleted && !session.stravaActivityId && stravaConnected && (
            <button
              onClick={onSyncStrava}
              className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-600 hover:bg-orange-200 dark:bg-orange-950 dark:text-orange-400"
            >
              <Zap className="h-2.5 w-2.5" />
              {t('common:strava.sync')}
            </button>
          )}

          <AthleteFeedback
            notes={session.athleteNotes}
            onChange={(notes) => onUpdateNotes?.(session.id, notes)}
          />
        </div>
      )}
    </div>
  );
}
