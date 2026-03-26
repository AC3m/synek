import { useState } from 'react';
import { Clock, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '~/lib/utils';
import { Button } from '~/components/ui/button';
import { ProgressionToggle } from '~/components/strength/ProgressionToggle';
import { SUPERSET_COLORS, getSupersetColor, formatRepsTarget, groupExercises } from '~/lib/utils/strength';
import type { StrengthVariantExercise, StrengthSessionExercise } from '~/types/training';

interface VariantExerciseListProps {
  exercises: StrengthVariantExercise[];
  lastSessionData?: Record<string, StrengthSessionExercise>;
  lastSessionDate?: string | null;
  showProgressionHints?: boolean;
  onAcceptAll?: () => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Exercise item (shared between standalone and superset rendering)
// ---------------------------------------------------------------------------

function ExerciseItem({
  ex,
  lastSessionData,
  showProgressionHints,
  isPrefilled,
}: {
  ex: StrengthVariantExercise;
  lastSessionData?: Record<string, StrengthSessionExercise>;
  showProgressionHints: boolean;
  isPrefilled: boolean;
}) {
  const lastData = lastSessionData?.[ex.id];

  return (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-sm">{ex.name}</span>
          {ex.videoUrl && (
            <a
              href={ex.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground"
              aria-label={`Watch ${ex.name} demo`}
            >
              <ExternalLink className="size-3.5" />
            </a>
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {ex.sets} sets · target: {formatRepsTarget(ex.repsMin, ex.repsMax)} reps
        </p>

        {lastData ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Last: {lastData.actualReps ?? '—'} reps
            {lastData.loadKg != null && lastData.loadKg > 0
              ? ` @ ${lastData.loadKg} ${ex.loadUnit === 'sec' ? 's' : 'kg'}`
              : ''}
          </p>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">—</p>
        )}
      </div>

      {showProgressionHints && lastData?.progression && (
        <ProgressionToggle value={lastData.progression} onChange={() => {}} readOnly />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// VariantExerciseList
// ---------------------------------------------------------------------------

export function VariantExerciseList({
  exercises,
  lastSessionData,
  lastSessionDate,
  showProgressionHints = false,
  onAcceptAll,
  className,
}: VariantExerciseListProps) {
  const { t } = useTranslation('training');
  const [accepted, setAccepted] = useState(false);

  const hasPrefill = lastSessionData && Object.keys(lastSessionData).length > 0;
  const hasLastSession = !!lastSessionDate;

  function handleAcceptAll() {
    setAccepted(true);
    onAcceptAll?.();
  }

  const groups = groupExercises(exercises);

  return (
    <div className={cn('space-y-3', className)}>
      {/* Provenance header */}
      {hasPrefill && hasLastSession ? (
        <div className="flex items-center justify-between gap-3 rounded-md bg-muted/50 px-3 py-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3.5" />
            <span>
              {t('strength.variant.fromDate', {
                date: new Date(lastSessionDate!).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                }),
              })}
            </span>
          </div>
          {onAcceptAll && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleAcceptAll}
              disabled={accepted}
              className="h-7 text-xs"
            >
              {accepted ? t('strength.variant.acceptedAll') : t('strength.variant.acceptAll')}
            </Button>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{t('strength.variant.firstSession')}</p>
      )}

      {/* Exercise list */}
      <ul className="space-y-2">
        {groups.map((group) => {
          if (group.length === 1) {
            const ex = group[0];
            const isPrefilled = !!lastSessionData?.[ex.id];
            return (
              <li
                key={ex.id}
                className={cn(
                  'rounded-lg border p-3',
                  isPrefilled && 'border-l-2 border-l-orange-300',
                )}
              >
                <ExerciseItem
                  ex={ex}
                  lastSessionData={lastSessionData}
                  showProgressionHints={showProgressionHints}
                  isPrefilled={isPrefilled}
                />
              </li>
            );
          }

          // Superset group — color by group ID
          const color = getSupersetColor(group[0].supersetGroup!);
          return (
            <li key={group[0].id} className={cn('rounded-lg border overflow-hidden', color.container)}>
              <div className={cn('px-3 py-1.5', color.header)}>
                <span className={cn('text-[10px] font-semibold uppercase tracking-widest', color.label)}>
                  {t('strength.superset.label')}
                </span>
              </div>
              <ul className="divide-y divide-border">
                {group.map((ex) => {
                  const isPrefilled = !!lastSessionData?.[ex.id];
                  return (
                    <li
                      key={ex.id}
                      className={cn('p-3', isPrefilled && 'border-l-2 border-l-orange-300')}
                    >
                      <ExerciseItem
                        ex={ex}
                        lastSessionData={lastSessionData}
                        showProgressionHints={showProgressionHints}
                        isPrefilled={isPrefilled}
                      />
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
