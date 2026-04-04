import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Zap, Copy as CopyIcon, GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CompletionToggle } from '~/components/training/CompletionToggle';
import { PerformanceChipGroup } from '~/components/training/PerformanceChipGroup';
import { StravaLogo } from '~/components/training/StravaLogo';
import { GarminSection } from '~/components/training/GarminSection';
import { SessionDetailModal } from '~/components/training/SessionDetailModal';
import { StravaSyncButton } from '~/components/training/StravaSyncButton';
import { StravaConfirmButton } from '~/components/training/StravaConfirmButton';
import { useAuth } from '~/lib/context/AuthContext';
import { useSessionActions } from '~/lib/context/SessionActionsContext';
import {
  trainingTypeConfig,
  competitionConfig,
  iconMap,
  isDistanceBased,
} from '~/lib/utils/training-types';
import { getSessionCalendarDate } from '~/lib/utils/date';
import { cn } from '~/lib/utils';
import { type TrainingSession, type RunData } from '~/types/training';

interface SessionCardProps {
  session: TrainingSession;
  weekStart?: string;
  draggable?: boolean;
  onCopy?: (session: TrainingSession) => void;
}

export function SessionCard({ session, weekStart, draggable = false, onCopy }: SessionCardProps) {
  const { t } = useTranslation(['common', 'training', 'coach']);
  const [detailOpen, setDetailOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const {
    readonly,
    athleteMode,
    showAthleteControls,
    junctionConnected,
    onToggleComplete,
    userRole,
  } = useSessionActions();

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: session.id,
    data: { day: session.dayOfWeek },
    disabled: !draggable,
  });

  const mergedRef = useCallback(
    (node: HTMLDivElement | null) => {
      setNodeRef(node);
      cardRef.current = node;
    },
    [setNodeRef],
  );

  // PoC: Junction Garmin — remove after evaluation
  const { user } = useAuth();
  const calendarDate = getSessionCalendarDate(weekStart, session.dayOfWeek);

  const handleCardClick = (e: React.MouseEvent) => {
    // React portals bubble synthetic events through the React tree even though the
    // native DOM target lives outside this element (e.g. the Dialog overlay).
    // Guard against that by checking the real DOM click target.
    if (!cardRef.current?.contains(e.nativeEvent.target as Node)) return;
    const target = e.target as HTMLElement;
    if (target.closest('button, input, textarea, a, [role="menuitem"], [role="option"]')) return;
    setDetailOpen(true);
  };

  const isCompetition = !!session.goalId;
  const config = trainingTypeConfig[session.trainingType];
  const Icon = isCompetition
    ? (iconMap[competitionConfig.icon] ?? iconMap['Trophy'])
    : (iconMap[config.icon] ?? iconMap['Footprints']);
  const isRestDay = session.trainingType === 'rest_day';
  const distanceBased = isDistanceBased(session.trainingType);

  const isMasked =
    session.stravaActivityId != null && !session.isStravaConfirmed && userRole === 'coach';

  const hasActualPerformance =
    session.actualDurationMinutes != null ||
    session.actualDistanceKm != null ||
    session.actualPace != null ||
    session.avgHeartRate != null ||
    session.maxHeartRate != null ||
    session.rpe != null;
  const shouldShowMaskedPlaceholders = session.isCompleted && isMasked;
  const shouldShowPerformanceSection =
    session.isCompleted && (hasActualPerformance || shouldShowMaskedPlaceholders);

  // Only animate the performance section when it appears *after* mount (e.g. user just
  // completed the session). Skip the animation on initial render so navigating between
  // weeks doesn't flash already-present performance data.
  const performanceVisibleOnMount = useRef(shouldShowPerformanceSection);
  const animatePerformance =
    !readonly && shouldShowPerformanceSection && !performanceVisibleOnMount.current;

  const sortableStyle = draggable
    ? {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : undefined,
      }
    : undefined;

  const hasStravaActivity = session.stravaActivityId != null;

  return (
    <div
      ref={mergedRef}
      style={sortableStyle}
      className={cn(
        'group cursor-pointer rounded-xl p-3 ring-1 ring-[color:var(--border)] transition-all',
        session.isCompleted ? 'bg-surface-2 opacity-70' : 'bg-surface-1',
        isCompetition && cn('border-2', competitionConfig.borderColor),
      )}
      onClick={handleCardClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex min-w-0 items-center gap-1">
          {draggable && (
            <button
              {...attributes}
              {...listeners}
              className="-ml-1 shrink-0 cursor-grab rounded p-0.5 text-[color:var(--foreground-secondary)] opacity-40 hover:opacity-80 active:cursor-grabbing"
              aria-label="drag to reorder"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="h-3.5 w-3.5" />
            </button>
          )}
          {/* Sport badge pill — competition uses amber, others use sport color */}
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
              isCompetition ? competitionConfig.bgColor : config.bgColor,
              isCompetition ? competitionConfig.color : config.color,
            )}
          >
            <Icon className="h-2.5 w-2.5" />
            {isCompetition
              ? t('training:competition.label')
              : t(`common:trainingTypes.${session.trainingType}` as never)}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          {onCopy && (
            <button
              data-testid="session-copy-btn"
              className="rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/10"
              onClick={(e) => {
                e.stopPropagation();
                onCopy(session);
              }}
              aria-label="copy session"
            >
              <CopyIcon className="h-3.5 w-3.5 text-[color:var(--foreground-secondary)]" />
            </button>
          )}
        </div>
      </div>

      {session.description && (
        <p className="mt-2 line-clamp-2 text-sm leading-snug font-medium">{session.description}</p>
      )}

      {session.coachComments && (
        <p className="mt-1 line-clamp-2 text-[10px] text-muted-foreground italic">
          {session.coachComments}
        </p>
      )}

      <div className="mt-1.5 flex flex-wrap gap-2">
        {session.plannedDurationMinutes != null && (
          <span className="text-xs text-[color:var(--foreground-secondary)]">
            {session.plannedDurationMinutes} {t('training:units.min')}
          </span>
        )}
        {distanceBased && session.plannedDistanceKm != null && (
          <span className="text-xs text-[color:var(--foreground-secondary)]">
            {session.plannedDistanceKm} {t('training:units.km')}
          </span>
        )}
        {session.trainingType === 'run' && (session.typeSpecificData as RunData).pace_target && (
          <span className="inline-flex items-center gap-0.5 text-xs font-medium text-blue-700 dark:text-blue-400">
            <Zap className="h-2.5 w-2.5" />
            {(session.typeSpecificData as RunData).pace_target}
            {t('training:units.perKm')}
          </span>
        )}
      </div>

      {/* Actual performance chips — shown when completed */}
      {shouldShowPerformanceSection && (
        <div
          className={cn(
            animatePerformance && 'animate-in duration-300 fade-in slide-in-from-bottom-2',
            'mt-2 border-t border-[color:var(--separator)] pt-1.5',
          )}
        >
          <PerformanceChipGroup
            session={session}
            isMasked={isMasked}
            shouldShowMaskedPlaceholders={shouldShowMaskedPlaceholders}
            size="compact"
            animate={animatePerformance}
          />
          {session.stravaActivityId != null && (
            <div
              className={cn(
                animatePerformance && 'animate-in delay-[200ms] duration-200 fade-in',
                'mt-1.5 w-full border-t border-dashed border-[color:var(--separator)] pt-1.5',
              )}
            >
              <a
                href={`https://www.strava.com/activities/${session.stravaActivityId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-bold whitespace-nowrap hover:underline"
                style={{ color: '#FC5200' }}
              >
                View on Strava
              </a>
              <div className="mt-1 flex justify-end">
                <StravaLogo />
              </div>
            </div>
          )}
        </div>
      )}

      {/* PoC: Junction Garmin — remove after evaluation */}
      <GarminSection
        appUserId={user?.id ?? ''}
        calendarDate={calendarDate}
        trainingType={session.trainingType}
        junctionConnected={junctionConnected}
        variant="card"
        session={session}
      />

      {/* Athlete-specific features */}
      {(athleteMode || showAthleteControls) && !isRestDay && (
        <div className="mt-2 space-y-1 border-t border-[color:var(--separator)] pt-1.5">
          <CompletionToggle
            isCompleted={session.isCompleted}
            onChange={(completed) => onToggleComplete?.(session.id, completed)}
          />

          <StravaSyncButton
            sessionId={session.id}
            isCompleted={session.isCompleted}
            hasStravaActivity={hasStravaActivity}
          />

          {/* Confirm & Share is only shown to athletes, never to coaches — even when a coach
              uses showAthleteControls to manage their own self-planned sessions. A coach acting
              as their own athlete has no one to share data with, so the confirmation step is
              meaningless and intentionally omitted. */}
          <StravaConfirmButton
            sessionId={session.id}
            hasStravaActivity={hasStravaActivity}
            isStravaConfirmed={session.isStravaConfirmed}
          />
        </div>
      )}

      <SessionDetailModal
        open={detailOpen}
        onOpenChange={setDetailOpen}
        session={session}
        weekStart={weekStart}
      />
    </div>
  );
}
