import ICAL from 'ical.js';
import type { CalendarEvent, Calendar, Category } from '@/db/schema';

export function exportEventsToICS(events: CalendarEvent[], calendarName = 'Termin Kalender'): string {
  const comp = new ICAL.Component(['vcalendar', [], []]);
  comp.updatePropertyWithValue('prodid', '-//Termin Kalender//DE');
  comp.updatePropertyWithValue('version', '2.0');
  comp.updatePropertyWithValue('calscale', 'GREGORIAN');
  comp.updatePropertyWithValue('x-wr-calname', calendarName);

  for (const event of events) {
    const vevent = new ICAL.Component('vevent');
    vevent.updatePropertyWithValue('uid', event.id);
    vevent.updatePropertyWithValue('summary', event.title);

    if (event.description) vevent.updatePropertyWithValue('description', event.description);
    if (event.location) vevent.updatePropertyWithValue('location', event.location);
    if (event.url) vevent.updatePropertyWithValue('url', event.url);

    const dtstart = ICAL.Time.fromJSDate(new Date(event.startDate), event.allDay);
    const dtend = ICAL.Time.fromJSDate(new Date(event.endDate), event.allDay);
    vevent.updatePropertyWithValue('dtstart', dtstart);
    vevent.updatePropertyWithValue('dtend', dtend);

    if (event.rrule) {
      vevent.updatePropertyWithValue('rrule', ICAL.Recur.fromString(event.rrule.replace('RRULE:', '')));
    }

    comp.addSubcomponent(vevent);
  }

  return comp.toString();
}

export interface ImportedEvent {
  title: string;
  description?: string;
  location?: string;
  url?: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
  rrule?: string;
}

export function importEventsFromICS(icsContent: string): ImportedEvent[] {
  const jcal = ICAL.parse(icsContent);
  const comp = new ICAL.Component(jcal);
  const vevents = comp.getAllSubcomponents('vevent');
  const events: ImportedEvent[] = [];

  for (const vevent of vevents) {
    const event = new ICAL.Event(vevent);
    const start = event.startDate?.toJSDate();
    const end = event.endDate?.toJSDate();
    if (!start || !end) continue;

    let rrule: string | undefined;
    const rruleProp = vevent.getFirstProperty('rrule');
    if (rruleProp) {
      const value = rruleProp.getFirstValue();
      if (value) rrule = `RRULE:${value.toString()}`;
    }

    events.push({
      title: event.summary || 'Unbenannter Termin',
      description: event.description || undefined,
      location: event.location || undefined,
      url: vevent.getFirstPropertyValue('url') as string | undefined,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      allDay: event.startDate.isDate,
      rrule,
    });
  }

  return events;
}

export function exportBackupJSON(data: {
  events: CalendarEvent[];
  calendars: Calendar[];
  categories: Category[];
  settings: Record<string, unknown>;
}): string {
  return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), ...data }, null, 2);
}

export function importBackupJSON(json: string): {
  events: CalendarEvent[];
  calendars: Calendar[];
  categories: Category[];
  settings: Record<string, unknown>;
} {
  const data = JSON.parse(json);
  return {
    events: data.events || [],
    calendars: data.calendars || [],
    categories: data.categories || [],
    settings: data.settings || {},
  };
}
