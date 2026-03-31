import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, Pencil, Trophy, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import { Button } from '~/components/ui/button';
import { cn } from '~/lib/utils';
import { formatTime, formatDuration } from '~/lib/utils/format';
import { loadTypeConfig } from '~/lib/utils/training-types';
import { SportBreakdown } from '~/components/calendar/SportBreakdown';
import {
  LOAD_TYPES,
  type WeekPlan,
  type WeekStats,
  type Goal,
  type TrainingSession,
} from '~/types/training';

const VIEW_KEY = 'weekSummary.view';
type SummaryView = 'cumulative' | 'by-sport';

interface WeekSummaryProps {
  weekPlan: WeekPlan;
  stats: WeekStats;
  readonly?: boolean;
  onUpdate?: (
    updates: Partial<
      Pick<WeekPlan, 'loadType' | 'totalPlannedKm' | 'actualTotalKm' | 'coachComments'>
    >,
  ) => void;
  competitionGoal?: Goal | null;
  competitionSession?: TrainingSession | null;
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

export function WeekSummary({
  weekPlan,
  stats,
  readonly = false,
  onUpdate,
  competitionGoal,
  competitionSession,
}: WeekSummaryProps) {
  const { t } = useTranslation(['coach', 'common']);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditingKm, setIsEditingKm] = useState(false);
  const [view, setView] = useState<SummaryView>(() => {
    try {
      const stored = sessionStorage.getItem(VIEW_KEY);
      return stored === 'by-sport' ? 'by-sport' : 'cumulative';
    } catch {
      return 'cumulative';
    }
  });

