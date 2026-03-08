import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import { Button } from '~/components/ui/button';
import { loadTypeConfig } from '~/lib/utils/training-types';
import { LOAD_TYPES, type WeekPlan, type WeekStats } from '~/types/training';

interface WeekSummaryProps {
  weekPlan: WeekPlan;
  stats: WeekStats;
  readonly?: boolean;
  onUpdate?: (updates: Partial<Pick<WeekPlan, 'loadType' | 'totalPlannedKm' | 'actualTotalKm' | 'coachComments'>>) => void;
}

function formatDuration(minutes: number): string {
  if (minutes === 0) return '0 min';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

export function WeekSummary({
  weekPlan,
  stats,
  readonly = false,
  onUpdate,
}: WeekSummaryProps) {
  const { t } = useTranslation(['coach', 'common']);
  const [isExpanded, setIsExpanded] = useState(true);

  const [coachComments, setCoachComments] = useState(weekPlan.coachComments ?? '');
  const [plannedKm, setPlannedKm] = useState(
    weekPlan.totalPlannedKm?.toString() ?? ''
  );
  useEffect(() => {
    setCoachComments(weekPlan.coachComments ?? '');
    setPlannedKm(weekPlan.totalPlannedKm?.toString() ?? '');
  }, [weekPlan]);

  const handleBlur = (
    field: 'coachComments' | 'totalPlannedKm',
    value: string
  ) => {
    if (readonly) return;
    if (field === 'totalPlannedKm') {
      const num = value ? parseFloat(value) : null;
      if (num !== weekPlan.totalPlannedKm) {
        onUpdate?.({ totalPlannedKm: num });
      }
    } else {
      const val = value || null;
      if (val !== weekPlan[field]) {
        onUpdate?.({ [field]: val });
      }
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base">
            {t('coach:weekSummary.title')}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded((v) => !v)}
            className="h-7 w-7"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Load type selector */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
              {t('coach:weekSummary.loadType')}
            </label>
            <div className="flex gap-2">
              {LOAD_TYPES.map((lt) => {
                const config = loadTypeConfig[lt];
                const isSelected = weekPlan.loadType === lt;
                return (
                  <Button
                    key={lt}
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    disabled={readonly}
                    className={isSelected ? `${config.bgColor} ${config.color} border-0 hover:opacity-80` : ''}
                    onClick={() => {
                      const newVal = isSelected ? null : lt;
                      onUpdate?.({ loadType: newVal });
                    }}
                  >
                    {t(`common:loadType.${lt}`)}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Planned KM + Run KM */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                {t('coach:weekSummary.plannedKm')}
              </label>
              <Input
                type="number"
                step="0.1"
                placeholder="0"
                value={plannedKm}
                disabled={readonly}
                onChange={(e) => setPlannedKm(e.target.value)}
                onBlur={() => handleBlur('totalPlannedKm', plannedKm)}
                className="w-32"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                {t('coach:weekSummary.actualRunKm')}
              </label>
              <p className="text-sm pt-1">{stats.totalActualRunKm.toFixed(1)} km</p>
            </div>
          </div>

          {/* Coach Comments */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
              {t('coach:weekSummary.coachComments')}
            </label>
            <Textarea
              placeholder={t('coach:weekSummary.coachCommentsPlaceholder')}
              value={coachComments}
              disabled={readonly}
              onChange={(e) => setCoachComments(e.target.value)}
              onBlur={() => handleBlur('coachComments', coachComments)}
              rows={2}
            />
          </div>

          {/* Stats + Progress Bar */}
          <div className="pt-2 border-t space-y-3">
            <div className="flex gap-4">
              <div className="text-center">
                <p className="text-lg font-semibold">{stats.totalSessions}</p>
                <p className="text-xs text-muted-foreground">{t('common:stats.sessions')}</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold">{stats.completedSessions}</p>
                <p className="text-xs text-muted-foreground">{t('common:stats.completed')}</p>
              </div>
              {stats.totalActualDurationMinutes > 0 && (
                <div className="text-center">
                  <p className="text-lg font-semibold">
                    {formatDuration(stats.totalActualDurationMinutes)}
                  </p>
                  <p className="text-xs text-muted-foreground">{t('coach:weekSummary.totalTime')}</p>
                </div>
              )}
              {stats.completionPercentage > 0 && (
                <div className="text-center">
                  <p className="text-lg font-semibold">
                    {Math.round(stats.completionPercentage)}%
                  </p>
                  <p className="text-xs text-muted-foreground">{t('common:stats.progress')}</p>
                </div>
              )}
            </div>

            {/* Progress bar */}
            {stats.totalSessions > 0 && (
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>
                    {stats.completedSessions}/{stats.totalSessions}
                  </span>
                  <span>{Math.round(stats.completionPercentage)}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all duration-500"
                    style={{ width: `${stats.completionPercentage}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
