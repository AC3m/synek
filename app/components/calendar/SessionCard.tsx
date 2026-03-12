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
import { Badge } from '~/components/ui/badge';
import { useAuth } from '~/lib/context/AuthContext';
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
  onConfirmStrava?: (sessionId: string) => void;
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
  onConfirmStrava,
}: SessionCardProps) {
  const { t } = useTranslation(['common', 'training']);
  const { user } = useAuth();
  const [coachFeedback, setCoachFeedback] = useState(session.coachPostFeedback ?? '');

  useEffect(() => {
    setCoachFeedback(session.coachPostFeedback ?? '');
  }, [session.id, session.coachPostFeedback]);

  const config = trainingTypeConfig[session.trainingType];
  const Icon = iconMap[config.icon] ?? Footprints;
  const isRestDay = session.trainingType === 'rest_day';

  const userRole = user?.role;
  const isMasked = !session.isStravaConfirmed && userRole === 'coach';

  return (
    <div
      className={cn(
        'group rounded-xl p-3 transition-all ring-1 ring-[color:var(--border)]',
        session.isCompleted ? 'bg-surface-2 opacity-70' : 'bg-surface-1'
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="flex flex-wrap items-center gap-1.5">
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
        </div>

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
          <div
            className={cn(
              'flex flex-wrap gap-x-4 gap-y-2 mt-2 pt-1.5 border-t border-[color:var(--separator)]',
              isMasked ? 'blur-[3px] select-none pointer-events-none' : ''
            )}
            title={isMasked ? 'Waiting for athlete confirmation' : ''}
          >
            {session.actualDurationMinutes != null && (
              <div className="flex flex-col min-w-[60px]">
                <span className="text-[10px] text-muted-foreground uppercase tracking-tight">
                  {t('training:actualPerformance.duration')}
                </span>
                <span className="text-[10px] font-semibold">
                  {isMasked ? '---' : `${session.actualDurationMinutes} ${t('training:units.min')}`}
                </span>
              </div>
            )}
            {session.actualDistanceKm != null && (
              <div className="flex flex-col min-w-[60px]">
                <span className="text-[10px] text-muted-foreground uppercase tracking-tight">
                  {t('training:actualPerformance.distance')}
                </span>
                <span className="text-[10px] font-semibold">
                  {isMasked ? '---' : `${session.actualDistanceKm} ${t('training:units.km')}`}
                </span>
              </div>
            )}
            {session.actualPace != null && (
              <div className="flex flex-col min-w-[60px]">
                <span className="text-[10px] text-muted-foreground uppercase tracking-tight">
                  {t('training:actualPerformance.pace')}
                </span>
                <span className="text-[10px] font-semibold">
                  {isMasked ? '---' : `${session.actualPace} ${t('training:units.perKm')}`}
                </span>
              </div>
            )}
            {session.avgHeartRate != null && (
              <div className="flex flex-col min-w-[60px]">
                <span className="text-[10px] text-muted-foreground uppercase tracking-tight">
                  {t('training:actualPerformance.avgHr')}
                </span>
                <span className="text-[10px] font-semibold">
                  {isMasked ? '---' : `${session.avgHeartRate} ${t('training:units.bpm')}`}
                </span>
              </div>
            )}
            {session.maxHeartRate != null && (
              <div className="flex flex-col min-w-[60px]">
                <span className="text-[10px] text-muted-foreground uppercase tracking-tight">
                  {t('training:actualPerformance.maxHr')}
                </span>
                <span className="text-[10px] font-semibold">
                  {isMasked ? '---' : `${session.maxHeartRate} ${t('training:units.bpm')}`}
                </span>
              </div>
            )}
            {session.rpe != null && (
              <div className="flex flex-col min-w-[60px]">
                <span className="text-[10px] text-muted-foreground uppercase tracking-tight">
                  {t('training:actualPerformance.rpe')}
                </span>
                <span className="text-[10px] font-semibold">{isMasked ? '---' : `${session.rpe}/10`}</span>
              </div>
            )}
            
            {session.stravaActivityId != null && (
              <div className="w-full flex flex-col gap-2 mt-1.5 pt-1.5 border-t border-[color:var(--separator)] border-dashed xs:flex-row xs:items-center xs:justify-between">
                <div className="flex items-center gap-1.5 opacity-80">
                  <img
                    src="/strava/1.2-Strava-API-Logos/Powered by Strava/pwrdBy_strava_orange/api_logo_pwrdBy_strava_horiz_orange.svg"
                    alt="Powered by Strava"
                    className="h-3.5 w-auto dark:hidden"
                  />
                  <img
                    src="/strava/1.2-Strava-API-Logos/Powered by Strava/pwrdBy_strava_white/api_logo_pwrdBy_strava_horiz_white.svg"
                    alt="Powered by Strava"
                    className="h-3.5 w-auto hidden dark:block"
                  />
                </div>
                <a
                  href={`https://www.strava.com/activities/${session.stravaActivityId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-bold underline whitespace-nowrap"
                  style={{ color: '#FC5200' }}
                >
                  View on Strava
                </a>
              </div>
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

          {session.stravaActivityId && !session.isStravaConfirmed && (athleteMode || showAthleteControls) && (
            <Button
              size="sm"
              variant="outline"
              className="w-full text-[10px] h-7 border-orange-200 text-orange-600 hover:bg-orange-50 dark:border-orange-900 dark:text-orange-400 dark:hover:bg-orange-950"
              onClick={() => onConfirmStrava?.(session.id)}
            >
              Confirm & Share with Coach
            </Button>
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
