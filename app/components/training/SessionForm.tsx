import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '~/components/ui/sheet';
import { Button } from '~/components/ui/button';
import { SessionFormFields } from './SessionFormFields';
import {
  type TrainingType,
  type DayOfWeek,
  type TrainingSession,
  type TypeSpecificData,
  type CreateSessionInput,
  type UpdateSessionInput,
} from '~/types/training';

interface SessionFormProps {
  open: boolean;
  onClose: () => void;
  weekPlanId: string;
  day?: DayOfWeek;
  session?: TrainingSession | null;
  onSubmit: (data: CreateSessionInput | UpdateSessionInput) => void;
}

export function SessionForm({
  open,
  onClose,
  weekPlanId,
  day,
  session,
  onSubmit,
}: SessionFormProps) {
  const { t } = useTranslation(['coach', 'common']);
  const isEditing = !!session;

  const [trainingType, setTrainingType] = useState<TrainingType>(
    session?.trainingType ?? 'run'
  );
  const [description, setDescription] = useState(session?.description ?? '');
  const [coachComments, setCoachComments] = useState(session?.coachComments ?? '');
  const [durationMinutes, setDurationMinutes] = useState(
    session?.plannedDurationMinutes?.toString() ?? ''
  );
  const [distanceKm, setDistanceKm] = useState(
    session?.plannedDistanceKm?.toString() ?? ''
  );
  const [typeData, setTypeData] = useState<Partial<TypeSpecificData>>(
    session?.typeSpecificData ?? { type: 'run' }
  );
  const [actualDuration, setActualDuration] = useState(
    session?.actualDurationMinutes?.toString() ?? ''
  );
  const [actualDistance, setActualDistance] = useState(
    session?.actualDistanceKm?.toString() ?? ''
  );
  const [actualPace, setActualPace] = useState(session?.actualPace ?? '');
  const [avgHr, setAvgHr] = useState(session?.avgHeartRate?.toString() ?? '');
  const [maxHr, setMaxHr] = useState(session?.maxHeartRate?.toString() ?? '');
  const [rpe, setRpe] = useState(session?.rpe?.toString() ?? '');
  const [coachPostFeedback, setCoachPostFeedback] = useState(
    session?.coachPostFeedback ?? ''
  );

  useEffect(() => {
    if (session) {
      setTrainingType(session.trainingType);
      setDescription(session.description ?? '');
      setCoachComments(session.coachComments ?? '');
      setDurationMinutes(session.plannedDurationMinutes?.toString() ?? '');
      setDistanceKm(session.plannedDistanceKm?.toString() ?? '');
      setTypeData(session.typeSpecificData ?? { type: session.trainingType });
      setActualDuration(session.actualDurationMinutes?.toString() ?? '');
      setActualDistance(session.actualDistanceKm?.toString() ?? '');
      setActualPace(session.actualPace ?? '');
      setAvgHr(session.avgHeartRate?.toString() ?? '');
      setMaxHr(session.maxHeartRate?.toString() ?? '');
      setRpe(session.rpe?.toString() ?? '');
      setCoachPostFeedback(session.coachPostFeedback ?? '');
    } else {
      setTrainingType('run');
      setDescription('');
      setCoachComments('');
      setDurationMinutes('');
      setDistanceKm('');
      setTypeData({ type: 'run' });
      setActualDuration('');
      setActualDistance('');
      setActualPace('');
      setAvgHr('');
      setMaxHr('');
      setRpe('');
      setCoachPostFeedback('');
    }
  }, [session, open]);

  const handleTypeChange = (newType: TrainingType) => {
    setTrainingType(newType);
    setTypeData({ type: newType } as TypeSpecificData);
  };

  const handleSubmit = () => {
    const typeSpecificData = { ...typeData, type: trainingType } as TypeSpecificData;
    const actualFields = {
      actualDurationMinutes: actualDuration ? parseInt(actualDuration) : null,
      actualDistanceKm: actualDistance ? parseFloat(actualDistance) : null,
      actualPace: actualPace || null,
      avgHeartRate: avgHr ? parseInt(avgHr) : null,
      maxHeartRate: maxHr ? parseInt(maxHr) : null,
      rpe: rpe ? parseInt(rpe) : null,
      coachPostFeedback: coachPostFeedback || null,
    };

    if (isEditing && session) {
      onSubmit({
        id: session.id,
        trainingType,
        description: description || null,
        coachComments: coachComments || null,
        plannedDurationMinutes: durationMinutes ? parseInt(durationMinutes) : null,
        plannedDistanceKm: distanceKm ? parseFloat(distanceKm) : null,
        typeSpecificData,
        ...actualFields,
      } satisfies UpdateSessionInput);
    } else {
      onSubmit({
        weekPlanId,
        dayOfWeek: day!,
        trainingType,
        description: description || undefined,
        coachComments: coachComments || undefined,
        plannedDurationMinutes: durationMinutes ? parseInt(durationMinutes) : undefined,
        plannedDistanceKm: distanceKm ? parseFloat(distanceKm) : undefined,
        typeSpecificData,
        ...Object.fromEntries(
          Object.entries(actualFields).map(([k, v]) => [k, v ?? undefined])
        ),
      } satisfies CreateSessionInput);
    }
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>
            {isEditing ? t('coach:session.edit') : t('coach:session.create')}
          </SheetTitle>
        </SheetHeader>

        <SessionFormFields
          trainingType={trainingType}
          onTypeChange={handleTypeChange}
          description={description}
          onDescriptionChange={setDescription}
          coachComments={coachComments}
          onCoachCommentsChange={setCoachComments}
          durationMinutes={durationMinutes}
          onDurationChange={setDurationMinutes}
          distanceKm={distanceKm}
          onDistanceChange={setDistanceKm}
          typeData={typeData}
          onTypeDataChange={setTypeData}
          actualDuration={actualDuration}
          onActualDurationChange={setActualDuration}
          actualDistance={actualDistance}
          onActualDistanceChange={setActualDistance}
          actualPace={actualPace}
          onActualPaceChange={setActualPace}
          avgHr={avgHr}
          onAvgHrChange={setAvgHr}
          maxHr={maxHr}
          onMaxHrChange={setMaxHr}
          rpe={rpe}
          onRpeChange={setRpe}
          coachPostFeedback={coachPostFeedback}
          onCoachPostFeedbackChange={setCoachPostFeedback}
        />

        <SheetFooter>
          <Button variant="outline" onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button onClick={handleSubmit}>
            {isEditing ? t('common:actions.save') : t('coach:session.create')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
