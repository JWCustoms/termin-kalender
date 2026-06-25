import { getGermanHolidays } from './holidays-data';

export type Bundesland =
  | 'BW' | 'BY' | 'BE' | 'BB' | 'HB' | 'HH' | 'HE' | 'MV'
  | 'NI' | 'NW' | 'RP' | 'SL' | 'SN' | 'ST' | 'SH' | 'TH' | 'ALL';

export const BUNDESLAND_OPTIONS: { value: Bundesland; label: string }[] = [
  { value: 'ALL', label: 'Alle (bundesweit)' },
  { value: 'BW', label: 'Baden-Württemberg' },
  { value: 'BY', label: 'Bayern' },
  { value: 'BE', label: 'Berlin' },
  { value: 'BB', label: 'Brandenburg' },
  { value: 'HB', label: 'Bremen' },
  { value: 'HH', label: 'Hamburg' },
  { value: 'HE', label: 'Hessen' },
  { value: 'MV', label: 'Mecklenburg-Vorpommern' },
  { value: 'NI', label: 'Niedersachsen' },
  { value: 'NW', label: 'Nordrhein-Westfalen' },
  { value: 'RP', label: 'Rheinland-Pfalz' },
  { value: 'SL', label: 'Saarland' },
  { value: 'SN', label: 'Sachsen' },
  { value: 'ST', label: 'Sachsen-Anhalt' },
  { value: 'SH', label: 'Schleswig-Holstein' },
  { value: 'TH', label: 'Thüringen' },
];

export function generateHolidayEvents(userId: string, calendarId: string, year: number, bundesland: Bundesland) {
  const holidays = getGermanHolidays(year, bundesland);
  return holidays.map((h) => ({
    id: `holiday-${year}-${h.date}-${h.name}`,
    userId,
    calendarId,
    title: h.name,
    description: 'Deutscher Feiertag',
    location: '',
    url: '',
    notes: '',
    startDate: new Date(`${h.date}T00:00:00`).toISOString(),
    endDate: new Date(`${h.date}T23:59:59`).toISOString(),
    allDay: true,
    rrule: undefined,
    exdates: [] as string[],
    categoryIds: [] as string[],
    reminders: [] as { minutesBefore: number }[],
    isHoliday: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
}
