import {
  format,
  parseISO,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  addMonths,
  addWeeks,
  addYears,
  isSameDay,
  isSameMonth,
  isToday,
  eachDayOfInterval,
  differenceInMinutes,
  setHours,
  setMinutes,
} from 'date-fns';
import { de } from 'date-fns/locale';

export { de as deLocale };

export function formatDate(date: Date | string, fmt: string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, fmt, { locale: de });
}

export function formatTime(date: Date | string): string {
  return formatDate(date, 'HH:mm');
}

export function formatDateLong(date: Date | string): string {
  return formatDate(date, 'EEEE, d. MMMM yyyy');
}

export function formatDateShort(date: Date | string): string {
  return formatDate(date, 'd. MMM yyyy');
}

export function formatMonthYear(date: Date): string {
  return formatDate(date, 'MMMM yyyy');
}

export function getWeekDays(date: Date): Date[] {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end: addDays(start, 6) });
}

export function getMonthDays(date: Date): Date[] {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  return eachDayOfInterval({ start: calStart, end: calEnd });
}

export function getYearMonths(year: number): Date[] {
  return Array.from({ length: 12 }, (_, i) => new Date(year, i, 1));
}

export {
  parseISO,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  addMonths,
  addWeeks,
  addYears,
  isSameDay,
  isSameMonth,
  isToday,
  differenceInMinutes,
  setHours,
  setMinutes,
};

export const WEEKDAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

export function toLocalISO(date: Date): string {
  return date.toISOString();
}

export function fromLocalISO(iso: string): Date {
  return parseISO(iso);
}

export function combineDateAndTime(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}

export function getDatePart(iso: string): string {
  return iso.slice(0, 10);
}

export function getTimePart(iso: string): string {
  const d = parseISO(iso);
  return format(d, 'HH:mm');
}
