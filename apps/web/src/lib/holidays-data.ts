import type { Bundesland } from './holidays';

interface Holiday {
  date: string;
  name: string;
  states?: Bundesland[];
}

function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function getGermanHolidays(year: number, bundesland: Bundesland): { date: string; name: string }[] {
  const easter = easterSunday(year);
  const all: Holiday[] = [
    { date: `${year}-01-01`, name: 'Neujahr' },
    { date: fmt(addDays(easter, -2)), name: 'Karfreitag' },
    { date: fmt(addDays(easter, 1)), name: 'Ostermontag' },
    { date: `${year}-05-01`, name: 'Tag der Arbeit' },
    { date: fmt(addDays(easter, 39)), name: 'Christi Himmelfahrt' },
    { date: fmt(addDays(easter, 50)), name: 'Pfingstmontag' },
    { date: `${year}-10-03`, name: 'Tag der Deutschen Einheit' },
    { date: `${year}-12-25`, name: '1. Weihnachtstag' },
    { date: `${year}-12-26`, name: '2. Weihnachtstag' },
    { date: fmt(addDays(easter, 60)), name: 'Fronleichnam', states: ['BW', 'BY', 'HE', 'NW', 'RP', 'SL', 'SN', 'TH'] },
    { date: `${year}-08-15`, name: 'Mariä Himmelfahrt', states: ['BY', 'SL'] },
    { date: `${year}-10-31`, name: 'Reformationstag', states: ['BB', 'HB', 'HH', 'MV', 'NI', 'SN', 'ST', 'SH', 'TH'] },
    { date: `${year}-11-01`, name: 'Allerheiligen', states: ['BW', 'BY', 'NW', 'RP', 'SL'] },
    { date: `${year}-11-22`, name: 'Buß- und Bettag', states: ['SN'] },
  ];

  return all.filter((h) => {
    if (!h.states) return true;
    if (bundesland === 'ALL') return true;
    return h.states.includes(bundesland);
  });
}
