import type { Calendar } from '@/db/schema';

export function getVisibleCalendarIds(calendars: Calendar[] | undefined): string[] | undefined {
  if (!calendars) return undefined;
  return calendars.filter((c) => c.isVisible).map((c) => c.id);
}
