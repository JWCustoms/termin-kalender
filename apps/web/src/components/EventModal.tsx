import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Trash2, Copy, MapPin, Link as LinkIcon, Bell } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Label } from '@/components/ui/Label';
import { useAuthStore, useCalendarStore } from '@/stores';
import { getDb, REMINDER_OPTIONS, type CalendarEvent } from '@/db/schema';
import { createEvent, updateEvent, deleteEvent, duplicateEvent } from '@/db/repository';
import { v4 as uuidv4 } from '@/db/uuid';
import { recurrenceToRRule, type RecurrenceType, getRecurrenceLabel } from '@/lib/recurrence';
import { getDatePart, getTimePart, combineDateAndTime } from '@/lib/date-utils';
import { scheduleEventReminders, cancelEventReminders } from '@/lib/notifications';
import { hapticSuccess, hapticMedium } from '@/lib/haptics';

export function EventModal() {
  const user = useAuthStore((s) => s.user)!;
  const { isEventModalOpen, eventModalDate, selectedEventId, closeEventModal } = useCalendarStore();

  const calendars = useLiveQuery(() => getDb(user.id).calendars.where('userId').equals(user.id).toArray(), [user.id]);
  const categories = useLiveQuery(() => getDb(user.id).categories.where('userId').equals(user.id).toArray(), [user.id]);
  const settings = useLiveQuery(() => getDb(user.id).settings.where('userId').equals(user.id).first(), [user.id]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('10:00');
  const [allDay, setAllDay] = useState(false);
  const [calendarId, setCalendarId] = useState('');
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [recurrence, setRecurrence] = useState<RecurrenceType>('none');
  const [reminders, setReminders] = useState<{ minutesBefore: number }[]>([{ minutesBefore: 15 }]);
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const isEditing = !!selectedEventId;
  const baseEventId = selectedEventId?.includes('_') ? selectedEventId.split('_')[0] : selectedEventId;

  useEffect(() => {
    if (!isEventModalOpen) return;

    if (baseEventId) {
      getDb(user.id).events.get(baseEventId).then((event) => {
        if (!event) return;
        setTitle(event.title);
        setDescription(event.description);
        setLocation(event.location);
        setUrl(event.url);
        setNotes(event.notes);
        setStartDate(getDatePart(event.startDate));
        setStartTime(getTimePart(event.startDate));
        setEndDate(getDatePart(event.endDate));
        setEndTime(getTimePart(event.endDate));
        setAllDay(event.allDay);
        setCalendarId(event.calendarId);
        setCategoryIds(event.categoryIds);
        setReminders(event.reminders.length ? event.reminders : [{ minutesBefore: 15 }]);
        setRecurrence(event.rrule ? 'weekly' : 'none');
      });
    } else if (eventModalDate) {
      const d = eventModalDate.toISOString().slice(0, 10);
      const h = String(eventModalDate.getHours()).padStart(2, '0');
      const m = String(eventModalDate.getMinutes()).padStart(2, '0');
      setTitle('');
      setDescription('');
      setLocation('');
      setUrl('');
      setNotes('');
      setStartDate(d);
      setStartTime(`${h}:${m}`);
      setEndDate(d);
      const endH = String(Math.min(eventModalDate.getHours() + 1, 23)).padStart(2, '0');
      setEndTime(`${endH}:${m}`);
      setAllDay(false);
      setCalendarId(settings?.defaultCalendarId || calendars?.find((c) => c.isDefault)?.id || '');
      setCategoryIds([]);
      setRecurrence('none');
      setReminders([{ minutesBefore: settings?.defaultReminderMinutes || 15 }]);
    }
  }, [isEventModalOpen, baseEventId, eventModalDate, calendars, settings]);

  async function handleSave() {
    if (!title.trim()) return;
    setLoading(true);

    const startISO = allDay
      ? new Date(`${startDate}T00:00:00`).toISOString()
      : combineDateAndTime(startDate, startTime);
    const endISO = allDay
      ? new Date(`${endDate}T23:59:59`).toISOString()
      : combineDateAndTime(endDate, endTime);

    const rrule = recurrenceToRRule({ type: recurrence }, startISO);

    const eventData: Omit<CalendarEvent, 'createdAt' | 'updatedAt'> = {
      id: baseEventId || uuidv4(),
      userId: user.id,
      calendarId: calendarId || calendars?.[0]?.id || '',
      title: title.trim(),
      description,
      location,
      url,
      notes,
      startDate: startISO,
      endDate: endISO,
      allDay,
      rrule,
      exdates: [],
      categoryIds,
      reminders,
    };

    try {
      let saved: CalendarEvent;
      if (isEditing && baseEventId) {
        await updateEvent(baseEventId, user.id, eventData);
        saved = { ...eventData, createdAt: '', updatedAt: '' } as CalendarEvent;
        await cancelEventReminders(baseEventId);
      } else {
        saved = await createEvent(eventData);
      }
      await scheduleEventReminders(saved);
      hapticSuccess();
      closeEventModal();
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!baseEventId) return;
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    hapticMedium();
    await cancelEventReminders(baseEventId);
    await deleteEvent(baseEventId, user.id);
    closeEventModal();
  }

  async function handleDuplicate() {
    if (!baseEventId) return;
    const event = await getDb(user.id).events.get(baseEventId);
    if (event) {
      const copy = await duplicateEvent(event);
      await scheduleEventReminders(copy);
      hapticSuccess();
      closeEventModal();
    }
  }

  function toggleReminder(minutes: number) {
    const exists = reminders.find((r) => r.minutesBefore === minutes);
    if (exists) {
      setReminders(reminders.filter((r) => r.minutesBefore !== minutes));
    } else {
      setReminders([...reminders, { minutesBefore: minutes }]);
    }
  }

  return (
    <Modal
      open={isEventModalOpen}
      onClose={closeEventModal}
      title={isEditing ? 'Termin bearbeiten' : 'Neuer Termin'}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Titel *</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Termin-Titel" />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="allDay"
            checked={allDay}
            onChange={(e) => setAllDay(e.target.checked)}
            className="h-4 w-4 rounded"
          />
          <Label htmlFor="allDay">Ganztägig</Label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Startdatum</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          {!allDay && (
            <div className="space-y-2">
              <Label>Startzeit</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
          )}
          <div className="space-y-2">
            <Label>Enddatum</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          {!allDay && (
            <div className="space-y-2">
              <Label>Endzeit</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>Kalender</Label>
          <Select value={calendarId} onChange={(e) => setCalendarId(e.target.value)}>
            {calendars?.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Wiederholung</Label>
          <Select value={recurrence} onChange={(e) => setRecurrence(e.target.value as RecurrenceType)}>
            {(['none', 'daily', 'weekly', 'monthly', 'yearly'] as RecurrenceType[]).map((t) => (
              <option key={t} value={t}>{getRecurrenceLabel(t)}</option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-1"><Bell className="h-4 w-4" /> Erinnerungen</Label>
          <div className="flex flex-wrap gap-2">
            {REMINDER_OPTIONS.map((opt) => (
              <button
                key={opt.minutes}
                type="button"
                onClick={() => toggleReminder(opt.minutes)}
                className={`rounded-full px-3 py-1 text-xs border transition-colors ${
                  reminders.some((r) => r.minutesBefore === opt.minutes)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border hover:bg-accent'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="location" className="flex items-center gap-1"><MapPin className="h-4 w-4" /> Ort</Label>
          <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Adresse oder Ort" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="url" className="flex items-center gap-1"><LinkIcon className="h-4 w-4" /> URL</Label>
          <Input id="url" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Beschreibung</Label>
          <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notizen</Label>
          <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {categories && categories.length > 0 && (
          <div className="space-y-2">
            <Label>Kategorien</Label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setCategoryIds(
                      categoryIds.includes(cat.id)
                        ? categoryIds.filter((id) => id !== cat.id)
                        : [...categoryIds, cat.id]
                    );
                  }}
                  className={`rounded-full px-3 py-1 text-xs border transition-colors ${
                    categoryIds.includes(cat.id) ? 'text-white border-transparent' : 'border-border'
                  }`}
                  style={categoryIds.includes(cat.id) ? { backgroundColor: cat.color } : {}}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button onClick={handleSave} disabled={loading || !title.trim()} className="flex-1">
            {loading ? 'Speichern...' : 'Speichern'}
          </Button>
          {isEditing && (
            <>
              <Button variant="outline" size="icon" onClick={handleDuplicate} title="Duplizieren">
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant={deleteConfirm ? 'destructive' : 'outline'}
                size="icon"
                onClick={handleDelete}
                title={deleteConfirm ? 'Nochmal klicken zum Löschen' : 'Löschen'}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
