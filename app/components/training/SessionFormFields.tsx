import { useTranslation } from 'react-i18next';
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import { Badge } from '~/components/ui/badge';
import { trainingTypeConfig } from '~/lib/utils/training-types';
import { cn } from '~/lib/utils';
import { RunFields } from './type-fields/RunFields';
import { CyclingFields } from './type-fields/CyclingFields';
import { StrengthFields } from './type-fields/StrengthFields';
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
} from '~/types/training';

export type FormTab = 'plan' | 'details' | 'results';

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
  actualDuration: string;
  onActualDurationChange: (v: string) => void;
  actualDistance: string;
  onActualDistanceChange: (v: string) => void;
  actualPace: string;
  onActualPaceChange: (v: string) => void;
  avgHr: string;
  onAvgHrChange: (v: string) => void;
  maxHr: string;
  onMaxHrChange: (v: string) => void;
  rpe: string;
  onRpeChange: (v: string) => void;
  coachPostFeedback: string;
  onCoachPostFeedbackChange: (v: string) => void;
  isCoach: boolean;
  activeTab: FormTab;
  onTabChange: (tab: FormTab) => void;
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
  actualDuration,
  onActualDurationChange,
  actualDistance,
  onActualDistanceChange,
  actualPace,
  onActualPaceChange,
  avgHr,
  onAvgHrChange,
  maxHr,
  onMaxHrChange,
  rpe,
  onRpeChange,
  coachPostFeedback,
  onCoachPostFeedbackChange,
  isCoach,
  activeTab,
  onTabChange,
}: SessionFormFieldsProps) {
  const { t } = useTranslation(['coach', 'common', 'training']);

  const renderTypeFields = () => {
    switch (trainingType) {
      case 'run':
        return <RunFields data={typeData as Partial<RunData>} onChange={onTypeDataChange} />;
      case 'cycling':
        return <CyclingFields data={typeData as Partial<CyclingData>} onChange={onTypeDataChange} />;
      case 'strength':
        return <StrengthFields data={typeData as Partial<StrengthData>} onChange={onTypeDataChange} />;
      case 'yoga':
      case 'mobility':
        return <YogaMobilityFields data={typeData as Partial<YogaMobilityData>} onChange={onTypeDataChange} />;
      case 'swimming':
        return <SwimmingFields data={typeData as Partial<SwimmingData>} onChange={onTypeDataChange} />;
      case 'walk':
      case 'hike':
        return <WalkHikeFields data={typeData as Partial<WalkData>} onChange={onTypeDataChange} />;
      case 'rest_day':
        return <RestDayFields data={typeData as Partial<RestDayData>} onChange={onTypeDataChange} />;
      default:
        return null;
    }
  };

  return (
    <div>
      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl mb-6">
        {(['plan', 'details', 'results'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => onTabChange(tab)}
            className={cn(
              'flex-1 py-2.5 text-xs font-semibold rounded-lg transition-colors',
              activeTab === tab
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
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
            <label className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
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
                      isSelected
                        ? `${config.bgColor} ${config.color} border-0`
                        : 'hover:bg-muted'
                    )}
                    onClick={() => onTypeChange(tt)}
                  >
                    {t(`common:trainingTypes.${tt}`)}
                  </Badge>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {t('coach:session.description')}
            </label>
            <Textarea
              placeholder={t('coach:session.descriptionPlaceholder')}
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {t('coach:session.duration')}
              </label>
              <Input
                type="number"
                placeholder="0"
                value={durationMinutes}
                onChange={(e) => onDurationChange(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
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
          </div>

          {isCoach && (
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
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
            <label className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {t(`common:trainingTypes.${trainingType}`)}
            </label>
            {renderTypeFields()}
          </div>
        </div>
      )}

      {/* Results Tab */}
      {activeTab === 'results' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {t('training:actualPerformance.duration')} ({t('training:units.min')})
              </label>
              <Input
                type="number"
                placeholder="0"
                value={actualDuration}
                onChange={(e) => onActualDurationChange(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {t('training:actualPerformance.distance')} ({t('training:units.km')})
              </label>
              <Input
                type="number"
                step="0.01"
                placeholder="0"
                value={actualDistance}
                onChange={(e) => onActualDistanceChange(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {t('training:actualPerformance.pace')} ({t('training:units.perKm')})
            </label>
            <Input
              placeholder="5:30"
              value={actualPace}
              onChange={(e) => onActualPaceChange(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {t('training:actualPerformance.avgHr')} ({t('training:units.bpm')})
              </label>
              <Input
                type="number"
                placeholder="0"
                value={avgHr}
                onChange={(e) => onAvgHrChange(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {t('training:actualPerformance.maxHr')} ({t('training:units.bpm')})
              </label>
              <Input
                type="number"
                placeholder="0"
                value={maxHr}
                onChange={(e) => onMaxHrChange(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {t('training:actualPerformance.rpe')} (1–10)
              </label>
              <Input
                type="number"
                min="1"
                max="10"
                placeholder="–"
                value={rpe}
                onChange={(e) => onRpeChange(e.target.value)}
              />
            </div>
          </div>

          {isCoach && (
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {t('training:coachPostFeedback.label')}
              </label>
              <Textarea
                placeholder={t('training:coachPostFeedback.placeholder')}
                value={coachPostFeedback}
                onChange={(e) => onCoachPostFeedbackChange(e.target.value)}
                rows={3}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
