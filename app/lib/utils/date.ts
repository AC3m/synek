import {
  startOfISOWeek,
  endOfISOWeek,
  addWeeks,
  subWeeks,
  addDays,
  getISOWeek,
  getISOWeekYear,
  format,
  parseISO,
  getDay,
} from 'date-fns';
import { type DayOfWeek, DAYS_OF_WEEK } from '~/types/training';

export function getTodayDayOfWeek(): DayOfWeek {
  const now = new Date();
  // date-fns getDay: 0 (Sun) to 6 (Sat)
  // Our DAYS_OF_WEEK: 0 (Mon) to 6 (Sun)
  const dayIndex = (getDay(now) + 6) % 7;
  return DAYS_OF_WEEK[dayIndex];
}

export function getCurrentWeekId(): string {
  const now = new Date();
  const year = getISOWeekYear(now);
  const week = getISOWeek(now);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

export function weekIdToMonday(weekId: string): string {
  const match = weekId.match(/^(\d{4})-W(\d{2})$/);
  if (!match) throw new Error(`Invalid week ID: ${weekId}`);
  const [, yearStr, weekStr] = match;
  const year = parseInt(yearStr, 10);
  const week = parseInt(weekStr, 10);

  // Jan 4 is always in ISO week 1
  const jan4 = new Date(year, 0, 4);
  const startOfWeek1 = startOfISOWeek(jan4);
  const targetMonday = addWeeks(startOfWeek1, week - 1);
  return format(targetMonday, 'yyyy-MM-dd');
}

export function mondayToWeekId(monday: string): string {
  const date = parseISO(monday);
  const year = getISOWeekYear(date);
  const week = getISOWeek(date);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

export function getNextWeekId(weekId: string): string {
  const monday = parseISO(weekIdToMonday(weekId));
  const nextMonday = addWeeks(monday, 1);
  return mondayToWeekId(format(nextMonday, 'yyyy-MM-dd'));
}

export function getPrevWeekId(weekId: string): string {
  const monday = parseISO(weekIdToMonday(weekId));
  const prevMonday = subWeeks(monday, 1);
  return mondayToWeekId(format(prevMonday, 'yyyy-MM-dd'));
}

export function getWeekDateRange(weekId: string): {
  start: Date;
  end: Date;
  formatted: string;
} {
  const monday = parseISO(weekIdToMonday(weekId));
  const sunday = endOfISOWeek(monday);
  return {
    start: monday,
    end: sunday,
    formatted: `${format(monday, 'MMM d')} - ${format(sunday, 'MMM d yyyy')}`,
  };
}

/** Returns the YYYY-MM-DD calendar date for a session given its week start and day of week. */
export function getSessionCalendarDate(
  weekStart: string | undefined,
  dayOfWeek: DayOfWeek,
): string | null {
  if (!weekStart) return null;
  return format(addDays(parseISO(weekStart), DAYS_OF_WEEK.indexOf(dayOfWeek)), 'yyyy-MM-dd');
}

export function parseWeekId(weekId: string): {
  year: number;
  weekNumber: number;
} {
  const match = weekId.match(/^(\d{4})-W(\d{2})$/);
  if (!match) throw new Error(`Invalid week ID: ${weekId}`);
  return {
    year: parseInt(match[1], 10),
    weekNumber: parseInt(match[2], 10),
  };
}
