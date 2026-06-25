import { RRule, rrulestr } from 'rrule';
import { addDays, parseISO } from 'date-fns';

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

export interface RecurrenceConfig {
  type: RecurrenceType;
  interval?: number;
  count?: number;
  until?: string;
  byweekday?: number[];
}

export function recurrenceToRRule(config: RecurrenceConfig, startDate: string): string | undefined {
  if (config.type === 'none') return undefined;

  const dtstart = parseISO(startDate);
  const options: Partial<ConstructorParameters<typeof RRule>[0]> = {
    dtstart,
    interval: config.interval || 1,
  };

  if (config.count) options.count = config.count;
  if (config.until) options.until = parseISO(config.until);

  switch (config.type) {
    case 'daily':
      options.freq = RRule.DAILY;
      break;
    case 'weekly':
      options.freq = RRule.WEEKLY;
      if (config.byweekday?.length) {
        options.byweekday = config.byweekday;
      }
      break;
    case 'monthly':
      options.freq = RRule.MONTHLY;
      break;
    case 'yearly':
      options.freq = RRule.YEARLY;
      break;
    default:
      return undefined;
  }

  return new RRule(options as ConstructorParameters<typeof RRule>[0]).toString();
}

export function rruleToLabel(rruleStr: string): string {
  try {
    const rule = rrulestr(rruleStr);
    return rule.toText();
  } catch {
    return 'Wiederkehrend';
  }
}

export function expandRecurrence(
  rruleStr: string,
  startDate: string,
  _endDate: string,
  exdates: string[] = [],
  rangeStart: Date,
  rangeEnd: Date
): Date[] {
  try {
    const rule = rrulestr(rruleStr, { dtstart: parseISO(startDate) });
    const occurrences = rule.between(rangeStart, rangeEnd, true);
    const exdateSet = new Set(exdates.map((d) => d.slice(0, 10)));
    return occurrences.filter((d) => !exdateSet.has(d.toISOString().slice(0, 10)));
  } catch {
    return [];
  }
}

export function getRecurrenceLabel(type: RecurrenceType): string {
  const labels: Record<RecurrenceType, string> = {
    none: 'Nie',
    daily: 'Täglich',
    weekly: 'Wöchentlich',
    monthly: 'Monatlich',
    yearly: 'Jährlich',
    custom: 'Benutzerdefiniert',
  };
  return labels[type];
}

export function getDurationMinutes(start: string, end: string): number {
  return Math.round((parseISO(end).getTime() - parseISO(start).getTime()) / 60000);
}

export function shiftEndByDuration(newStart: string, oldStart: string, oldEnd: string): string {
  const durationMs = parseISO(oldEnd).getTime() - parseISO(oldStart).getTime();
  return new Date(parseISO(newStart).getTime() + durationMs).toISOString();
}

export { addDays };
