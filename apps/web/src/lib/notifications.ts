import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import type { CalendarEvent } from '@/db/schema';
import { parseISO } from '@/lib/date-utils';

let permissionGranted = false;

export async function requestNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    if ('Notification' in window) {
      const result = await Notification.requestPermission();
      permissionGranted = result === 'granted';
      return permissionGranted;
    }
    return false;
  }

  const result = await LocalNotifications.requestPermissions();
  permissionGranted = result.display === 'granted';
  return permissionGranted;
}

export async function scheduleEventReminders(event: CalendarEvent): Promise<void> {
  if (!event.reminders?.length) return;

  const granted = permissionGranted || (await requestNotificationPermission());
  if (!granted) return;

  await cancelEventReminders(event.id);

  const notifications = (event.reminders ?? []).map((reminder, index) => {
    const eventTime = parseISO(event.startDate);
    const notifyAt = new Date(eventTime.getTime() - reminder.minutesBefore * 60000);
    if (notifyAt <= new Date()) return null;

    return {
      id: hashId(`${event.id}-${index}`),
      title: event.title,
      body: reminder.minutesBefore === 0
        ? 'Termin beginnt jetzt'
        : `In ${formatReminderTime(reminder.minutesBefore)}`,
      schedule: { at: notifyAt },
      extra: { eventId: event.id },
    };
  }).filter(Boolean) as {
    id: number;
    title: string;
    body: string;
    schedule: { at: Date };
    extra: { eventId: string };
  }[];

  if (!notifications.length) return;

  if (Capacitor.isNativePlatform()) {
    await LocalNotifications.schedule({ notifications });
  } else {
    for (const n of notifications) {
      const delay = n.schedule.at.getTime() - Date.now();
      if (delay > 0) {
        setTimeout(() => {
          new Notification(n.title, { body: n.body });
        }, delay);
      }
    }
  }
}

export async function cancelEventReminders(eventId: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const ids = Array.from({ length: 10 }, (_, i) => hashId(`${eventId}-${i}`));
  await LocalNotifications.cancel({ notifications: ids.map((id) => ({ id })) });
}

function hashId(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 2147483647;
}

function formatReminderTime(minutes: number): string {
  if (minutes < 60) return `${minutes} Minuten`;
  if (minutes < 1440) return `${minutes / 60} Stunde${minutes > 60 ? 'n' : ''}`;
  return `${minutes / 1440} Tag${minutes > 1440 ? 'e' : ''}`;
}

export async function initNotifications(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
      const eventId = action.notification.extra?.eventId;
      if (eventId) {
        window.dispatchEvent(new CustomEvent('open-event', { detail: { eventId } }));
      }
    });
  }
}
