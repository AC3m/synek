import { useState, useRef } from 'react';
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
  Zap,
  Loader2,
  Share2,
} from 'lucide-react';
import { Button } from '~/components/ui/button';
import { CompletionToggle } from '~/components/training/CompletionToggle';
import { StravaLogo } from '~/components/training/StravaLogo';
import { SessionDetailModal } from '~/components/training/SessionDetailModal';
import { trainingTypeConfig } from '~/lib/utils/training-types';
import { cn } from '~/lib/utils';
import type { UserRole } from '~/lib/auth';
import type { TrainingSession, AthleteSessionUpdate, RunData } from '~/types/training';

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
  weekStart?: string;
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
  onSyncStrava?: (sessionId: string) => Promise<void>;
  onConfirmStrava?: (sessionId: string) => Promise<void>;
  userRole?: UserRole;
}

export function SessionCard({
  session,
  weekStart,
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
  userRole,
}: SessionCardProps) {
  const { t } = useTranslation(['common', 'training']);
  const [isSyncingStrava, setIsSyncingStrava] = useState(false);
  const [isConfirmingStrava, setIsConfirmingStrava] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleCardClick = (e: React.MouseEvent) => {
    // React portals bubble synthetic events through the React tree even though the
    // native DOM target lives outside this element (e.g. the Dialog overlay).
    // Guard against that by checking the real DOM click target.
    if (!cardRef.current?.contains(e.nativeEvent.target as Node)) return;
    const target = e.target as HTMLElement;
    if (target.closest('button, input, textarea, a, [role="menuitem"], [role="option"]')) return;
    setDetailOpen(true);
  };


  const config = trainingTypeConfig[session.trainingType];
  const Icon = iconMap[config.icon] ?? Footprints;
  const isRestDay = session.trainingType === 'rest_day';

  const isMasked = session.stravaActivityId != null && !session.isStravaConfirmed && userRole === 'coach';

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

  return (
    <div
      ref={cardRef}
      className={cn(
        'group rounded-xl p-3 transition-all ring-1 ring-[color:var(--border)] cursor-pointer',
        session.isCompleted ? 'bg-surface-2 opacity-70' : 'bg-surface-1'
      )}
      onClick={handleCardClick}
    >
      <div className="flex items-start">
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
        {session.trainingType === 'run' &&
          (session.typeSpecificData as RunData).pace_target && (
            <span className="inline-flex items-center gap-0.5 text-xs font-medium text-blue-700 dark:text-blue-400">
              <Zap className="h-2.5 w-2.5" />
              {(session.typeSpecificData as RunData).pace_target}{t('training:units.perKm')}
            </span>
          )}
      </div>

      {/* Actual performance chips — shown when completed */}
      {shouldShowPerformanceSection && (
          <div
            className={cn(
              'animate-in fade-in slide-in-from-bottom-2 duration-300',
              'flex flex-wrap gap-x-4 gap-y-2 mt-2 pt-1.5 border-t border-[color:var(--separator)]',
              isMasked ? 'blur-[3px] select-none pointer-events-none' : ''
            )}
            title={isMasked ? t('common:strava.waitingForConfirmation') : ''}
          >
            {(shouldShowMaskedPlaceholders || session.actualDurationMinutes != null) && (
              <div className="animate-in fade-in duration-200 delay-[50ms] flex flex-col min-w-[60px]">
                <span className="text-[10px] text-muted-foreground uppercase tracking-tight">
                  {t('training:actualPerformance.duration')}
                </span>
                <span className="text-[10px] font-semibold">
                  {isMasked ? '---' : `${session.actualDurationMinutes} ${t('training:units.min')}`}
                </span>
              </div>
            )}
            {(shouldShowMaskedPlaceholders || (session.actualDistanceKm != null && session.actualDistanceKm > 0)) && (
              <div className="animate-in fade-in duration-200 delay-[75ms] flex flex-col min-w-[60px]">
                <span className="text-[10px] text-muted-foreground uppercase tracking-tight">
                  {t('training:actualPerformance.distance')}
                </span>
                <span className="text-[10px] font-semibold">
                  {isMasked ? '---' : `${session.actualDistanceKm} ${t('training:units.km')}`}
                </span>
              </div>
            )}
            {(shouldShowMaskedPlaceholders || session.actualPace != null) && (
              <div className="animate-in fade-in duration-200 delay-[100ms] flex flex-col min-w-[60px]">
                <span className="text-[10px] text-muted-foreground uppercase tracking-tight">
                  {t('training:actualPerformance.pace')}
                </span>
                <span className="text-[10px] font-semibold">
                  {isMasked ? '---' : `${session.actualPace} ${t('training:units.perKm')}`}
                </span>
              </div>
            )}
            {(shouldShowMaskedPlaceholders || session.avgHeartRate != null) && (
              <div className="animate-in fade-in duration-200 delay-[125ms] flex flex-col min-w-[60px]">
                <span className="text-[10px] text-muted-foreground uppercase tracking-tight">
                  {t('training:actualPerformance.avgHr')}
                </span>
                <span className="text-[10px] font-semibold">
                  {isMasked ? '---' : `${session.avgHeartRate} ${t('training:units.bpm')}`}
                </span>
              </div>
            )}
            {(shouldShowMaskedPlaceholders || session.maxHeartRate != null) && (
              <div className="animate-in fade-in duration-200 delay-[150ms] flex flex-col min-w-[60px]">
                <span className="text-[10px] text-muted-foreground uppercase tracking-tight">
                  {t('training:actualPerformance.maxHr')}
                </span>
                <span className="text-[10px] font-semibold">
                  {isMasked ? '---' : `${session.maxHeartRate} ${t('training:units.bpm')}`}
                </span>
              </div>
            )}
            {(shouldShowMaskedPlaceholders || session.rpe != null) && (
              <div className="animate-in fade-in duration-200 delay-[175ms] flex flex-col min-w-[60px]">
                <span className="text-[10px] text-muted-foreground uppercase tracking-tight">
                  {t('training:actualPerformance.rpe')}
                </span>
                <span className="text-[10px] font-semibold">{isMasked ? '---' : `${session.rpe}/10`}</span>
              </div>
            )}

            {session.stravaActivityId != null && (
              <div className="animate-in fade-in duration-200 delay-[200ms] w-full mt-1.5 pt-1.5 border-t border-[color:var(--separator)] border-dashed">
                <a
                  href={`https://www.strava.com/activities/${session.stravaActivityId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-bold hover:underline whitespace-nowrap"
                  style={{ color: '#FC5200' }}
                >
                  View on Strava
                </a>
                <div className="flex justify-end mt-1">
                  <StravaLogo />
                </div>
              </div>
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

          {session.isCompleted && !session.stravaActivityId && stravaConnected && (
            <button
              onClick={async () => {
                setIsSyncingStrava(true);
                try {
                  await onSyncStrava?.(session.id);
                } finally {
                  setIsSyncingStrava(false);
                }
              }}
              disabled={isSyncingStrava}
              className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-600 hover:bg-orange-200 dark:bg-orange-950 dark:text-orange-400 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSyncingStrava
                ? <Loader2 className="h-2.5 w-2.5 animate-spin" />
                : <Zap className="h-2.5 w-2.5" />
              }
              {t('common:strava.sync')}
            </button>
          )}

          {/* Confirm & Share is only shown to athletes, never to coaches — even when a coach
              uses showAthleteControls to manage their own self-planned sessions. A coach acting
              as their own athlete has no one to share data with, so the confirmation step is
              meaningless and intentionally omitted. */}
          {session.stravaActivityId &&
            !session.isStravaConfirmed &&
            userRole === 'athlete' && (
            <Button
              size="sm"
              variant="outline"
              disabled={isConfirmingStrava}
              className="w-full text-[10px] h-7 px-2 border-orange-200 text-orange-600 hover:bg-orange-50 hover:text-orange-700 dark:border-orange-900 dark:text-orange-400 dark:hover:bg-orange-950 dark:hover:text-orange-300 disabled:opacity-60 disabled:cursor-not-allowed"
              onClick={async () => {
                setIsConfirmingStrava(true);
                try {
                  await onConfirmStrava?.(session.id);
                } finally {
                  setIsConfirmingStrava(false);
                }
              }}
              title={t('common:strava.confirmAndShare')}
            >
              {isConfirmingStrava
                ? <Loader2 className="h-2.5 w-2.5 animate-spin shrink-0" />
                : <Share2 className="h-2.5 w-2.5 shrink-0" />
              }
              <span className="truncate">{t('common:strava.confirmAndShare')}</span>
            </Button>
          )}

        </div>
      )}

      <SessionDetailModal
        open={detailOpen}
        onOpenChange={setDetailOpen}
        session={session}
        weekStart={weekStart}
        readonly={readonly}
        athleteMode={athleteMode}
        showAthleteControls={showAthleteControls}
        stravaConnected={stravaConnected}
        onEdit={onEdit}
        onDelete={onDelete}
        onToggleComplete={onToggleComplete}
        onUpdateNotes={onUpdateNotes}
        onUpdatePerformance={onUpdatePerformance}
        onUpdateCoachPostFeedback={onUpdateCoachPostFeedback}
        onSyncStrava={onSyncStrava}
        onConfirmStrava={onConfirmStrava}
        userRole={userRole}
      />
    </div>
  );
}
