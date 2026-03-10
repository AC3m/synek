import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '~/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Button } from '~/components/ui/button';
import { SessionFormFields, type FormTab } from './SessionFormFields';
import { useIsMobile } from '~/lib/hooks/useIsMobile';
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
  isCoach?: boolean;
  className?: string;
}

export function SessionForm({
  open,
  onClose,
  weekPlanId,
  day,
  session,
  onSubmit,
  isCoach = false,
}: SessionFormProps) {
  const { t } = useTranslation(['coach', 'common']);
  const isMobile = useIsMobile();
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
  const [activeTab, setActiveTab] = useState<FormTab>('plan');

  useEffect(() => {
    setActiveTab('plan');
  }, [open]);

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

  const formFields = (
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
      isCoach={isCoach}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    />
  );

  const title = isEditing ? t('coach:session.edit') : t('coach:session.create');
  const saveLabel = isEditing ? t('common:actions.save') : t('coach:session.create');

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="rounded-t-2xl max-h-[92vh] flex flex-col gap-0 p-0"
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="h-1 w-10 rounded-full bg-border" />
          </div>

          <SheetHeader className="px-5 pt-3 pb-3 border-b shrink-0">
            <SheetTitle>{title}</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {formFields}
          </div>

          <div className="px-5 pt-4 pb-4 border-t flex gap-2 justify-end shrink-0">
            <Button variant="outline" onClick={onClose}>
              {t('common:actions.cancel')}
            </Button>
            <Button onClick={handleSubmit}>{saveLabel}</Button>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-w-lg max-h-[85vh] flex flex-col p-0 gap-0"
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {formFields}
        </div>

        <div className="px-6 py-4 border-t flex gap-2 justify-end shrink-0">
          <Button variant="outline" onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button onClick={handleSubmit}>{saveLabel}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
