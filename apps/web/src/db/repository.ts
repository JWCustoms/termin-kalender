import { v4 as uuidv4 } from './uuid';
import {
  getDb,
  DEFAULT_CALENDARS,
  DEFAULT_CATEGORIES,
  type CalendarEvent,
  type Calendar,
  type Category,
  type UserSettings,
} from './schema';
import { expandRecurrence } from '@/lib/recurrence';
import { parseISO, startOfDay, endOfDay } from '@/lib/date-utils';

export async function initUserData(userId: string): Promise<void> {
  const db = getDb(userId);
  const existingCalendars = await db.calendars.count();

  if (existingCalendars === 0) {
    const now = new Date().toISOString();
    const calendars: Calendar[] = DEFAULT_CALENDARS.map((c) => ({
      id: uuidv4(),
      userId,
      name: c.name,
      color: c.color,
      isDefault: c.isDefault,
      isVisible: true,
      createdAt: now,
    }));

    const categories: Category[] = DEFAULT_CATEGORIES.map((c) => ({
      id: uuidv4(),
      userId,
      name: c.name,
      color: c.color,
      createdAt: now,
    }));

    const settings: UserSettings = {
      id: uuidv4(),
      userId,
      theme: 'system',
      weekStartsOn: 1,
      defaultCalendarId: calendars.find((c) => c.isDefault)?.id,
      defaultReminderMinutes: 15,
      bundesland: 'ALL',
      holidaysEnabled: false,
      holidaysYear: new Date().getFullYear(),
    };

    await db.calendars.bulkAdd(calendars);
    await db.categories.bulkAdd(categories);
    await db.settings.add(settings);
  }
}

export async function getEventsForRange(
  userId: string,
  rangeStart: Date,
  rangeEnd: Date,
  calendarIds?: string[]
): Promise<CalendarEvent[]> {
  const db = getDb(userId);
  let events = await db.events.where('userId').equals(userId).toArray();

  if (calendarIds?.length) {
    events = events.filter((e) => calendarIds.includes(e.calendarId));
  }

  const result: CalendarEvent[] = [];

  for (const event of events) {
    if (event.rrule) {
      const occurrences = expandRecurrence(
        event.rrule,
        event.startDate,
        event.endDate,
        event.exdates,
        rangeStart,
        rangeEnd
      );

      const duration = parseISO(event.endDate).getTime() - parseISO(event.startDate).getTime();

      for (const occ of occurrences) {
        result.push({
          ...event,
          id: `${event.id}_${occ.toISOString()}`,
          startDate: occ.toISOString(),
          endDate: new Date(occ.getTime() + duration).toISOString(),
        });
      }
    } else {
      const start = parseISO(event.startDate);
      const end = parseISO(event.endDate);
      if (end >= rangeStart && start <= rangeEnd) {
        result.push(event);
      }
    }
  }

  return result.sort((a, b) => parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime());
}

export async function getEventsForDay(userId: string, date: Date, calendarIds?: string[]): Promise<CalendarEvent[]> {
  return getEventsForRange(userId, startOfDay(date), endOfDay(date), calendarIds);
}

export async function createEvent(event: Omit<CalendarEvent, 'createdAt' | 'updatedAt'>): Promise<CalendarEvent> {
  const db = getDb(event.userId);
  const now = new Date().toISOString();
  const full: CalendarEvent = { ...event, createdAt: now, updatedAt: now };
  await db.events.add(full);
  return full;
}

export async function updateEvent(id: string, userId: string, updates: Partial<CalendarEvent>): Promise<void> {
  const db = getDb(userId);
  const baseId = id.includes('_') ? id.split('_')[0] : id;
  await db.events.update(baseId, { ...updates, updatedAt: new Date().toISOString() });
}

export async function deleteEvent(id: string, userId: string): Promise<void> {
  const db = getDb(userId);
  const baseId = id.includes('_') ? id.split('_')[0] : id;
  await db.events.delete(baseId);
}

export async function duplicateEvent(event: CalendarEvent): Promise<CalendarEvent> {
  const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = event;
  return createEvent({ ...rest, id: uuidv4(), title: `${event.title} (Kopie)` });
}

export async function searchEvents(userId: string, query: string): Promise<CalendarEvent[]> {
  const db = getDb(userId);
  const q = query.toLowerCase();
  return db.events
    .where('userId')
    .equals(userId)
    .filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q) ||
        e.notes.toLowerCase().includes(q)
    )
    .toArray();
}

export async function getSettings(userId: string): Promise<UserSettings | undefined> {
  return getDb(userId).settings.where('userId').equals(userId).first();
}

export async function updateSettings(userId: string, updates: Partial<UserSettings>): Promise<void> {
  const settings = await getSettings(userId);
  if (settings) {
    await getDb(userId).settings.update(settings.id, updates);
  }
}

export async function clearUserEvents(userId: string): Promise<void> {
  const db = getDb(userId);
  await db.events.where('userId').equals(userId).delete();
  await db.calendars.where('userId').equals(userId).delete();
  await db.categories.where('userId').equals(userId).delete();
  await db.settings.where('userId').equals(userId).delete();
}
