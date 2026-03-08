import { useTranslation } from 'react-i18next';
import {
  Footprints,
  Bike,
  Dumbbell,
  Sparkles,
  StretchHorizontal,
  Waves,
  Moon,
  Pencil,
  Trash2,
  Clock,
  MapPin,
} from 'lucide-react';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { CompletionToggle } from '~/components/training/CompletionToggle';
import { TraineeFeedback } from '~/components/training/TraineeFeedback';
import { StravaDataPlaceholder } from '~/components/training/StravaDataPlaceholder';
import { trainingTypeConfig } from '~/lib/utils/training-types';
import type { TrainingSession } from '~/types/training';

const iconMap: Record<string, React.ElementType> = {
  Footprints,
  Bike,
  Dumbbell,
  Sparkles,
  StretchHorizontal,
  Waves,
  Moon,
};

interface SessionCardProps {
  session: TrainingSession;
  /** Coach mode: edit/delete buttons */
  readonly?: boolean;
  /** Trainee mode: completion + feedback */
  traineeMode?: boolean;
  onEdit?: (session: TrainingSession) => void;
  onDelete?: (sessionId: string) => void;
  onToggleComplete?: (sessionId: string, completed: boolean) => void;
  onUpdateNotes?: (sessionId: string, notes: string | null) => void;
}

export function SessionCard({
  session,
  readonly = false,
  traineeMode = false,
  onEdit,
  onDelete,
  onToggleComplete,
  onUpdateNotes,
}: SessionCardProps) {
  const { t } = useTranslation(['common', 'training']);
  const config = trainingTypeConfig[session.trainingType];
  const Icon = iconMap[config.icon] ?? Footprints;

  const isRestDay = session.trainingType === 'rest_day';

  return (
    <div
      className={`group rounded-md border p-2 transition-colors hover:shadow-sm ${
        session.isCompleted
          ? 'bg-green-50 border-green-200'
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

        {!readonly && !traineeMode && (
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

      {/* Trainee-specific features */}
      {traineeMode && !isRestDay && (
        <div className="mt-2 pt-1.5 border-t border-dashed space-y-1">
          <CompletionToggle
            isCompleted={session.isCompleted}
            onChange={(completed) =>
              onToggleComplete?.(session.id, completed)
            }
          />

          <TraineeFeedback
            notes={session.traineeNotes}
            onChange={(notes) => onUpdateNotes?.(session.id, notes)}
          />

          <StravaDataPlaceholder />
        </div>
      )}
    </div>
  );
}
