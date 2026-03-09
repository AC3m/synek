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
  const [plannedKm, setPlannedKm] = useState(weekPlan.totalPlannedKm?.toString() ?? '');

  useEffect(() => {
    setCoachComments(weekPlan.coachComments ?? '');
    setPlannedKm(weekPlan.totalPlannedKm?.toString() ?? '');
  }, [weekPlan]);

  const handleBlur = (field: 'coachComments' | 'totalPlannedKm', value: string) => {
    if (readonly) return;
    if (field === 'totalPlannedKm') {
      const num = value ? parseFloat(value) : null;
      if (num !== weekPlan.totalPlannedKm) onUpdate?.({ totalPlannedKm: num });
    } else {
      const val = value || null;
      if (val !== weekPlan[field]) onUpdate?.({ [field]: val });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base">{t('coach:weekSummary.title')}</CardTitle>
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
        <CardContent className="p-0">
          <div className="grid grid-cols-2 divide-x divide-border">

            {/* ── LEFT: Plan ── */}
            <div className="px-6 pb-6 space-y-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground pt-2">
                {t('coach:weekSummary.plan')}
              </p>

              {/* Week Load */}
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">
                  {t('coach:weekSummary.loadType')}
                </p>
                {readonly ? (
                  weekPlan.loadType ? (
                    <span className={`inline-flex items-center h-7 text-xs px-2.5 rounded-md font-medium ${loadTypeConfig[weekPlan.loadType].bgColor} ${loadTypeConfig[weekPlan.loadType].color}`}>
                      {t(`common:loadType.${weekPlan.loadType}`)}
                    </span>
                  ) : (
                    <p className="text-sm text-muted-foreground">—</p>
                  )
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {LOAD_TYPES.map((lt) => {
                      const config = loadTypeConfig[lt];
                      const isSelected = weekPlan.loadType === lt;
                      return (
                        <Button
                          key={lt}
                          variant={isSelected ? 'default' : 'outline'}
                          size="sm"
                          className={`h-7 text-xs px-2.5 ${isSelected ? `${config.bgColor} ${config.color} border-0 hover:opacity-80` : ''}`}
                          onClick={() => onUpdate?.({ loadType: isSelected ? null : lt })}
                        >
                          {t(`common:loadType.${lt}`)}
                        </Button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Planned KM + Planned Sessions */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t('coach:weekSummary.plannedKm')}
                  </p>
                  {readonly ? (
                    <p className="text-sm font-semibold">
                      {weekPlan.totalPlannedKm != null ? `${weekPlan.totalPlannedKm} km` : '—'}
                    </p>
                  ) : (
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="0"
                      value={plannedKm}
                      onChange={(e) => setPlannedKm(e.target.value)}
                      onBlur={() => handleBlur('totalPlannedKm', plannedKm)}
                      className="h-8 w-24 text-sm"
                    />
                  )}
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t('coach:weekSummary.plannedSessions')}
                  </p>
                  <p className="text-sm font-semibold">{stats.totalSessions}</p>
                </div>
              </div>

              {/* Coach Notes */}
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">
                  {t('coach:weekSummary.coachComments')}
                </p>
                {readonly ? (
                  weekPlan.coachComments ? (
                    <p className="text-sm">{weekPlan.coachComments}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">—</p>
                  )
                ) : (
                  <Textarea
                    placeholder={t('coach:weekSummary.coachCommentsPlaceholder')}
                    value={coachComments}
                    onChange={(e) => setCoachComments(e.target.value)}
                    onBlur={() => handleBlur('coachComments', coachComments)}
                    rows={2}
                    className="text-sm resize-none"
                  />
                )}
              </div>
            </div>

            {/* ── RIGHT: Performance ── */}
            <div className="px-6 pb-6 space-y-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground pt-2">
                {t('coach:weekSummary.performance')}
              </p>

              {/* Stat grid */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                <div>
                  <p className="text-xl font-bold">{stats.totalActualRunKm.toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('coach:weekSummary.ranKm')}</p>
                </div>
                <div>
                  <p className="text-xl font-bold">{stats.completedSessions}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('coach:weekSummary.completedSessions')}</p>
                </div>
                <div>
                  <p className="text-xl font-bold">
                    {stats.totalActualDurationMinutes > 0
                      ? formatDuration(stats.totalActualDurationMinutes)
                      : '—'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('coach:weekSummary.totalTime')}</p>
                </div>
                <div>
                  <p className="text-xl font-bold">
                    {stats.totalSessions > 0 ? `${Math.round(stats.completionPercentage)}%` : '—'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('coach:weekSummary.progress')}</p>
                </div>
              </div>

              {/* Progress bar */}
              {stats.totalSessions > 0 && (
                <div className="pt-1">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                    <span>{stats.completedSessions}/{stats.totalSessions}</span>
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

          </div>
        </CardContent>
      )}
    </Card>
  );
}
