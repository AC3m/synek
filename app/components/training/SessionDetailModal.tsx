import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import { getSessionCalendarDate } from '~/lib/utils/date';
import { Pencil, Trash2, X, Zap } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Textarea } from '~/components/ui/textarea';
import { Separator } from '~/components/ui/separator';
import { Dialog, DialogContent, DialogTitle, DialogClose } from '~/components/ui/dialog';
import { Sheet, SheetContent, SheetTitle, SheetClose } from '~/components/ui/sheet';
import { useIsMobile } from '~/lib/hooks/useIsMobile';
import { CompletionToggle } from './CompletionToggle';
import { PerformanceEntry } from './PerformanceEntry';
import { AthleteFeedback } from './AthleteFeedback';
import { StravaLogo } from './StravaLogo';
import { StravaSyncButton } from './StravaSyncButton';
import { StravaConfirmButton } from './StravaConfirmButton';
import { SessionIntervals } from './SessionIntervals';
import { useAuth } from '~/lib/context/AuthContext';
import { useSessionActions } from '~/lib/context/SessionActionsContext';
import { GarminSection } from './GarminSection';
import { PerformanceChipGroup } from './PerformanceChipGroup';
import { trainingTypeConfig, iconMap, isDistanceBased } from '~/lib/utils/training-types';
import { cn } from '~/lib/utils';
import { SessionExerciseLogger } from '~/components/strength/SessionExerciseLogger';
import type { LogRowChange } from '~/components/strength/SessionExerciseLogger';
import {
  useStrengthVariant,
  useStrengthSessionExercises,
  useLastSessionExercises,
  useUpsertSessionExercises,
} from '~/lib/hooks/useStrengthVariants';
import type {
  TrainingSession,
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

interface SessionDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: TrainingSession;
  weekStart?: string;
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
      <span className="min-w-[130px] shrink-0 text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
      {children}
    </p>
  );
}

