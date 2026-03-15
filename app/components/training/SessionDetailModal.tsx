import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { format, addDays, parseISO } from 'date-fns';
import {
  Footprints,
  Bike,
  Dumbbell,
  Sparkles,
  StretchHorizontal,
  Waves,
  Moon,
  Activity,
  PersonStanding,
  Mountain,
  Pencil,
  Trash2,
  X,
  Zap,
  Loader2,
  Share2,
  RotateCcw,
} from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Textarea } from '~/components/ui/textarea';
import { Separator } from '~/components/ui/separator';
import { Skeleton } from '~/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogClose,
} from '~/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetClose,
} from '~/components/ui/sheet';
import { useIsMobile } from '~/lib/hooks/useIsMobile';
import { CompletionToggle } from './CompletionToggle';
import { PerformanceEntry } from './PerformanceEntry';
import { AthleteFeedback } from './AthleteFeedback';
import { IntervalChart } from './IntervalChart';
import { LapTable } from './LapTable';
import { StravaLogo } from './StravaLogo';
import { useSessionLaps } from '~/lib/hooks/useSessionLaps';
import { trainingTypeConfig } from '~/lib/utils/training-types';
import { DAYS_OF_WEEK } from '~/types/training';
import { cn } from '~/lib/utils';
import type { UserRole } from '~/lib/auth';
import type {
  TrainingSession,
  AthleteSessionUpdate,
  RunData,
  CyclingData,
  StrengthData,
  YogaMobilityData,
  SwimmingData,
  WalkData,
  HikeData,
  RestDayData,
  IntervalBlock,
} from '~/types/training';

const iconMap: Record<string, React.ElementType> = {
  Footprints,
  Bike,
  Dumbbell,
  Sparkles,
  StretchHorizontal,
  Waves,
  Moon,
  Activity,
  PersonStanding,
  Mountain,
};

interface SessionDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: TrainingSession;
  weekStart?: string;
  readonly?: boolean;
  athleteMode?: boolean;
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

function formatIntervalBlock(block: IntervalBlock, restLabel: string): string {
  const what = block.distance_m
    ? `${block.distance_m}m`
    : block.duration_seconds
    ? `${block.duration_seconds}s`
    : '';
  const pace = block.pace ? ` @ ${block.pace}/km` : '';
  const rest = block.rest_seconds ? `  (${block.rest_seconds}s ${restLabel})` : '';
  return `${block.repeat} × ${what}${pace}${rest}`;
}

interface FieldRowProps {
  label: string;
  value: React.ReactNode;
}

function FieldRow({ label, value }: FieldRowProps) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex gap-3 text-sm">
      <span className="text-muted-foreground min-w-[130px] shrink-0">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
      {children}
    </p>
  );
}

