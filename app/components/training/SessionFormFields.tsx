import { useTranslation } from 'react-i18next';
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import { Badge } from '~/components/ui/badge';
import { trainingTypeConfig } from '~/lib/utils/training-types';
import { cn } from '~/lib/utils';
import { RunFields } from './type-fields/RunFields';
import { CyclingFields } from './type-fields/CyclingFields';
import { StrengthFields } from './type-fields/StrengthFields';
import { StrengthVariantField } from '~/components/strength/StrengthVariantField';
import { YogaMobilityFields } from './type-fields/YogaMobilityFields';
import { SwimmingFields } from './type-fields/SwimmingFields';
import { RestDayFields } from './type-fields/RestDayFields';
import { WalkHikeFields } from './type-fields/WalkHikeFields';
import {
  TRAINING_TYPES,
  type TrainingType,
  type TypeSpecificData,
  type RunData,
  type CyclingData,
  type StrengthData,
  type YogaMobilityData,
  type SwimmingData,
  type WalkData,
  type RestDayData,
  type StrengthVariant,
  type StrengthSessionExercise,
} from '~/types/training';

export type FormTab = 'plan' | 'details';

interface SessionFormFieldsProps {
  trainingType: TrainingType;
  onTypeChange: (type: TrainingType) => void;
  description: string;
  onDescriptionChange: (v: string) => void;
  coachComments: string;
  onCoachCommentsChange: (v: string) => void;
  durationMinutes: string;
  onDurationChange: (v: string) => void;
  distanceKm: string;
  onDistanceChange: (v: string) => void;
  typeData: Partial<TypeSpecificData>;
  onTypeDataChange: (v: Partial<TypeSpecificData>) => void;
  isCoach: boolean;
  activeTab: FormTab;
  onTabChange: (tab: FormTab) => void;
  // Strength variant pre-fill (optional — only used for strength sessions)
  strengthVariants?: StrengthVariant[];
  onVariantChange?: (variantId: string | undefined) => void;
  strengthPrefillData?: Record<string, StrengthSessionExercise>;
  strengthPrefillDate?: string | null;
}

export function SessionFormFields({
  trainingType,
  onTypeChange,
  description,
  onDescriptionChange,
  coachComments,
  onCoachCommentsChange,
  durationMinutes,
  onDurationChange,
  distanceKm,
  onDistanceChange,
  typeData,
  onTypeDataChange,
  isCoach,
  activeTab,
  onTabChange,
  strengthVariants,
  onVariantChange,
  strengthPrefillData,
  strengthPrefillDate,
}: SessionFormFieldsProps) {
  const { t } = useTranslation(['coach', 'common', 'training']);
  const isDistanceBased = ['run', 'cycling', 'swimming', 'walk', 'hike'].includes(trainingType);

  const renderTypeFields = () => {
    switch (trainingType) {
      case 'run':
        return <RunFields data={typeData as Partial<RunData>} onChange={onTypeDataChange} />;
      case 'cycling':
        return (
          <CyclingFields data={typeData as Partial<CyclingData>} onChange={onTypeDataChange} />
        );
      case 'strength':
        return (
          <StrengthFields
            data={typeData as Partial<StrengthData>}
            variants={strengthVariants}
            prefillData={strengthPrefillData}
            prefillDate={strengthPrefillDate}
          />
        );
      case 'yoga':
      case 'mobility':
        return (
          <YogaMobilityFields
            data={typeData as Partial<YogaMobilityData>}
            onChange={onTypeDataChange}
          />
        );
      case 'swimming':
        return (
          <SwimmingFields data={typeData as Partial<SwimmingData>} onChange={onTypeDataChange} />
        );
      case 'walk':
      case 'hike':
        return <WalkHikeFields data={typeData as Partial<WalkData>} onChange={onTypeDataChange} />;
      case 'rest_day':
        return (
          <RestDayFields data={typeData as Partial<RestDayData>} onChange={onTypeDataChange} />
        );
      default:
        return null;
    }
  };

  return (
    <div>
      {/* Tab Navigation */}
      <div className="mb-6 flex gap-1 rounded-xl bg-muted p-1">
        {(['plan', 'details'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => onTabChange(tab)}
            className={cn(
              'flex-1 rounded-lg py-2.5 text-xs font-semibold transition-colors',
              activeTab === tab
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t(`coach:session.tabs.${tab}` as never)}
          </button>
        ))}
      </div>

      {/* Plan Tab */}
      {activeTab === 'plan' && (
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              {t('coach:session.type')}
            </label>
            <div className="flex flex-wrap gap-2">
              {TRAINING_TYPES.map((tt) => {
                const config = trainingTypeConfig[tt];
                const isSelected = trainingType === tt;
                return (
                  <Badge
                    key={tt}
                    variant={isSelected ? 'default' : 'outline'}
                    className={cn(
                      'cursor-pointer transition-colors',
                      isSelected ? `${config.bgColor} ${config.color} border-0` : 'hover:bg-muted',
                    )}
                    onClick={() => onTypeChange(tt)}
                  >
                    {t(`common:trainingTypes.${tt}`)}
                  </Badge>
                );
              })}
            </div>
          </div>

          {trainingType === 'strength' && strengthVariants !== undefined && (
            <StrengthVariantField
              variants={strengthVariants}
              selectedVariantId={(typeData as Partial<StrengthData>).variantId ?? null}
              onSelect={(id) => onVariantChange?.(id ?? undefined)}
              isCoach={isCoach}
            />
          )}

          <div className="space-y-2">
            <label className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              {t('coach:session.description')}
            </label>
            <Textarea
              placeholder={t('coach:session.descriptionPlaceholder')}
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              rows={3}
            />
          </div>

          <div
            className={cn(
              'grid gap-4',
              isDistanceBased ? 'grid-cols-2' : 'max-w-[50%] grid-cols-1',
            )}
          >
            <div className="space-y-2">
              <label className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                {t('coach:session.duration')}
              </label>
              <Input
                type="number"
                placeholder="0"
                value={durationMinutes}
                onChange={(e) => onDurationChange(e.target.value)}
              />
            </div>
            {isDistanceBased && (
              <div className="space-y-2">
                <label className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                  {t('coach:session.distance')}
                </label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="0"
                  value={distanceKm}
                  onChange={(e) => onDistanceChange(e.target.value)}
                />
              </div>
            )}
          </div>

          {trainingType === 'run' && (
            <div className="space-y-2">
              <label className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                {t('training:run.paceTarget')}
              </label>
              <Input
                placeholder="5:30"
                value={(typeData as Partial<RunData>).pace_target ?? ''}
                onChange={(e) =>
                  onTypeDataChange({
                    ...typeData,
                    pace_target: e.target.value || undefined,
                  })
                }
              />
              <p className="mt-1 text-[10px] text-muted-foreground">
                {t('training:run.paceTargetHint')}
              </p>
            </div>
          )}

          {isCoach && (
            <div className="space-y-2">
              <label className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                {t('coach:session.coachComments')}
              </label>
              <Textarea
                placeholder={t('coach:session.coachCommentsPlaceholder')}
                value={coachComments}
                onChange={(e) => onCoachCommentsChange(e.target.value)}
                rows={3}
              />
            </div>
          )}
        </div>
      )}

      {/* Details Tab */}
      {activeTab === 'details' && (
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              {t(`common:trainingTypes.${trainingType}`)}
            </label>
            {renderTypeFields()}
          </div>
        </div>
      )}
    </div>
  );
}
