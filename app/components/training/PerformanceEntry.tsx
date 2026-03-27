import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, BarChart2 } from 'lucide-react';
import { Input } from '~/components/ui/input';
import { isDistanceBased } from '~/lib/utils/training-types';
import type { TrainingSession, AthleteSessionUpdate } from '~/types/training';

interface PerformanceEntryProps {
  session: TrainingSession;
  onChange: (update: Omit<AthleteSessionUpdate, 'id'>) => void;
}

export function PerformanceEntry({ session, onChange }: PerformanceEntryProps) {
  const { t } = useTranslation('training');
  const distanceBased = isDistanceBased(session.trainingType);

  const hasData =
    session.actualDurationMinutes != null ||
    session.actualDistanceKm != null ||
    session.actualPace != null ||
    session.avgHeartRate != null ||
    session.maxHeartRate != null ||
    session.rpe != null;

  const [expanded, setExpanded] = useState(false);
  const [duration, setDuration] = useState(session.actualDurationMinutes?.toString() ?? '');
  const [distance, setDistance] = useState(session.actualDistanceKm?.toString() ?? '');
  const [pace, setPace] = useState(session.actualPace ?? '');
  const [avgHr, setAvgHr] = useState(session.avgHeartRate?.toString() ?? '');
  const [maxHr, setMaxHr] = useState(session.maxHeartRate?.toString() ?? '');
  const [rpe, setRpe] = useState(session.rpe?.toString() ?? '');

  useEffect(() => {
    setDuration(session.actualDurationMinutes?.toString() ?? '');
    setDistance(session.actualDistanceKm?.toString() ?? '');
    setPace(session.actualPace ?? '');
    setAvgHr(session.avgHeartRate?.toString() ?? '');
    setMaxHr(session.maxHeartRate?.toString() ?? '');
    setRpe(session.rpe?.toString() ?? '');
  }, [
    session.id,
    session.actualDurationMinutes,
    session.actualDistanceKm,
    session.actualPace,
    session.avgHeartRate,
    session.maxHeartRate,
    session.rpe,
  ]);

  const saveNumber = (
    field: keyof Pick<
      AthleteSessionUpdate,
      'actualDurationMinutes' | 'actualDistanceKm' | 'avgHeartRate' | 'maxHeartRate' | 'rpe'
    >,
    raw: string,
    current: number | null | undefined,
  ) => {
    const parsed = raw ? parseFloat(raw) : null;
    const value = parsed !== null && !isNaN(parsed) ? parsed : null;
    if (value !== (current ?? null)) onChange({ [field]: value });
  };

  const saveString = (
    field: keyof Pick<AthleteSessionUpdate, 'actualPace'>,
    raw: string,
    current: string | null | undefined,
  ) => {
    const value = raw.trim() || null;
    if (value !== (current ?? null)) onChange({ [field]: value });
  };

  return (
    <div className="mt-1.5">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <BarChart2 className="h-2.5 w-2.5" />
        {t('actualPerformance.logButton')}
        {expanded ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
      </button>

      {expanded && (
        <div className="mt-1.5 grid animate-in grid-cols-2 gap-x-2 gap-y-1.5 duration-150 fade-in slide-in-from-top-1">
          <div>
            <label className="mb-0.5 block text-[9px] text-muted-foreground">
              {t('actualPerformance.duration')} (min)
            </label>
            <Input
              type="number"
              step="1"
              min="0"
              placeholder="—"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              onBlur={() =>
                saveNumber('actualDurationMinutes', duration, session.actualDurationMinutes)
              }
              className="h-6 px-1.5 text-[10px]"
            />
          </div>

          {distanceBased && (
            <div>
              <label className="mb-0.5 block text-[9px] text-muted-foreground">
                {t('actualPerformance.distance')} (km)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="—"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                onBlur={() => saveNumber('actualDistanceKm', distance, session.actualDistanceKm)}
                className="h-6 px-1.5 text-[10px]"
              />
            </div>
          )}

          {distanceBased && (
            <div>
              <label className="mb-0.5 block text-[9px] text-muted-foreground">
                {t('actualPerformance.pace')} (/km)
              </label>
              <Input
                type="text"
                placeholder="5:30"
                value={pace}
                onChange={(e) => setPace(e.target.value)}
                onBlur={() => saveString('actualPace', pace, session.actualPace)}
                className="h-6 px-1.5 text-[10px]"
              />
            </div>
          )}

          <div>
            <label className="mb-0.5 block text-[9px] text-muted-foreground">
              {t('actualPerformance.rpe')} ({t('actualPerformance.rpeHint')})
            </label>
            <Input
              type="number"
              step="1"
              min="1"
              max="10"
              placeholder="—"
              value={rpe}
              onChange={(e) => setRpe(e.target.value)}
              onBlur={() => saveNumber('rpe', rpe, session.rpe)}
              className="h-6 px-1.5 text-[10px]"
            />
          </div>

          <div>
            <label className="mb-0.5 block text-[9px] text-muted-foreground">
              {t('actualPerformance.avgHr')} (bpm)
            </label>
            <Input
              type="number"
              step="1"
              min="0"
              placeholder="—"
              value={avgHr}
              onChange={(e) => setAvgHr(e.target.value)}
              onBlur={() => saveNumber('avgHeartRate', avgHr, session.avgHeartRate)}
              className="h-6 px-1.5 text-[10px]"
            />
          </div>

          <div>
            <label className="mb-0.5 block text-[9px] text-muted-foreground">
              {t('actualPerformance.maxHr')} (bpm)
            </label>
            <Input
              type="number"
              step="1"
              min="0"
              placeholder="—"
              value={maxHr}
              onChange={(e) => setMaxHr(e.target.value)}
              onBlur={() => saveNumber('maxHeartRate', maxHr, session.maxHeartRate)}
              className="h-6 px-1.5 text-[10px]"
            />
          </div>
        </div>
      )}
    </div>
  );
}
