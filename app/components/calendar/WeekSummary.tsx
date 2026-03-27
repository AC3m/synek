import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, Pencil, X } from 'lucide-react';
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
  onUpdate?: (
    updates: Partial<
      Pick<WeekPlan, 'loadType' | 'totalPlannedKm' | 'actualTotalKm' | 'coachComments'>
    >,
  ) => void;
}

function StatValue({ value, unit }: { value: string | number; unit?: string }) {
  return (
    <div className="flex items-baseline gap-1">
      <span className="text-xl font-bold tracking-tight">{value}</span>
      {unit && (
        <span className="text-[10px] font-medium tracking-wider text-muted-foreground/70 uppercase">
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

export function WeekSummary({ weekPlan, stats, readonly = false, onUpdate }: WeekSummaryProps) {
  const { t } = useTranslation(['coach', 'common']);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditingKm, setIsEditingKm] = useState(false);

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
    <Card className="gap-0 overflow-hidden border-border/50 py-0 shadow-sm">
      <CardHeader className={cn('px-6 py-4 transition-all', !isExpanded && 'py-4')}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold tracking-wider text-foreground/80 uppercase">
            {t('coach:weekSummary.title')}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded((v) => !v)}
            className="h-8 w-8 rounded-full text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>

      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: isExpanded ? '1fr' : '0fr' }}
      >
        <div
          className={cn(
            'overflow-hidden transition-opacity duration-300 ease-out',
            isExpanded ? 'opacity-100' : 'opacity-0',
          )}
        >
          <CardContent className="border-t border-border/40 p-0">
            <div className="grid grid-cols-1 divide-y divide-border/40 bg-muted/5 md:grid-cols-2 md:divide-x md:divide-y-0">
              {/* ── LEFT: Plan ── */}
              <div className="space-y-5 px-6 py-5">
                <p className="flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] text-muted-foreground/60 uppercase">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/40" />
                  {t('coach:weekSummary.plan')}
                </p>

                {/* Week Load */}
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold tracking-wide text-muted-foreground/80 uppercase">
                    {t('coach:weekSummary.loadType')}
                  </p>
                  {readonly ? (
                    weekPlan.loadType ? (
                      <span
                        className={cn(
                          'inline-flex h-7 items-center rounded-md px-2.5 text-[10px] font-bold tracking-wider uppercase',
                          loadTypeConfig[weekPlan.loadType].bgColor,
                          loadTypeConfig[weekPlan.loadType].color,
                        )}
                      >
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
                              'h-7 rounded-md px-2.5 text-[10px] font-bold tracking-wider uppercase transition-all',
                              isSelected
                                ? `${config.bgColor} ${config.color} border-0 shadow-sm hover:opacity-90`
                                : 'text-muted-foreground/70 hover:text-foreground',
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
                    <p className="text-[11px] font-semibold tracking-wide text-muted-foreground/80 uppercase">
                      {t('coach:weekSummary.plannedKm')}
                    </p>
                    {readonly ? (
                      weekPlan.totalPlannedKm != null ? (
                        <StatValue value={weekPlan.totalPlannedKm} unit="km" />
                      ) : stats.totalPlannedKm > 0 ? (
                        <div className="flex items-baseline gap-1">
                          <StatValue value={`~${stats.totalPlannedKm.toFixed(1)}`} unit="km" />
                        </div>
                      ) : (
                        <StatValue value="—" />
                      )
                    ) : isEditingKm ? (
                      <div className="relative max-w-[100px]">
                        <Input
                          type="number"
                          step="0.1"
                          placeholder={
                            stats.totalPlannedKm > 0 ? stats.totalPlannedKm.toFixed(1) : '0'
                          }
                          value={plannedKm}
                          onChange={(e) => setPlannedKm(e.target.value)}
                          onBlur={() => {
                            handleBlur('totalPlannedKm', plannedKm);
                            setIsEditingKm(false);
                          }}
                          autoFocus
                          className="h-9 border-border/60 bg-background pr-8 text-sm font-bold tracking-tight"
                        />
                        <span className="absolute top-1/2 right-3 -translate-y-1/2 text-[10px] font-bold text-muted-foreground/50 uppercase">
                          km
                        </span>
                      </div>
                    ) : weekPlan.totalPlannedKm != null ? (
                      <div className="space-y-1">
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-bold tracking-tight text-amber-500">
                            {weekPlan.totalPlannedKm}
                          </span>
                          <span className="text-[10px] font-medium tracking-wider text-amber-500/70 uppercase">
                            km
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsEditingKm(true)}
                            className="ml-0.5 h-5 w-5"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setPlannedKm('');
                              onUpdate?.({ totalPlannedKm: null });
                            }}
                            className="h-5 w-5"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="flex items-center gap-1 text-[10px] text-amber-500/70">
                          <Pencil className="h-2.5 w-2.5" /> {t('coach:weekSummary.manuallySet')}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex items-baseline gap-1.5">
                          {stats.totalPlannedKm > 0 ? (
                            <StatValue value={`~${stats.totalPlannedKm.toFixed(1)}`} unit="km" />
                          ) : (
                            <StatValue value="—" />
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsEditingKm(true)}
                            className="h-5 w-5"
                          >
                            <Pencil className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        </div>
                        {stats.totalPlannedKm > 0 && (
                          <p className="text-[10px] text-muted-foreground/50">
                            {t('coach:weekSummary.fromSessions')}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold tracking-wide text-muted-foreground/80 uppercase">
                      {t('coach:weekSummary.plannedSessions')}
                    </p>
                    <StatValue value={stats.totalSessions} />
                  </div>
                </div>

                {/* Coach Notes */}
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold tracking-wide text-muted-foreground/80 uppercase">
                    {t('coach:weekSummary.coachComments')}
                  </p>
                  {readonly ? (
                    weekPlan.coachComments ? (
                      <p className="border-l-2 border-primary/20 pl-3 text-sm leading-relaxed text-foreground/80 italic">
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
                      className="resize-none border-border/60 bg-background text-sm leading-relaxed focus:border-primary/40"
                    />
                  )}
                </div>
              </div>

              {/* ── RIGHT: Performance ── */}
              <div className="space-y-5 px-6 py-5">
                <p className="flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] text-muted-foreground/60 uppercase">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500/40" />
                  {t('coach:weekSummary.performance')}
                </p>

                {/* Stat grid */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold tracking-wide text-muted-foreground/80 uppercase">
                      {t('coach:weekSummary.ranKm')}
                    </p>
                    <StatValue value={stats.totalActualRunKm.toFixed(1)} unit="km" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold tracking-wide text-muted-foreground/80 uppercase">
                      {t('coach:weekSummary.completedSessions')}
                    </p>
                    <StatValue value={stats.completedSessions} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold tracking-wide text-muted-foreground/80 uppercase">
                      {t('coach:weekSummary.totalTime')}
                    </p>
                    <StatValue value={duration.value} unit={duration.unit} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold tracking-wide text-muted-foreground/80 uppercase">
                      {t('coach:weekSummary.progress')}
                    </p>
                    <StatValue
                      value={stats.totalSessions > 0 ? Math.round(stats.completionPercentage) : '—'}
                      unit={stats.totalSessions > 0 ? '%' : undefined}
                    />
                  </div>
                </div>

                {/* Progress bar */}
                {stats.totalSessions > 0 && (
                  <div className="pt-2">
                    <div className="mb-2 flex items-end justify-between">
                      <span className="text-[10px] font-bold tracking-widest text-muted-foreground/60 uppercase">
                        {stats.completedSessions} / {stats.totalSessions}{' '}
                        {t('coach:weekSummary.completedSessions')}
                      </span>
                      <span className="text-xs font-black tracking-tight text-foreground/80">
                        {Math.round(stats.completionPercentage)}%
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full border border-border/10 bg-muted shadow-inner">
                      <div
                        className={cn(
                          'h-full rounded-full shadow-[0_0_8px_rgba(0,0,0,0.1)] transition-all duration-700 ease-out',
                          stats.completionPercentage >= 100 ? 'bg-green-500' : 'bg-primary',
                        )}
                        style={{ width: `${stats.completionPercentage}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </div>
      </div>
    </Card>
  );
}
