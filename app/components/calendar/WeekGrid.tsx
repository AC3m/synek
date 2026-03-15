import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router';
import { addDays, format, isToday, parseISO } from 'date-fns';
import { cn } from '~/lib/utils';
import { trainingTypeConfig } from '~/lib/utils/training-types';
import { DayColumn } from './DayColumn';
import type { UserRole } from '~/lib/auth';
import {
  DAYS_OF_WEEK,
  type DayOfWeek,
  type TrainingSession,
  type SessionsByDay,
  type AthleteSessionUpdate,
} from '~/types/training';

interface WeekGridProps {
  sessionsByDay: SessionsByDay;
  weekStart?: string;
  readonly?: boolean;
  athleteMode?: boolean;
  /** Show completion/notes/performance controls even when athleteMode is false */
  showAthleteControls?: boolean;
  onAddSession?: (day: DayOfWeek) => void;
  onEditSession?: (session: TrainingSession) => void;
  onDeleteSession?: (sessionId: string) => void;
  onToggleComplete?: (sessionId: string, completed: boolean) => void;
  onUpdateNotes?: (sessionId: string, notes: string | null) => void;
  onUpdatePerformance?: (sessionId: string, update: Omit<AthleteSessionUpdate, 'id'>) => void;
  onUpdateCoachPostFeedback?: (sessionId: string, feedback: string | null) => void;
  stravaConnected?: boolean;
  onSyncStrava?: (sessionId: string) => Promise<void>;
  onConfirmStrava?: (sessionId: string) => Promise<void>;
  userRole?: UserRole;
  selectedDay?: DayOfWeek;
  onSelectDay?: (day: DayOfWeek) => void;
}

function getDefaultSelectedDay(weekStart: string | undefined): DayOfWeek {
  if (!weekStart) return 'monday';
  const monday = parseISO(weekStart);
  for (let i = 0; i < 7; i++) {
    if (isToday(addDays(monday, i))) return DAYS_OF_WEEK[i];
  }
  return 'monday';
}

interface MobileDayStripProps {
  weekStart: string | undefined;
  sessionsByDay: SessionsByDay;
  selectedDay: DayOfWeek;
  onSelectDay: (day: DayOfWeek) => void;
}

function MobileDayStrip({ weekStart, sessionsByDay, selectedDay, onSelectDay }: MobileDayStripProps) {
  const monday = weekStart ? parseISO(weekStart) : null;

  return (
    <div className="flex justify-between px-1 mb-2">
      {DAYS_OF_WEEK.map((day, i) => {
        const dayDate = monday ? addDays(monday, i) : null;
        const isCurrentDay = dayDate ? isToday(dayDate) : false;
        const isSelected = selectedDay === day;
        const sessions = sessionsByDay[day] ?? [];
        const hasSessions = sessions.length > 0;
        const firstSessionType = hasSessions ? sessions[0].trainingType : null;
        const dotColor = firstSessionType ? trainingTypeConfig[firstSessionType].bgColor : 'bg-foreground/30';

        return (
          <button
            key={day}
            onClick={() => onSelectDay(day)}
            className="flex flex-col items-center justify-center gap-0.5 min-h-[44px] min-w-[44px] py-1"
          >
            <span className="text-[10px] font-semibold uppercase text-[color:var(--foreground-tertiary)]">
              {dayDate ? format(dayDate, 'EEEEE') : day[0].toUpperCase()}
            </span>
            <span
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium',
                isCurrentDay && 'bg-foreground text-background',
                isSelected && !isCurrentDay && 'ring-1 ring-foreground/50',
                !isCurrentDay && !isSelected && 'text-foreground'
              )}
            >
              {dayDate ? format(dayDate, 'd') : ''}
            </span>
            {hasSessions ? (
              <span className={cn('h-1 w-1 rounded-full mt-0.5', dotColor)} />
            ) : (
              <span className="h-1 w-1 mt-0.5" />
            )}
          </button>
        );
      })}
    </div>
  );
}

export function WeekGrid({
  sessionsByDay,
  weekStart,
  readonly = false,
  athleteMode = false,
  showAthleteControls = false,
  onAddSession,
  onEditSession,
  onDeleteSession,
  onToggleComplete,
  onUpdateNotes,
  onUpdatePerformance,
  onUpdateCoachPostFeedback,
  stravaConnected,
  onSyncStrava,
  onConfirmStrava,
  userRole,
  selectedDay: controlledSelectedDay,
  onSelectDay: controlledOnSelectDay,
}: WeekGridProps) {
  const location = useLocation();
  const [internalSelectedDay, setInternalSelectedDay] = useState<DayOfWeek>(() =>
    getDefaultSelectedDay(weekStart)
  );

  const selectedDay = controlledSelectedDay ?? internalSelectedDay;
  const setSelectedDay = controlledOnSelectDay ?? setInternalSelectedDay;

  const scrollRef = useRef<HTMLDivElement>(null);
  const [showRightFade, setShowRightFade] = useState(false);
  const [showLeftFade, setShowLeftFade] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const check = () => {
      const canScroll = el.scrollWidth > el.clientWidth + 2;
      setShowRightFade(canScroll && el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
      setShowLeftFade(canScroll && el.scrollLeft > 4);
    };

    check();
    el.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    return () => {
      el.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
    };
  }, []);

  useEffect(() => {
    setSelectedDay(getDefaultSelectedDay(weekStart));
  }, [weekStart, location.state?.resetToToday, setSelectedDay]);

  const dayColumnProps = {
    readonly,
    athleteMode,
    showAthleteControls,
    onAddSession,
    onEditSession,
    onDeleteSession,
    onToggleComplete,
    weekStart,
    onUpdateNotes,
    onUpdatePerformance,
    onUpdateCoachPostFeedback,
    stravaConnected,
    onSyncStrava,
    onConfirmStrava,
    userRole,
  };

  return (
    <>
      {/* Mobile: day strip + single day view */}
      <div className="md:hidden">
        <MobileDayStrip
          weekStart={weekStart}
          sessionsByDay={sessionsByDay}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
        />
        <div className="mt-3">
          <DayColumn
            day={selectedDay}
            sessions={sessionsByDay[selectedDay] ?? []}
            {...dayColumnProps}
          />
        </div>
      </div>

      {/* Desktop: 7-column grid — scrollable when viewport < ~1192px */}
      <div className="hidden md:block relative">
        {/* Left fade — visible once user has scrolled right */}
        <div
          className={cn(
            'pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-background to-transparent transition-opacity duration-200',
            showLeftFade ? 'opacity-100' : 'opacity-0'
          )}
        />
        {/* Right fade — signals more columns to the right */}
        <div
          className={cn(
            'pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-background to-transparent transition-opacity duration-200',
            showRightFade ? 'opacity-100' : 'opacity-0'
          )}
        />
        <div ref={scrollRef} className="overflow-x-auto">
          <div className="grid grid-cols-2 lg:grid-cols-7 gap-1.5 lg:min-w-[1160px]">
            {DAYS_OF_WEEK.map((day) => (
              <DayColumn
                key={day}
                day={day}
                sessions={sessionsByDay[day] ?? []}
                {...dayColumnProps}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
