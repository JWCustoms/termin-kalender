import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  ArrowLeft, Moon, Sun, Monitor, Download, Upload, Trash2,
  Calendar, MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { useAuthStore, useSettingsStore, applyTheme } from '@/stores';
import { getDb, type Calendar as CalendarType } from '@/db/schema';
import { updateSettings, getSettings, clearUserEvents } from '@/db/repository';
import { updateProfile, changePassword, deleteAccount } from '@/lib/api';
import { exportEventsToICS, importEventsFromICS, exportBackupJSON, importBackupJSON } from '@/lib/ics';
import { generateHolidayEvents, BUNDESLAND_OPTIONS, type Bundesland } from '@/lib/holidays';
import { v4 as uuidv4 } from '@/db/uuid';
import { createEvent } from '@/db/repository';
import { hapticSuccess } from '@/lib/haptics';

export function SettingsPage() {
  const user = useAuthStore((s) => s.user)!;
  const logout = useAuthStore((s) => s.logout);
  const setUser = useAuthStore((s) => s.setUser);
  const { theme, setTheme } = useSettingsStore();
  const navigate = useNavigate();

  const calendars = useLiveQuery(() => getDb(user.id).calendars.where('userId').equals(user.id).toArray(), [user.id]);
  const settings = useLiveQuery(() => getDb(user.id).settings.where('userId').equals(user.id).first(), [user.id]);

  const [name, setName] = useState(user.name);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleUpdateProfile() {
    try {
      const { user: updated } = await updateProfile(name);
      setUser(updated);
      setMessage('Profil aktualisiert');
      hapticSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler');
    }
  }

  async function handleChangePassword() {
    try {
      await changePassword(currentPassword, newPassword);
      setMessage('Passwort geändert');
      setCurrentPassword('');
      setNewPassword('');
      hapticSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler');
    }
  }

  async function handleExportICS() {
    const events = await getDb(user.id).events.where('userId').equals(user.id).toArray();
    const ics = exportEventsToICS(events);
    downloadFile(ics, 'termin-kalender.ics', 'text/calendar');
    hapticSuccess();
  }

  async function handleImportICS() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.ics';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      const imported = importEventsFromICS(text);
      const defaultCal = calendars?.find((c) => c.isDefault) || calendars?.[0];
      if (!defaultCal) return;

      for (const ev of imported) {
        await createEvent({
          id: uuidv4(),
          userId: user.id,
          calendarId: defaultCal.id,
          title: ev.title,
          description: ev.description || '',
          location: ev.location || '',
          url: ev.url || '',
          notes: '',
          startDate: ev.startDate,
          endDate: ev.endDate,
          allDay: ev.allDay,
          rrule: ev.rrule,
          exdates: [],
          categoryIds: [],
          reminders: [{ minutesBefore: 15 }],
        });
      }
      setMessage(`${imported.length} Termine importiert`);
      hapticSuccess();
    };
    input.click();
  }

  async function handleExportJSON() {
    const events = await getDb(user.id).events.where('userId').equals(user.id).toArray();
    const cats = await getDb(user.id).categories.where('userId').equals(user.id).toArray();
    const cals = await getDb(user.id).calendars.where('userId').equals(user.id).toArray();
    const s = await getSettings(user.id);
    const json = exportBackupJSON({ events, calendars: cals, categories: cats, settings: (s || {}) as Record<string, unknown> });
    downloadFile(json, 'termin-kalender-backup.json', 'application/json');
    hapticSuccess();
  }

  async function handleImportJSON() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const data = importBackupJSON(await file.text());
      const db = getDb(user.id);
      await db.events.bulkPut(data.events.map((ev) => ({ ...ev, userId: user.id })));
      await db.calendars.bulkPut(data.calendars.map((c) => ({ ...c, userId: user.id })));
      await db.categories.bulkPut(data.categories.map((c) => ({ ...c, userId: user.id })));
      setMessage('Backup wiederhergestellt');
      hapticSuccess();
    };
    input.click();
  }

  async function handleToggleHolidays(enabled: boolean) {
    await updateSettings(user.id, { holidaysEnabled: enabled });
    if (enabled && settings) {
      let holidayCal = calendars?.find((c) => c.isHolidayCalendar);
      if (!holidayCal) {
        holidayCal = {
          id: uuidv4(),
          userId: user.id,
          name: 'Feiertage',
          color: '#f59e0b',
          isDefault: false,
          isVisible: true,
          isHolidayCalendar: true,
          createdAt: new Date().toISOString(),
        };
        await getDb(user.id).calendars.add(holidayCal);
      }
      const year = settings.holidaysYear || new Date().getFullYear();
      const events = generateHolidayEvents(user.id, holidayCal.id, year, settings.bundesland as Bundesland);
      await getDb(user.id).events.bulkPut(events);
      setMessage(`Feiertage ${year} geladen`);
    }
  }

  async function handleDeleteAccount() {
    try {
      await deleteAccount(deletePassword);
      await clearUserEvents(user.id);
      logout();
      navigate('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler');
    }
  }

  function downloadFile(content: string, filename: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold">Einstellungen</h1>
      </div>

      <div className="p-4 space-y-6">
        {message && <div className="rounded-lg bg-green-500/10 px-4 py-3 text-sm text-green-600">{message}</div>}
        {error && <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}

        <section className="space-y-3">
          <h2 className="font-semibold flex items-center gap-2"><Monitor className="h-4 w-4" /> Erscheinungsbild</h2>
          <div className="flex gap-2">
            {([
              { value: 'light' as const, icon: Sun, label: 'Hell' },
              { value: 'dark' as const, icon: Moon, label: 'Dunkel' },
              { value: 'system' as const, icon: Monitor, label: 'System' },
            ]).map(({ value, icon: Icon, label }) => (
              <button
                key={value}
                onClick={() => { setTheme(value); updateSettings(user.id, { theme: value }); applyTheme(value); }}
                className={`flex-1 flex flex-col items-center gap-1 rounded-lg border p-3 text-sm ${
                  theme === value ? 'border-primary bg-primary/5' : 'border-border'
                }`}
              >
                <Icon className="h-5 w-5" />
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold">Profil</h2>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <Button onClick={handleUpdateProfile} size="sm">Profil speichern</Button>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold">Passwort ändern</h2>
          <Input type="password" placeholder="Aktuelles Passwort" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          <Input type="password" placeholder="Neues Passwort" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          <Button onClick={handleChangePassword} size="sm" variant="outline">Passwort ändern</Button>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold flex items-center gap-2"><MapPin className="h-4 w-4" /> Feiertage</h2>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings?.holidaysEnabled || false}
              onChange={(e) => handleToggleHolidays(e.target.checked)}
              className="h-4 w-4"
            />
            <Label>Deutsche Feiertage anzeigen</Label>
          </div>
          <Select
            value={settings?.bundesland || 'ALL'}
            onChange={async (e) => {
              await updateSettings(user.id, { bundesland: e.target.value });
            }}
          >
            {BUNDESLAND_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </Select>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold flex items-center gap-2"><Calendar className="h-4 w-4" /> Kalender</h2>
          {calendars?.map((cal: CalendarType) => (
            <div key={cal.id} className="flex items-center gap-3">
              <div className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: cal.color }} />
              <span className="flex-1 text-sm">{cal.name}</span>
              <input
                type="checkbox"
                checked={cal.isVisible}
                onChange={async (e) => {
                  await getDb(user.id).calendars.update(cal.id, { isVisible: e.target.checked });
                }}
                className="h-4 w-4"
              />
            </div>
          ))}
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold">Import / Export</h2>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" onClick={handleImportICS}>
              <Upload className="h-4 w-4" /> .ics Import
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportICS}>
              <Download className="h-4 w-4" /> .ics Export
            </Button>
            <Button variant="outline" size="sm" onClick={handleImportJSON}>
              <Upload className="h-4 w-4" /> JSON Backup
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportJSON}>
              <Download className="h-4 w-4" /> JSON Export
            </Button>
          </div>
        </section>

        <section className="space-y-3">
          <Button variant="outline" className="w-full" onClick={() => { logout(); navigate('/login'); }}>
            Abmelden
          </Button>
        </section>

        <section className="space-y-3 border-t border-border pt-4">
          <h2 className="font-semibold text-destructive flex items-center gap-2">
            <Trash2 className="h-4 w-4" /> Konto löschen
          </h2>
          <Input type="password" placeholder="Passwort zur Bestätigung" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} />
          <Button variant="destructive" size="sm" onClick={handleDeleteAccount}>Konto unwiderruflich löschen</Button>
        </section>

        <div className="text-center text-xs text-muted-foreground pb-8">
          <p>Termin Kalender v1.0.0</p>
          <p className="mt-1">Deine Termine werden lokal auf diesem Gerät gespeichert.</p>
        </div>
      </div>
    </div>
  );
}