export function SessionDetailModal({
  open,
  onOpenChange,
  session,
  weekStart,
}: SessionDetailModalProps) {
  const { t } = useTranslation(['training', 'common']);
  const isMobile = useIsMobile();
  const { user, effectiveAthleteId } = useAuth();
  const {
    readonly,
    athleteMode,
    showAthleteControls,
    junctionConnected,
    userRole,
    onEdit,
    onDelete,
    onToggleComplete,
    onUpdateNotes,
    onUpdatePerformance,
    onUpdateCoachPostFeedback,
  } = useSessionActions();

  const [coachFeedback, setCoachFeedback] = useState(session.coachPostFeedback ?? '');
  const coachFeedbackRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Don't reset while the coach is actively typing — the blur handler will save and
    // subsequent query invalidation would otherwise clobber in-progress edits.
    if (document.activeElement !== coachFeedbackRef.current) {
      setCoachFeedback(session.coachPostFeedback ?? '');
    }
  }, [session.id, session.coachPostFeedback]);

  const config = trainingTypeConfig[session.trainingType];
  const Icon = iconMap[config.icon] ?? iconMap['Footprints'];
  const isRestDay = session.trainingType === 'rest_day';

  const isMasked =
    session.stravaActivityId != null && !session.isStravaConfirmed && userRole === 'coach';

  const shouldShowMaskedPlaceholders = session.isCompleted && isMasked;

  const calendarDate = getSessionCalendarDate(weekStart, session.dayOfWeek);
  const dayDate = calendarDate ? parseISO(calendarDate) : null;
  const dateStr = dayDate ? format(dayDate, 'EEEE · MMM d') : null;

  // Strength variant logging
  const strengthData =
    session.trainingType === 'strength' ? (session.typeSpecificData as StrengthData) : null;
  const strengthVariantId = strengthData?.variantId;
  const { data: strengthVariant } = useStrengthVariant(open && strengthVariantId ? strengthVariantId : '');
  const { data: sessionExercises = [] } = useStrengthSessionExercises(
    open && strengthVariantId ? session.id : '',
  );
  const exerciseIds = useMemo(
    () => strengthVariant?.exercises.map((ex) => ex.id) ?? [],
    [strengthVariant?.exercises],
  );
  const athleteId = effectiveAthleteId ?? user?.id ?? '';
  const { data: prefillResult } = useLastSessionExercises(
    open && strengthVariantId ? athleteId : '',
    open && strengthVariantId ? exerciseIds : [],
  );
  const { mutate: mutateExercises } = useUpsertSessionExercises();

  const handleStrengthLogChange = useCallback(
    (changes: LogRowChange[]) => {
      if (!strengthVariantId) return;
      mutateExercises({
        sessionId: session.id,
        exercises: changes.map((c, i) => ({
          variantExerciseId: c.variantExerciseId,
          actualReps: c.actualReps,
          loadKg: c.loadKg,
          progression: c.progression,
          setsData: c.setsData,
          sortOrder: i,
        })),
      });
    },
    [strengthVariantId, session.id, mutateExercises],
  );

  const hasActualPerformance = useMemo(
    () =>
      session.actualDurationMinutes != null ||
      session.actualDistanceKm != null ||
      session.actualPace != null ||
      session.avgHeartRate != null ||
      session.maxHeartRate != null ||
      session.rpe != null,
    [
      session.actualDurationMinutes,
      session.actualDistanceKm,
      session.actualPace,
      session.avgHeartRate,
      session.maxHeartRate,
      session.rpe,
    ],
  );

  const shouldShowActualSection =
    session.isCompleted && (hasActualPerformance || shouldShowMaskedPlaceholders);

  const typeData = session.typeSpecificData;
  const distanceBased = isDistanceBased(session.trainingType);

  function renderTypeSpecificFields() {
    if (!typeData) return null;

    switch (typeData.type) {
      case 'run': {
        const d = typeData as RunData;
        return (
          <div className="space-y-1.5">
            <FieldRow
              label={t('training:run.hrZone')}
              value={d.hr_zone ? `Zone ${d.hr_zone}` : null}
            />
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
                <p className="mb-1 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                  {t('training:sessionDetail.plannedIntervals')}
                </p>
                <ul className="space-y-0.5">
                  {d.intervals.map((block, i) => (
                    <li key={i} className="font-mono text-sm font-medium">
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
            <FieldRow
              label={t('training:cycling.hrZone')}
              value={d.hr_zone ? `Zone ${d.hr_zone}` : null}
            />
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
                <p className="mb-1 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                  {t('training:strength.exercises')}
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="pr-3 pb-1 text-left font-medium">
                          {t('training:strength.exercise.name')}
                        </th>
                        <th className="pr-2 pb-1 text-right font-medium">
                          {t('training:strength.exercise.sets')}
                        </th>
                        <th className="pr-2 pb-1 text-right font-medium">
                          {t('training:strength.exercise.reps')}
                        </th>
                        <th className="pb-1 text-right font-medium">
                          {t('training:strength.exercise.weight')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.exercises.map((ex, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="py-1 pr-3 font-medium">{ex.name}</td>
                          <td className="py-1 pr-2 text-right">{ex.sets ?? '—'}</td>
                          <td className="py-1 pr-2 text-right">{ex.reps ?? '—'}</td>
                          <td className="py-1 text-right">
                            {ex.weight_kg != null ? `${ex.weight_kg} kg` : '—'}
                          </td>
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
                <p className="mb-1 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                  {t('training:yogaMobility.poses')}
                </p>
                <ul className="list-inside list-disc space-y-0.5 text-sm">
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
            <FieldRow
              label={t('training:swimming.laps')}
              value={d.laps != null ? String(d.laps) : null}
            />
            <FieldRow
              label={t('training:swimming.strokeType')}
              value={
                d.stroke_type
                  ? t(`training:swimming.strokeOptions.${d.stroke_type}` as never)
                  : null
              }
            />
            <FieldRow
              label={t('training:swimming.drillDescription')}
              value={d.drill_description ?? null}
            />
          </div>
        );
      }
      case 'walk':
      case 'hike': {
        const d = typeData as WalkData | HikeData;
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
          <FieldRow
            label={t('training:restDay.activitySuggestion')}
            value={d.activity_suggestion ?? null}
          />
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
          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
          config.bgColor,
          config.color,
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
          <div className="mx-1 h-4 w-px bg-border" />
        </>
      )}

      {closeButton}
    </div>
  );

  const bodyContent = (
    <div className="flex-1 space-y-5 overflow-y-auto px-6 py-4">
      {/* PLANNED */}
      <div>
        <SectionLabel>{t('training:sessionDetail.planned')}</SectionLabel>
        <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1">
          {session.plannedDurationMinutes != null && (
            <span className="text-sm text-muted-foreground">
              {session.plannedDurationMinutes} {t('training:units.min')}
            </span>
          )}
          {distanceBased && session.plannedDistanceKm != null && (
            <span className="text-sm text-muted-foreground">
              {session.plannedDistanceKm} {t('training:units.km')}
            </span>
          )}
          {session.trainingType === 'run' && (session.typeSpecificData as RunData).pace_target && (
            <span className="inline-flex items-center gap-0.5 text-sm font-medium text-blue-700 dark:text-blue-400">
              <Zap className="h-3 w-3" />
              {(session.typeSpecificData as RunData).pace_target}
              {t('training:units.perKm')}
            </span>
          )}
        </div>
        {renderTypeSpecificFields()}
        {session.coachComments && (
          <p className="mt-2 text-sm text-muted-foreground italic">{session.coachComments}</p>
        )}
      </div>

      {/* STRENGTH LOGGER — shown when session is linked to a variant */}
      {strengthVariantId && strengthVariant && (
        <div>
          <Separator className="mb-5" />
          <SessionExerciseLogger
            exercises={strengthVariant.exercises}
            loggedExercises={sessionExercises}
            prefillData={prefillResult?.data}
            readOnly={userRole === 'coach' && !showAthleteControls}
            variantName={strengthVariant.name}
            onChange={handleStrengthLogChange}
          />
        </div>
      )}

      {/* ACTUAL */}
      {shouldShowActualSection && (
        <div>
          <Separator className="mb-5" />
          <SectionLabel>{t('training:sessionDetail.actual')}</SectionLabel>
          <PerformanceChipGroup
            session={session}
            isMasked={isMasked}
            shouldShowMaskedPlaceholders={shouldShowMaskedPlaceholders}
            size="default"
          />

          {/* Strava link + logo */}
          {session.stravaActivityId != null && (
            <div className="mt-3 flex items-center justify-between border-t border-dashed border-[color:var(--separator)] pt-3">
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

          <SessionIntervals
            session={session}
            open={open}
            userRole={userRole}
            className="mt-3 animate-in space-y-3 duration-300 fade-in"
          />
        </div>
      )}

      {/* Garmin performance — PoC: Junction integration */}
      <GarminSection
        appUserId={user?.id ?? ''}
        calendarDate={calendarDate}
        trainingType={session.trainingType}
        junctionConnected={junctionConnected}
        variant="modal"
      />

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

            <StravaSyncButton
              sessionId={session.id}
              isCompleted={session.isCompleted}
              hasStravaActivity={session.stravaActivityId != null}
            />

            <StravaConfirmButton
              sessionId={session.id}
              hasStravaActivity={session.stravaActivityId != null}
              isStravaConfirmed={session.isStravaConfirmed}
            />

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
                  ref={coachFeedbackRef}
                  value={coachFeedback}
                  placeholder={t('training:coachPostFeedback.placeholder')}
                  rows={3}
                  className="resize-none text-sm"
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

  const titleText =
    session.description ?? t(`common:trainingTypes.${session.trainingType}` as never);

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          aria-describedby={undefined}
          className="flex max-h-[92vh] flex-col gap-0 rounded-t-2xl p-0"
        >
          <div className="flex shrink-0 justify-center pt-3 pb-1">
            <div className="h-1 w-10 rounded-full bg-border" />
          </div>
          <div className="shrink-0 border-b px-6 pt-3 pb-4">
            {actionBar(null)}
            <SheetTitle className="mt-2 text-lg leading-tight font-semibold">
              {titleText}
            </SheetTitle>
            {dateStr && <p className="mt-0.5 text-sm text-muted-foreground">{dateStr}</p>}
          </div>
          {bodyContent}
          <div className="flex shrink-0 justify-end border-t px-6 py-4">
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
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        className="flex max-h-[90vh] max-w-2xl flex-col gap-0 p-0"
      >
        <div className="shrink-0 border-b px-6 pt-5 pb-4">
          {actionBar(
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>,
          )}
          <DialogTitle className="mt-2 text-lg leading-tight font-semibold">
            {titleText}
          </DialogTitle>
          {dateStr && <p className="mt-0.5 text-sm text-muted-foreground">{dateStr}</p>}
        </div>
        {bodyContent}
        <div className="flex shrink-0 justify-end border-t px-6 py-4">
          <DialogClose asChild>
            <Button variant="outline">{t('common:actions.close')}</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
