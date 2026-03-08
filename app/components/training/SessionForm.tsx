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
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import { Badge } from '~/components/ui/badge';
import { Separator } from '~/components/ui/separator';
import { trainingTypeConfig } from '~/lib/utils/training-types';
import { RunFields } from './type-fields/RunFields';
import { CyclingFields } from './type-fields/CyclingFields';
import { StrengthFields } from './type-fields/StrengthFields';
import { YogaMobilityFields } from './type-fields/YogaMobilityFields';
import { SwimmingFields } from './type-fields/SwimmingFields';
import { RestDayFields } from './type-fields/RestDayFields';
import {
  TRAINING_TYPES,
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
  const { t } = useTranslation(['coach', 'common', 'training']);
  const isEditing = !!session;

  const [trainingType, setTrainingType] = useState<TrainingType>(
    session?.trainingType ?? 'run'
  );
  const [description, setDescription] = useState(session?.description ?? '');
  const [coachComments, setCoachComments] = useState(
    session?.coachComments ?? ''
  );
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
    // Reset type-specific data when type changes, but handle yoga/mobility sharing
    if (newType === 'yoga' || newType === 'mobility') {
      setTypeData({ type: newType });
    } else {
      setTypeData({ type: newType } as TypeSpecificData);
    }
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

  const renderTypeFields = () => {
    switch (trainingType) {
      case 'run':
        return <RunFields data={typeData as Partial<import('~/types/training').RunData>} onChange={setTypeData} />;
      case 'cycling':
        return <CyclingFields data={typeData as Partial<import('~/types/training').CyclingData>} onChange={setTypeData} />;
      case 'strength':
        return <StrengthFields data={typeData as Partial<import('~/types/training').StrengthData>} onChange={setTypeData} />;
      case 'yoga':
      case 'mobility':
        return <YogaMobilityFields data={typeData as Partial<import('~/types/training').YogaMobilityData>} onChange={setTypeData} />;
      case 'swimming':
        return <SwimmingFields data={typeData as Partial<import('~/types/training').SwimmingData>} onChange={setTypeData} />;
      case 'rest_day':
        return <RestDayFields data={typeData as Partial<import('~/types/training').RestDayData>} onChange={setTypeData} />;
      default:
        return null;
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>
            {isEditing ? t('coach:session.edit') : t('coach:session.create')}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 py-4">
          {/* Training Type Selector */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              {t('coach:session.type')}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {TRAINING_TYPES.map((tt) => {
                const config = trainingTypeConfig[tt];
                const isSelected = trainingType === tt;
                return (
                  <Badge
                    key={tt}
                    variant={isSelected ? 'default' : 'outline'}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? `${config.bgColor} ${config.color} border-0`
                        : 'hover:bg-muted'
                    }`}
                    onClick={() => handleTypeChange(tt)}
                  >
                    {t(`common:trainingTypes.${tt}`)}
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* Common Fields */}
          <div>
            <label className="text-sm font-medium">
              {t('coach:session.description')}
            </label>
            <Textarea
              placeholder={t('coach:session.descriptionPlaceholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">
                {t('coach:session.duration')}
              </label>
              <Input
                type="number"
                placeholder="0"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">
                {t('coach:session.distance')}
              </label>
              <Input
                type="number"
                step="0.1"
                placeholder="0"
                value={distanceKm}
                onChange={(e) => setDistanceKm(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">
              {t('coach:session.coachComments')}
            </label>
            <Textarea
              placeholder={t('coach:session.coachCommentsPlaceholder')}
              value={coachComments}
              onChange={(e) => setCoachComments(e.target.value)}
              rows={2}
            />
          </div>

          {/* Type-specific fields */}
          {trainingType !== 'rest_day' || true ? (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold mb-3">
                  {t(`common:trainingTypes.${trainingType}`)} details
                </h4>
                {renderTypeFields()}
              </div>
            </>
          ) : null}

          {/* Actual Performance */}
          <Separator />
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">
              {t('training:actualPerformance.title')}
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">
                  {t('training:actualPerformance.duration')} ({t('training:units.min')})
                </label>
                <Input
                  type="number"
                  placeholder="0"
                  value={actualDuration}
                  onChange={(e) => setActualDuration(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  {t('training:actualPerformance.distance')} ({t('training:units.km')})
                </label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0"
                  value={actualDistance}
                  onChange={(e) => setActualDistance(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">
                {t('training:actualPerformance.pace')} ({t('training:units.perKm')})
              </label>
              <Input
                placeholder="5:30"
                value={actualPace}
                onChange={(e) => setActualPace(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium">
                  {t('training:actualPerformance.avgHr')} ({t('training:units.bpm')})
                </label>
                <Input
                  type="number"
                  placeholder="0"
                  value={avgHr}
                  onChange={(e) => setAvgHr(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  {t('training:actualPerformance.maxHr')} ({t('training:units.bpm')})
                </label>
                <Input
                  type="number"
                  placeholder="0"
                  value={maxHr}
                  onChange={(e) => setMaxHr(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  {t('training:actualPerformance.rpe')} (1–10)
                </label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  placeholder="–"
                  value={rpe}
                  onChange={(e) => setRpe(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">
                {t('training:coachPostFeedback.label')}
              </label>
              <Textarea
                placeholder={t('training:coachPostFeedback.placeholder')}
                value={coachPostFeedback}
                onChange={(e) => setCoachPostFeedback(e.target.value)}
                rows={2}
              />
            </div>
          </div>
        </div>

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
