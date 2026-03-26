import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FormModal } from '~/components/ui/form-modal';
import { SessionFormFields, type FormTab } from './SessionFormFields';
import { useAuth } from '~/lib/context/AuthContext';
import { useStrengthVariants, useLastSessionExercises } from '~/lib/hooks/useStrengthVariants';
import {
  type TrainingType,
  type DayOfWeek,
  type TrainingSession,
  type TypeSpecificData,
  type StrengthData,
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
  const isEditing = !!session;
  const { user, effectiveAthleteId } = useAuth();

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
  const [activeTab, setActiveTab] = useState<FormTab>('plan');

  // Strength variant pre-fill
  const athleteId = effectiveAthleteId ?? user?.id ?? '';
  const { data: strengthVariants } = useStrengthVariants(athleteId);
  const currentVariantId =
    trainingType === 'strength' ? (typeData as Partial<StrengthData>).variantId : undefined;
  const currentVariant = currentVariantId
    ? strengthVariants?.find((v) => v.id === currentVariantId)
    : undefined;
  const variantExerciseIds = useMemo(
    () => currentVariant?.exercises.map((ex) => ex.id) ?? [],
    [currentVariantId],
  );
  const { data: prefillResult } = useLastSessionExercises(athleteId, variantExerciseIds);

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
    } else {
      setTrainingType('run');
      setDescription('');
      setCoachComments('');
      setDurationMinutes('');
      setDistanceKm('');
      setTypeData({ type: 'run' });
    }
  }, [session, open]);

  const handleTypeChange = (newType: TrainingType) => {
    setTrainingType(newType);
    setTypeData({ type: newType } as TypeSpecificData);
  };

  const handleVariantChange = (variantId: string | undefined) => {
    setTypeData((prev) => ({
      ...(prev as Partial<StrengthData>),
      type: 'strength' as const,
      variantId,
    }));

    // Auto-set description to variant name unless the user has typed a custom value.
    // "Custom" means the description differs from the previously selected variant's name.
    const prevAutoName = currentVariant?.name ?? '';
    const isAutoDescription = description === '' || description === prevAutoName;
    if (isAutoDescription) {
      const nextVariant = variantId ? strengthVariants?.find((v) => v.id === variantId) : undefined;
      setDescription(nextVariant?.name ?? '');
    }
  };

  const handleSubmit = () => {
    const typeSpecificData = { ...typeData, type: trainingType } as TypeSpecificData;

    if (isEditing && session) {
      onSubmit({
        id: session.id,
        trainingType,
        description: description || null,
        coachComments: coachComments || null,
        plannedDurationMinutes: durationMinutes ? parseInt(durationMinutes) : null,
        plannedDistanceKm: distanceKm ? parseFloat(distanceKm) : null,
        typeSpecificData,
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
      isCoach={isCoach}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      strengthVariants={strengthVariants}
      onVariantChange={handleVariantChange}
      strengthPrefillData={prefillResult?.data}
      strengthPrefillDate={prefillResult?.date}
    />
  );

  const title = isEditing ? t('coach:session.edit') : t('coach:session.create');
  const saveLabel = isEditing ? t('common:actions.save') : t('coach:session.create');

  return (
    <FormModal open={open} onClose={onClose} title={title} onSave={handleSubmit} saveLabel={saveLabel}>
      {formFields}
    </FormModal>
  );
}