export function SessionDetailModal({
  open,
  onOpenChange,
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
}: SessionDetailModalProps) {
  const { t } = useTranslation(['training', 'common']);
  const isMobile = useIsMobile();

  const [coachFeedback, setCoachFeedback] = useState(session.coachPostFeedback ?? '');
  const [isSyncingStrava, setIsSyncingStrava] = useState(false);
  const [isConfirmingStrava, setIsConfirmingStrava] = useState(false);

  useEffect(() => {
    setCoachFeedback(session.coachPostFeedback ?? '');
  }, [session.id, session.coachPostFeedback]);

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
  const shouldShowActualSection =
    session.isCompleted && (hasActualPerformance || shouldShowMaskedPlaceholders);

  const lapsEnabled =
    session.trainingType === 'run' &&
    session.stravaActivityId != null &&
    (userRole !== 'coach' || session.isStravaConfirmed === true);

  const { data: laps, isLoading: lapsLoading, isError: lapsError, refetch: refetchLaps } =
    useSessionLaps(session.id, lapsEnabled);

  const intervalCount = lapsEnabled && laps ? laps.filter((l) => l.segmentType === 'interval').length : 0;
  const hasRealIntervals = intervalCount > 2;

  const dayDate = weekStart
    ? addDays(parseISO(weekStart), DAYS_OF_WEEK.indexOf(session.dayOfWeek))
    : null;
  const dateStr = dayDate ? format(dayDate, 'EEEE · MMM d') : null;

  const typeData = session.typeSpecificData;

  function renderTypeSpecificFields() {
    if (!typeData) return null;

    switch (typeData.type) {
      case 'run': {
        const d = typeData as RunData;
        return (
          <div className="space-y-1.5">
            <FieldRow label={t('training:run.hrZone')} value={d.hr_zone ? `Zone ${d.hr_zone}` : null} />
            <FieldRow
              label={t('training:run.terrain')}
              value={d.terrain ? t(`training:run.terrainOptions.${d.terrain}` as never) : null}
            />
            <FieldRow
              label={t('training:run.elevationGain')}
              value={d.elevation_gain_m != null ? `${d.elevation_gain_m} m` : null}
            />
            {d.intervals && d.intervals.length > 0 && (
              <div className="pt-1">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                  {t('training:sessionDetail.plannedIntervals')}
                </p>
                <ul className="space-y-0.5">
                  {d.intervals.map((block, i) => (
                    <li key={i} className="text-sm font-medium font-mono">
                      {formatIntervalBlock(block, t('training:sessionDetail.rest'))}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      }
      case 'cycling': {
        const d = typeData as CyclingData;
        return (
          <div className="space-y-1.5">
            <FieldRow
              label={t('training:cycling.avgSpeedTarget')}
              value={d.avg_speed_target_kmh != null ? `${d.avg_speed_target_kmh} km/h` : null}
            />
            <FieldRow
              label={t('training:cycling.powerTarget')}
              value={d.power_target_watts != null ? `${d.power_target_watts} W` : null}
            />
            <FieldRow label={t('training:cycling.hrZone')} value={d.hr_zone ? `Zone ${d.hr_zone}` : null} />
            <FieldRow
              label={t('training:cycling.terrain')}
              value={d.terrain ? t(`training:cycling.terrainOptions.${d.terrain}` as never) : null}
            />
            <FieldRow
              label={t('training:cycling.elevationGain')}
              value={d.elevation_gain_m != null ? `${d.elevation_gain_m} m` : null}
            />
          </div>
        );
      }
      case 'strength': {
        const d = typeData as StrengthData;
        return (
          <div className="space-y-1.5">
            <FieldRow
              label={t('training:strength.muscleGroups')}
              value={d.muscle_groups?.length ? d.muscle_groups.join(', ') : null}
            />
            <FieldRow
              label={t('training:strength.equipment')}
              value={d.equipment?.length ? d.equipment.join(', ') : null}
            />
            {d.exercises && d.exercises.length > 0 && (
              <div className="pt-1">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                  {t('training:strength.exercises')}
                </p>
                <div className="overflow-x-auto">
                  <table className="text-xs w-full">
                    <thead>
                      <tr className="text-muted-foreground border-b">
                        <th className="text-left pb-1 pr-3 font-medium">{t('training:strength.exercise.name')}</th>
                        <th className="text-right pb-1 pr-2 font-medium">{t('training:strength.exercise.sets')}</th>
                        <th className="text-right pb-1 pr-2 font-medium">{t('training:strength.exercise.reps')}</th>
                        <th className="text-right pb-1 font-medium">{t('training:strength.exercise.weight')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.exercises.map((ex, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="py-1 pr-3 font-medium">{ex.name}</td>
                          <td className="py-1 pr-2 text-right">{ex.sets ?? '—'}</td>
                          <td className="py-1 pr-2 text-right">{ex.reps ?? '—'}</td>
                          <td className="py-1 text-right">{ex.weight_kg != null ? `${ex.weight_kg} kg` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      }
      case 'yoga':
      case 'mobility': {
        const d = typeData as YogaMobilityData;
        return (
          <div className="space-y-1.5">
            <FieldRow label={t('training:yogaMobility.focusArea')} value={d.focus_area ?? null} />
            <FieldRow label={t('training:yogaMobility.style')} value={d.style ?? null} />
            {d.poses && d.poses.length > 0 && (
              <div className="pt-1">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                  {t('training:yogaMobility.poses')}
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-sm">
                  {d.poses.map((pose, i) => (
                    <li key={i}>{pose}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      }
      case 'swimming': {
        const d = typeData as SwimmingData;
        return (
          <div className="space-y-1.5">
            <FieldRow
              label={t('training:swimming.poolLength')}
              value={d.pool_length_m != null ? `${d.pool_length_m} m` : null}
            />
            <FieldRow label={t('training:swimming.laps')} value={d.laps != null ? String(d.laps) : null} />
            <FieldRow
              label={t('training:swimming.strokeType')}
              value={d.stroke_type ? t(`training:swimming.strokeOptions.${d.stroke_type}` as never) : null}
            />
            <FieldRow label={t('training:swimming.drillDescription')} value={d.drill_description ?? null} />
          </div>
        );
      }
      case 'walk': {
        const d = typeData as WalkData;
        return (
          <div className="space-y-1.5">
            <FieldRow
              label={t('training:walkHike.terrain')}
              value={d.terrain ? t(`training:walkHike.terrainOptions.${d.terrain}` as never) : null}
            />
            <FieldRow
              label={t('training:walkHike.elevationGain')}
              value={d.elevation_gain_m != null ? `${d.elevation_gain_m} m` : null}
            />
          </div>
        );
      }
      case 'hike': {
        const d = typeData as HikeData;
        return (
          <div className="space-y-1.5">
            <FieldRow
              label={t('training:walkHike.terrain')}
              value={d.terrain ? t(`training:walkHike.terrainOptions.${d.terrain}` as never) : null}
            />
            <FieldRow
              label={t('training:walkHike.elevationGain')}
              value={d.elevation_gain_m != null ? `${d.elevation_gain_m} m` : null}
            />
          </div>
        );
      }
      case 'rest_day': {
        const d = typeData as RestDayData;
        return (
          <FieldRow label={t('training:restDay.activitySuggestion')} value={d.activity_suggestion ?? null} />
        );
      }
      default:
        return null;
    }
  }

  /** Top action bar shared by desktop header and mobile sheet header */
  const actionBar = (closeButton: React.ReactNode) => (
    <div className="flex items-center gap-1">
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

      <div className="flex-1" />

      {!readonly && (onEdit || onDelete) && (
        <>
          {onEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => {
                // Don't close the detail modal — the edit form opens on top as a stacked
                // dialog. When the form closes (save or cancel) the user lands back here
                // with React Query having already refreshed the session data.
                onEdit(session);
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => {
                onOpenChange(false);
                onDelete(session.id);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
          {/* Thin vertical rule separates destructive actions from the neutral close */}
          <div className="w-px h-4 bg-border mx-1" />
        </>
      )}

      {closeButton}
    </div>
  );

  const bodyContent = (
    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
      {/* PLANNED */}
      <div>
        <SectionLabel>{t('training:sessionDetail.planned')}</SectionLabel>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3">
          {session.plannedDurationMinutes != null && (
            <span className="text-sm text-muted-foreground">
              {session.plannedDurationMinutes} {t('training:units.min')}
            </span>
          )}
          {session.plannedDistanceKm != null && (
            <span className="text-sm text-muted-foreground">
              {session.plannedDistanceKm} {t('training:units.km')}
            </span>
          )}
          {session.trainingType === 'run' && (session.typeSpecificData as RunData).pace_target && (
            <span className="inline-flex items-center gap-0.5 text-sm font-medium text-blue-700 dark:text-blue-400">
              <Zap className="h-3 w-3" />
              {(session.typeSpecificData as RunData).pace_target}{t('training:units.perKm')}
            </span>
          )}
        </div>
        {renderTypeSpecificFields()}
        {session.coachComments && (
          <p className="text-sm text-muted-foreground italic mt-2">{session.coachComments}</p>
        )}
      </div>

      {/* ACTUAL */}
      {shouldShowActualSection && (
        <div>
          <Separator className="mb-5" />
          <SectionLabel>{t('training:sessionDetail.actual')}</SectionLabel>
          <div
            className={cn(
              'flex flex-wrap gap-x-4 gap-y-2',
              isMasked ? 'blur-[3px] select-none pointer-events-none' : ''
            )}
            title={isMasked ? t('common:strava.waitingForConfirmation') : ''}
          >
            {(shouldShowMaskedPlaceholders || session.actualDurationMinutes != null) && (
              <div className="flex flex-col min-w-[60px]">
                <span className="text-[10px] text-muted-foreground uppercase tracking-tight">
                  {t('training:actualPerformance.duration')}
                </span>
                <span className="text-sm font-semibold">
                  {isMasked ? '---' : `${session.actualDurationMinutes} ${t('training:units.min')}`}
                </span>
              </div>
            )}
            {(shouldShowMaskedPlaceholders || (session.actualDistanceKm != null && session.actualDistanceKm > 0)) && (
              <div className="flex flex-col min-w-[60px]">
                <span className="text-[10px] text-muted-foreground uppercase tracking-tight">
                  {t('training:actualPerformance.distance')}
                </span>
                <span className="text-sm font-semibold">
                  {isMasked ? '---' : `${session.actualDistanceKm} ${t('training:units.km')}`}
                </span>
              </div>
            )}
            {(shouldShowMaskedPlaceholders || session.actualPace != null) && (
              <div className="flex flex-col min-w-[60px]">
                <span className="text-[10px] text-muted-foreground uppercase tracking-tight">
                  {t('training:actualPerformance.pace')}
                </span>
                <span className="text-sm font-semibold">
                  {isMasked ? '---' : `${session.actualPace} ${t('training:units.perKm')}`}
                </span>
              </div>
            )}
            {(shouldShowMaskedPlaceholders || session.avgHeartRate != null) && (
              <div className="flex flex-col min-w-[60px]">
                <span className="text-[10px] text-muted-foreground uppercase tracking-tight">
                  {t('training:actualPerformance.avgHr')}
                </span>
                <span className="text-sm font-semibold">
                  {isMasked ? '---' : `${session.avgHeartRate} ${t('training:units.bpm')}`}
                </span>
              </div>
            )}
            {(shouldShowMaskedPlaceholders || session.maxHeartRate != null) && (
              <div className="flex flex-col min-w-[60px]">
                <span className="text-[10px] text-muted-foreground uppercase tracking-tight">
                  {t('training:actualPerformance.maxHr')}
                </span>
                <span className="text-sm font-semibold">
                  {isMasked ? '---' : `${session.maxHeartRate} ${t('training:units.bpm')}`}
                </span>
              </div>
            )}
            {(shouldShowMaskedPlaceholders || session.rpe != null) && (
              <div className="flex flex-col min-w-[60px]">
                <span className="text-[10px] text-muted-foreground uppercase tracking-tight">
                  {t('training:actualPerformance.rpe')}
                </span>
                <span className="text-sm font-semibold">
                  {isMasked ? '---' : `${session.rpe}/10`}
                </span>
              </div>
            )}
          </div>

          {/* Strava link + logo */}
          {session.stravaActivityId != null && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-dashed border-[color:var(--separator)]">
              <a
                href={`https://www.strava.com/activities/${session.stravaActivityId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-bold hover:underline"
                style={{ color: '#FC5200' }}
              >
                View on Strava
              </a>
              <StravaLogo />
            </div>
          )}

          {/* Intervals — lazy loaded, run + Strava only */}
          {lapsEnabled && (
            <div className="mt-3 space-y-3">
              {lapsLoading && <Skeleton className="h-32 w-full rounded-lg" />}
              {!lapsLoading && lapsError && (
                <button
                  onClick={() => refetchLaps()}
                  className="inline-flex items-center gap-1 text-sm text-destructive hover:underline"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {t('training:intervals.retry')}
                </button>
              )}
              {!lapsLoading && !lapsError && hasRealIntervals && laps && (
                <>
                  <Separator />
                  <IntervalChart laps={laps} />
                  <Separator />
                  <LapTable laps={laps} />
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ACTIONS */}
      {(athleteMode || showAthleteControls) && !isRestDay && (
        <div>
          <Separator className="mb-5" />
          <div className="space-y-2">
            <CompletionToggle
              isCompleted={session.isCompleted}
              onChange={(completed) => onToggleComplete?.(session.id, completed)}
            />

            {session.isCompleted && (
              <PerformanceEntry
                session={session}
                onChange={(update) => onUpdatePerformance?.(session.id, update)}
              />
            )}

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

            {session.stravaActivityId && !session.isStravaConfirmed && userRole === 'athlete' && (
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

            <AthleteFeedback
              notes={session.athleteNotes}
              onChange={(notes) => onUpdateNotes?.(session.id, notes)}
            />
          </div>
        </div>
      )}

      {/* NOTES & FEEDBACK */}
      {(session.isCompleted || (!athleteMode && session.athleteNotes)) && (
        <div>
          <Separator className="mb-5" />

          {/* Coach post-training notes — editable for coach, read-only for athlete */}
          {session.isCompleted && (
            <div className="mb-3">
              <SectionLabel>{t('training:coachPostFeedback.label')}</SectionLabel>
              {!athleteMode ? (
                <Textarea
                  value={coachFeedback}
                  placeholder={t('training:coachPostFeedback.placeholder')}
                  rows={3}
                  className="text-sm resize-none"
                  onChange={(e) => setCoachFeedback(e.target.value)}
                  onBlur={() => {
                    const val = coachFeedback || null;
                    if (val !== session.coachPostFeedback) {
                      onUpdateCoachPostFeedback?.(session.id, val);
                    }
                  }}
                />
              ) : session.coachPostFeedback ? (
                <p className="text-sm text-muted-foreground italic">{session.coachPostFeedback}</p>
              ) : (
                <p className="text-sm text-muted-foreground/50 italic">
                  {t('training:coachPostFeedback.empty')}
                </p>
              )}
            </div>
          )}

          {/* Athlete notes — visible to coach only */}
          {!athleteMode && session.athleteNotes && (
            <div>
              <SectionLabel>{t('training:athleteNotes.label')}</SectionLabel>
              <p className="text-sm italic">{session.athleteNotes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const titleText = session.description ?? t(`common:trainingTypes.${session.trainingType}` as never);

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" showCloseButton={false} className="rounded-t-2xl max-h-[92vh] flex flex-col gap-0 p-0">
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="h-1 w-10 rounded-full bg-border" />
          </div>
          <div className="px-6 pt-3 pb-4 border-b shrink-0">
            {actionBar(null)}
            <SheetTitle className="text-lg font-semibold mt-2 leading-tight">{titleText}</SheetTitle>
            {dateStr && <p className="text-sm text-muted-foreground mt-0.5">{dateStr}</p>}
          </div>
          {bodyContent}
          <div className="px-6 py-4 border-t flex justify-end shrink-0">
            <SheetClose asChild>
              <Button variant="outline">{t('common:actions.close')}</Button>
            </SheetClose>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
        <div className="px-6 pt-5 pb-4 border-b shrink-0">
          {actionBar(
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          )}
          <DialogTitle className="text-lg font-semibold mt-2 leading-tight">{titleText}</DialogTitle>
          {dateStr && <p className="text-sm text-muted-foreground mt-0.5">{dateStr}</p>}
        </div>
        {bodyContent}
        <div className="px-6 py-4 border-t flex justify-end shrink-0">
          <DialogClose asChild>
            <Button variant="outline">{t('common:actions.close')}</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
