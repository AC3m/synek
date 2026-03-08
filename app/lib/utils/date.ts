import {
  startOfISOWeek,
  endOfISOWeek,
  addWeeks,
  subWeeks,
  getISOWeek,
  getISOWeekYear,
  format,
  parseISO,
} from 'date-fns';

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