  const handleViewChange = (next: SummaryView) => {
    setView(next);
    try {
      sessionStorage.setItem(VIEW_KEY, next);
    } catch {
      // ignore
    }
  };

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
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold tracking-wider text-foreground/80 uppercase">
            {t('coach:weekSummary.title')}
          </CardTitle>
          <div className="flex items-center gap-1">
            <div className="flex rounded-md border border-border/50 bg-muted/30 p-0.5">
              <Button
                variant="ghost"
                size="sm"
                data-testid="view-cumulative"
                onClick={() => handleViewChange('cumulative')}
                className={cn(
                  'h-6 rounded px-2.5 text-[10px] font-semibold tracking-wide uppercase transition-all',
                  view === 'cumulative'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {t('coach:weekSummary.viewCumulative')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                data-testid="view-by-sport"
                onClick={() => handleViewChange('by-sport')}
                className={cn(
                  'h-6 rounded px-2.5 text-[10px] font-semibold tracking-wide uppercase transition-all',
                  view === 'by-sport'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {t('coach:weekSummary.viewBySport')}
              </Button>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded((v) => !v)}
              aria-expanded={isExpanded}
              aria-label={t(isExpanded ? 'common:collapseDetails' : 'common:expandDetails')}
              className="h-8 w-8 rounded-full text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
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
            {/* By-sport panel — animated height */}
            <div
              className="grid transition-[grid-template-rows] duration-300 ease-out"
              style={{ gridTemplateRows: view === 'by-sport' ? '1fr' : '0fr' }}
            >
              <div className="overflow-hidden">
                <div
                  className={cn(
                    'px-6 py-4 transition-opacity duration-300',
                    view === 'by-sport' ? 'opacity-100' : 'opacity-0',
                  )}
                  data-testid="sport-breakdown-view"
                >
                  <SportBreakdown stats={stats} />
                </div>
              </div>
            </div>

            {/* Cumulative panel — animated height */}
            <div
              className="grid transition-[grid-template-rows] duration-300 ease-out"
              style={{ gridTemplateRows: view === 'cumulative' ? '1fr' : '0fr' }}
              data-testid="cumulative-view"
            >
              <div className="overflow-hidden">
                <div
                  className={cn(
                    'grid grid-cols-1 divide-y divide-border/40 bg-muted/5 md:grid-cols-2 md:divide-x md:divide-y-0',
                  )}
                >
                  {/* ── LEFT: Plan ── */}
                  <div className="space-y-5 px-6 py-5">
                    <p className="flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] text-muted-foreground/60 uppercase">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary/40" />
                      {t('coach:weekSummary.plan')}
                    </p>

                    {/* Competition block — only on competition weeks */}
                    {competitionGoal && (
                      <>
                        <div className="rounded-lg border border-amber-200/60 bg-amber-50/50 px-4 py-3 dark:border-amber-800/40 dark:bg-amber-950/20">
                          <div className="mb-2.5 flex items-center gap-1.5">
                            <Trophy className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                            <span className="text-[10px] font-bold tracking-widest text-amber-700 uppercase dark:text-amber-300">
                              {competitionGoal.name}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                            <div className="space-y-0.5">
                              <p className="text-[10px] font-semibold tracking-wide text-muted-foreground/70 uppercase">
                                {t('training:goal.goalDistance' as never)}
                              </p>
                              {competitionGoal.goalDistanceKm != null ? (
                                <StatValue value={competitionGoal.goalDistanceKm} unit="km" />
                              ) : (
                                <StatValue value="—" />
                              )}
                            </div>
                            <div className="space-y-0.5">
                              <p className="text-[10px] font-semibold tracking-wide text-muted-foreground/70 uppercase">
                                {t('training:goal.goalTime' as never)}
                              </p>
                              {competitionGoal.goalTimeSeconds != null ? (
                                <StatValue value={formatTime(competitionGoal.goalTimeSeconds)} />
                              ) : (
                                <StatValue value="—" />
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="h-px bg-border/40" />
                      </>
                    )}

                    {/* 2×2 metric grid — mirrors Performance layout */}
                    <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                      {/* Distance */}
                      <div className="space-y-1">
                        <p className="text-[11px] font-semibold tracking-wide text-muted-foreground/80 uppercase">
                          {t('coach:weekSummary.plannedKm')}
                        </p>
                        {readonly ? (
                          weekPlan.totalPlannedKm != null ? (
                            <StatValue value={weekPlan.totalPlannedKm} unit="km" />
                          ) : stats.totalPlannedKm > 0 ? (
                            <StatValue value={`~${stats.totalPlannedKm.toFixed(1)}`} unit="km" />
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
                              <Pencil className="h-2.5 w-2.5" />{' '}
                              {t('coach:weekSummary.manuallySet')}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex items-baseline gap-1.5">
                              {stats.totalPlannedKm > 0 ? (
                                <StatValue
                                  value={`~${stats.totalPlannedKm.toFixed(1)}`}
                                  unit="km"
                                />
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

                      {/* Sessions */}
                      <div className="space-y-1">
                        <p className="text-[11px] font-semibold tracking-wide text-muted-foreground/80 uppercase">
                          {t('coach:weekSummary.plannedSessions')}
                        </p>
                        <StatValue value={stats.totalSessions} />
                      </div>

                      {/* Week Load */}
                      <div className="space-y-1">
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

                      {/* Empty slot — aligns with Completion on the right */}
                      <div />
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

                    {/* Competition result block — only on competition weeks */}
                    {competitionGoal && (
                      <>
                        <div className="rounded-lg border border-amber-200/60 bg-amber-50/50 px-4 py-3 dark:border-amber-800/40 dark:bg-amber-950/20">
                          <div className="mb-2.5 flex items-center gap-1.5">
                            <Trophy className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                            <span className="text-[10px] font-bold tracking-widest text-amber-700 uppercase dark:text-amber-300">
                              {t('training:competition.result' as never)}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                            <div className="space-y-0.5">
                              <p className="text-[10px] font-semibold tracking-wide text-muted-foreground/70 uppercase">
                                {t('coach:weekSummary.totalDistance')}
                              </p>
                              {competitionSession?.actualDistanceKm != null ? (
                                <StatValue
                                  value={competitionSession.actualDistanceKm.toFixed(1)}
                                  unit="km"
                                />
                              ) : (
                                <StatValue value="—" />
                              )}
                            </div>
                            <div className="space-y-0.5">
                              <p className="text-[10px] font-semibold tracking-wide text-muted-foreground/70 uppercase">
                                {t('coach:weekSummary.totalTime')}
                              </p>
                              {competitionSession?.actualDurationMinutes != null ? (
                                (() => {
                                  const d = formatDuration(
                                    competitionSession.actualDurationMinutes,
                                  );
                                  return <StatValue value={d.value} unit={d.unit} />;
                                })()
                              ) : (
                                <StatValue value="—" />
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="h-px bg-border/40" />
                      </>
                    )}

                    {/* Stat grid */}
                    <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                      <div className="space-y-1">
                        <p className="text-[11px] font-semibold tracking-wide text-muted-foreground/80 uppercase">
                          {t('coach:weekSummary.totalDistance')}
                        </p>
                        {stats.totalActualDistanceKm > 0 ? (
                          <StatValue value={stats.totalActualDistanceKm.toFixed(1)} unit="km" />
                        ) : (
                          <StatValue value="—" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-[11px] font-semibold tracking-wide text-muted-foreground/80 uppercase">
                          {t('coach:weekSummary.completedSessions')}
                        </p>
                        <div className="flex items-baseline gap-0.5">
                          <span className="text-xl font-bold tracking-tight">
                            {stats.completedSessions}
                          </span>
                          {stats.totalSessions > 0 && (
                            <span className="text-sm font-medium text-muted-foreground/60">
                              {' '}
                              / {stats.totalSessions}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[11px] font-semibold tracking-wide text-muted-foreground/80 uppercase">
                          {t('coach:weekSummary.totalTime')}
                        </p>
                        <StatValue value={duration.value} unit={duration.unit} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[11px] font-semibold tracking-wide text-muted-foreground/80 uppercase">
                          {t('coach:weekSummary.totalCalories')}
                        </p>
                        {stats.totalCalories > 0 ? (
                          <StatValue value={stats.totalCalories.toLocaleString()} unit="kcal" />
                        ) : (
                          <StatValue value="—" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-[11px] font-semibold tracking-wide text-muted-foreground/80 uppercase">
                          {t('coach:weekSummary.progress')}
                        </p>
                        <StatValue
                          value={
                            stats.totalSessions > 0 ? Math.round(stats.completionPercentage) : '—'
                          }
                          unit={stats.totalSessions > 0 ? '%' : undefined}
                        />
                      </div>
                    </div>

                    {/* Progress bar */}
                    {stats.totalSessions > 0 && (
                      <div className="pt-2">
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
              </div>
            </div>
          </CardContent>
        </div>
      </div>
    </Card>
  );
}
