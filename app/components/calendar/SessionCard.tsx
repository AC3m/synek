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
  Clock,
  MapPin,
  Zap,
} from 'lucide-react';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Textarea } from '~/components/ui/textarea';
import { CompletionToggle } from '~/components/training/CompletionToggle';
import { AthleteFeedback } from '~/components/training/AthleteFeedback';
import { PerformanceEntry } from '~/components/training/PerformanceEntry';
import { trainingTypeConfig } from '~/lib/utils/training-types';
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
  /** Coach mode: edit/delete buttons */
  readonly?: boolean;
  /** Athlete mode: completion + feedback */
  athleteMode?: boolean;
  onEdit?: (session: TrainingSession) => void;
  onDelete?: (sessionId: string) => void;
  onToggleComplete?: (sessionId: string, completed: boolean) => void;
  onUpdateNotes?: (sessionId: string, notes: string | null) => void;
  onUpdatePerformance?: (sessionId: string, update: Omit<AthleteSessionUpdate, 'id'>) => void;
  onUpdateCoachPostFeedback?: (sessionId: string, feedback: string | null) => void;
}

export function SessionCard({
  session,
  readonly = false,
  athleteMode = false,
  onEdit,
  onDelete,
  onToggleComplete,
  onUpdateNotes,
  onUpdatePerformance,
  onUpdateCoachPostFeedback,
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
      className={`group rounded-md border p-2 transition-colors hover:shadow-sm ${
        session.isCompleted
          ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-900'
          : config.bgColor
      }`}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <Icon className={`h-3.5 w-3.5 shrink-0 ${config.color}`} />
          <Badge
            variant="secondary"
            className={`text-[10px] px-1.5 py-0 ${config.color} ${config.bgColor} border-0`}
          >
            {t(`common:trainingTypes.${session.trainingType}`)}
          </Badge>
        </div>

        {!readonly && !athleteMode && (
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={() => onEdit?.(session)}
            >
              <Pencil className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-destructive"
              onClick={() => onDelete?.(session.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {session.description && (
        <p className="text-xs mt-1 line-clamp-2">{session.description}</p>
      )}

      {session.coachComments && (
        <p className="text-[10px] mt-1 text-muted-foreground italic line-clamp-2">
          {session.coachComments}
        </p>
      )}

      <div className="flex flex-wrap gap-2 mt-1.5">
        {session.plannedDurationMinutes != null && (
          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
            <Clock className="h-2.5 w-2.5" />
            {session.plannedDurationMinutes} {t('training:units.min')}
          </span>
        )}
        {session.plannedDistanceKm != null && (
          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
            <MapPin className="h-2.5 w-2.5" />
            {session.plannedDistanceKm} {t('training:units.km')}
          </span>
        )}
      </div>

      {/* Actual performance chips — shown when completed and at least one field is set */}
      {session.isCompleted &&
        (session.actualDurationMinutes != null ||
          session.actualDistanceKm != null ||
          session.actualPace != null ||
          session.avgHeartRate != null ||
          session.maxHeartRate != null ||
          session.rpe != null) && (
          <div className="flex flex-wrap gap-1 mt-1.5 pt-1.5 border-t border-dashed">
            {session.actualDurationMinutes != null && (
              <span className="text-[10px] bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded">
                {t('training:actualPerformance.duration')}: {session.actualDurationMinutes}{' '}
                {t('training:units.min')}
              </span>
            )}
            {session.actualDistanceKm != null && (
              <span className="text-[10px] bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded">
                {t('training:actualPerformance.distance')}: {session.actualDistanceKm}{' '}
                {t('training:units.km')}
              </span>
            )}
            {session.actualPace != null && (
              <span className="text-[10px] bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded">
                {t('training:actualPerformance.pace')}: {session.actualPace}{' '}
                {t('training:units.perKm')}
              </span>
            )}
            {session.avgHeartRate != null && (
              <span className="text-[10px] bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded">
                {t('training:actualPerformance.avgHr')}: {session.avgHeartRate}{' '}
                {t('training:units.bpm')}
              </span>
            )}
            {session.maxHeartRate != null && (
              <span className="text-[10px] bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded">
                {t('training:actualPerformance.maxHr')}: {session.maxHeartRate}{' '}
                {t('training:units.bpm')}
              </span>
            )}
            {session.rpe != null && (
              <span className="text-[10px] bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded">
                {t('training:actualPerformance.rpe')}: {session.rpe}/10
              </span>
            )}
            {session.stravaActivityId != null && (
              <span
                title={t('strava.syncedBadge')}
                className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400"
              >
                <Zap className="h-2.5 w-2.5" />
                Strava
              </span>
            )}
          </div>
        )}

      {/* Athlete notes — shown to coach when the athlete has left notes */}
      {!athleteMode && session.athleteNotes && (
        <div className="mt-1.5 pt-1.5 border-t border-dashed">
          <p className="text-[10px] font-medium text-muted-foreground mb-0.5">
            {t('training:athleteNotes.label')}
          </p>
          <p className="text-[10px] italic">{session.athleteNotes}</p>
        </div>
      )}

      {/* Coach post-training feedback — shown when completed */}
      {session.isCompleted && (
        <div className="mt-1.5 pt-1.5 border-t border-dashed">
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
      {athleteMode && !isRestDay && (
        <div className="mt-2 pt-1.5 border-t border-dashed space-y-1">
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

          <AthleteFeedback
            notes={session.athleteNotes}
            onChange={(notes) => onUpdateNotes?.(session.id, notes)}
          />

        </div>
      )}
    </div>
  );
}
