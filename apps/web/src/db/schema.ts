import Dexie, { type Table } from 'dexie';

export interface Reminder {
  minutesBefore: number;
}

export interface CalendarEvent {
  id: string;
  userId: string;
  calendarId: string;
  title: string;
  description: string;
  location: string;
  url: string;
  notes: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
  rrule?: string;
  exdates: string[];
  categoryIds: string[];
  reminders: Reminder[];
  isHoliday?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Calendar {
  id: string;
  userId: string;
  name: string;
  color: string;
  isDefault: boolean;
  isVisible: boolean;
  isHolidayCalendar?: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  color: string;
  createdAt: string;
}

export interface UserSettings {
  id: string;
  userId: string;
  theme: 'light' | 'dark' | 'system';
  weekStartsOn: 0 | 1;
  defaultCalendarId?: string;
  defaultReminderMinutes: number;
  bundesland: string;
  holidaysEnabled: boolean;
  holidaysYear: number;
}

export class CalendarDatabase extends Dexie {
  events!: Table<CalendarEvent>;
  calendars!: Table<Calendar>;
  categories!: Table<Category>;
  settings!: Table<UserSettings>;

  constructor(userId: string) {
    super(`termin-kalender-${userId}`);
    this.version(1).stores({
      events: 'id, userId, calendarId, startDate, endDate, [userId+calendarId]',
      calendars: 'id, userId',
      categories: 'id, userId',
      settings: 'id, userId',
    });
  }
}

let currentDb: CalendarDatabase | null = null;

export function getDb(userId: string): CalendarDatabase {
  if (!currentDb || currentDb.name !== `termin-kalender-${userId}`) {
    currentDb = new CalendarDatabase(userId);
  }
  return currentDb;
}

export function closeDb(): void {
  if (currentDb) {
    currentDb.close();
    currentDb = null;
  }
}

export const DEFAULT_CALENDARS = [
  { name: 'Privat', color: '#2563eb', isDefault: true },
  { name: 'Arbeit', color: '#dc2626', isDefault: false },
  { name: 'Familie', color: '#16a34a', isDefault: false },
];

export const DEFAULT_CATEGORIES = [
  { name: 'Meeting', color: '#8b5cf6' },
  { name: 'Geburtstag', color: '#ec4899' },
  { name: 'Urlaub', color: '#06b6d4' },
];

export const REMINDER_OPTIONS = [
  { label: 'Zur Zeit des Termins', minutes: 0 },
  { label: '5 Minuten vorher', minutes: 5 },
  { label: '15 Minuten vorher', minutes: 15 },
  { label: '30 Minuten vorher', minutes: 30 },
  { label: '1 Stunde vorher', minutes: 60 },
  { label: '1 Tag vorher', minutes: 1440 },
  { label: '2 Tage vorher', minutes: 2880 },
];
