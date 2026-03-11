import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import { Button } from '~/components/ui/button';
import { cn } from '~/lib/utils';
import { loadTypeConfig } from '~/lib/utils/training-types';
import { LOAD_TYPES, type WeekPlan, type WeekStats } from '~/types/training';

interface WeekSummaryProps {
  weekPlan: WeekPlan;
  stats: WeekStats;
  readonly?: boolean;
  onUpdate?: (updates: Partial<Pick<WeekPlan, 'loadType' | 'totalPlannedKm' | 'actualTotalKm' | 'coachComments'>>) => void;
}

function StatValue({ value, unit }: { value: string | number; unit?: string }) {
  return (
    <div className="flex items-baseline gap-1">
      <span className="text-xl font-bold tracking-tight">{value}</span>
      {unit && (
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
          {unit}
        </span>
      )}
    </div>
  );
}

function formatDuration(minutes: number): { value: string; unit: string } {
  if (minutes === 0) return { value: '0', unit: 'min' };
  if (minutes < 60) return { value: minutes.toString(), unit: 'min' };
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return { value: h.toString(), unit: 'h' };
  return { value: `${h}h ${m}`, unit: 'min' };
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

  const duration = formatDuration(stats.totalActualDurationMinutes);

  return (
    <Card className="overflow-hidden border-border/50 shadow-sm">
      <CardHeader className={cn("py-3 px-6 transition-all", !isExpanded && "pb-4")}>
        <div className="flex justify-between items-center">
          <CardTitle className="text-sm font-semibold text-foreground/80 uppercase tracking-wider">
            {t('coach:weekSummary.title')}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded((v) => !v)}
            className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="p-0 border-t border-border/40">
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/40 bg-muted/5">

            {/* ── LEFT: Plan ── */}
            <div className="px-6 py-5 space-y-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                {t('coach:weekSummary.plan')}
              </p>

              {/* Week Load */}
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wide">
                  {t('coach:weekSummary.loadType')}
                </p>
                {readonly ? (
                  weekPlan.loadType ? (
                    <span className={cn(
                      'inline-flex items-center rounded-md h-7 text-[10px] px-2.5 font-bold uppercase tracking-wider',
                      loadTypeConfig[weekPlan.loadType].bgColor,
                      loadTypeConfig[weekPlan.loadType].color
                    )}>
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
                          className={cn(
                            'rounded-md h-7 text-[10px] px-2.5 font-bold uppercase tracking-wider transition-all',
                            isSelected 
                              ? `${config.bgColor} ${config.color} border-0 shadow-sm hover:opacity-90`
                              : 'text-muted-foreground/70 hover:text-foreground'
                          )}
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wide">
                    {t('coach:weekSummary.plannedKm')}
                  </p>
                  {readonly ? (
                    <StatValue value={weekPlan.totalPlannedKm ?? '—'} unit={weekPlan.totalPlannedKm != null ? 'km' : undefined} />
                  ) : (
                    <div className="relative max-w-[100px]">
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="0"
                        value={plannedKm}
                        onChange={(e) => setPlannedKm(e.target.value)}
                        onBlur={() => handleBlur('totalPlannedKm', plannedKm)}
                        className="h-9 pr-8 text-sm font-bold tracking-tight bg-background border-border/60"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground/50 uppercase">km</span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wide">
                    {t('coach:weekSummary.plannedSessions')}
                  </p>
                  <StatValue value={stats.totalSessions} />
                </div>
              </div>

              {/* Coach Notes */}
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wide">
                  {t('coach:weekSummary.coachComments')}
                </p>
                {readonly ? (
                  weekPlan.coachComments ? (
                    <p className="text-sm text-foreground/80 leading-relaxed italic border-l-2 border-primary/20 pl-3">
                      "{weekPlan.coachComments}"
                    </p>
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
                    className="text-sm resize-none bg-background border-border/60 focus:border-primary/40 leading-relaxed"
                  />
                )}
              </div>
            </div>

            {/* ── RIGHT: Performance ── */}
            <div className="px-6 py-5 space-y-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500/40" />
                {t('coach:weekSummary.performance')}
              </p>

              {/* Stat grid */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wide">
                    {t('coach:weekSummary.ranKm')}
                  </p>
                  <StatValue value={stats.totalActualRunKm.toFixed(1)} unit="km" />
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wide">
                    {t('coach:weekSummary.completedSessions')}
                  </p>
                  <StatValue value={stats.completedSessions} />
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wide">
                    {t('coach:weekSummary.totalTime')}
                  </p>
                  <StatValue value={duration.value} unit={duration.unit} />
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wide">
                    {t('coach:weekSummary.progress')}
                  </p>
                  <StatValue value={stats.totalSessions > 0 ? Math.round(stats.completionPercentage) : '—'} unit={stats.totalSessions > 0 ? '%' : undefined} />
                </div>
              </div>

              {/* Progress bar */}
              {stats.totalSessions > 0 && (
                <div className="pt-2">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                      {stats.completedSessions} / {stats.totalSessions} {t('coach:weekSummary.completedSessions')}
                    </span>
                    <span className="text-xs font-black tracking-tight text-foreground/80">
                      {Math.round(stats.completionPercentage)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden border border-border/10 shadow-inner">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-700 ease-out shadow-[0_0_8px_rgba(0,0,0,0.1)]",
                        stats.completionPercentage >= 100 ? "bg-green-500" : "bg-primary"
                      )}
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
