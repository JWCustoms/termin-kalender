import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { MapPin } from 'lucide-react';
import { useAuthStore, useCalendarStore } from '@/stores';
import { getDb, type CalendarEvent } from '@/db/schema';
import { getEventsForDay } from '@/db/repository';
import { formatDateLong, formatTime, isToday } from '@/lib/date-utils';
import { cn } from '@/lib/utils';
import { getVisibleCalendarIds } from '@/lib/calendars';
import { hapticLight } from '@/lib/haptics';

const HOURS = Array.from({ length: 24 }, (_, i) => i);

interface DayViewProps {
  onEventClick: (eventId: string) => void;
  onSlotClick: (date: Date) => void;
}

export function DayView({ onEventClick, onSlotClick }: DayViewProps) {
  const user = useAuthStore((s) => s.user)!;
  const currentDate = useCalendarStore((s) => s.currentDate);
  const visibleCalendarIds = useCalendarStore((s) => s.visibleCalendarIds);

  const calendars = useLiveQuery(() => getDb(user.id).calendars.where('userId').equals(user.id).toArray(), [user.id]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    const ids = visibleCalendarIds.length
      ? visibleCalendarIds
      : getVisibleCalendarIds(calendars);
    if (!ids) return;
    getEventsForDay(user.id, currentDate, ids).then(setEvents);
  }, [user.id, currentDate.getTime(), visibleCalendarIds, calendars]);

  const calendarMap = new Map(calendars?.map((c) => [c.id, c]) || []);
  const allDayEvents = events.filter((e) => e.allDay);
  const timedEvents = events.filter((e) => !e.allDay);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-border shrink-0">
        <h2 className={cn('text-lg font-semibold', isToday(currentDate) && 'text-primary')}>
          {formatDateLong(currentDate)}
        </h2>
      </div>

      {allDayEvents.length > 0 && (
        <div className="px-4 py-2 border-b border-border space-y-1 shrink-0">
          <div className="text-xs text-muted-foreground">Ganztägig</div>
          {allDayEvents.map((e) => (
            <button
              key={e.id}
              onClick={() => onEventClick(e.id)}
              className="w-full rounded-lg px-3 py-2 text-left text-sm text-white"
              style={{ backgroundColor: calendarMap.get(e.calendarId)?.color }}
            >
              {e.title}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto relative">
        <div className="relative" style={{ minHeight: 24 * 60 }}>
          {HOURS.map((hour) => (
            <button
              key={hour}
              onClick={() => {
                hapticLight();
                const d = new Date(currentDate);
                d.setHours(hour, 0, 0, 0);
                onSlotClick(d);
              }}
              className="flex w-full border-t border-border/50 hover:bg-accent/30"
              style={{ height: 60 }}
            >
              <span className="w-12 shrink-0 text-xs text-muted-foreground pt-1 pr-2 text-right">
                {String(hour).padStart(2, '0')}:00
              </span>
              <span className="flex-1" />
            </button>
          ))}

          {timedEvents.map((event) => {
            const start = new Date(event.startDate);
            const end = new Date(event.endDate);
            const top = (start.getHours() * 60 + start.getMinutes());
            const height = Math.max(((end.getTime() - start.getTime()) / 60000), 30);
            const color = calendarMap.get(event.calendarId)?.color || '#2563eb';

            return (
              <button
                key={event.id}
                onClick={() => onEventClick(event.id)}
                className="absolute left-14 right-2 rounded-lg px-3 py-2 text-left text-white z-10 overflow-hidden"
                style={{ top, height, backgroundColor: color }}
              >
                <div className="font-medium text-sm">{event.title}</div>
                <div className="text-xs opacity-80">
                  {formatTime(event.startDate)} – {formatTime(event.endDate)}
                </div>
                {event.location && (
                  <div className="flex items-center gap-1 text-xs opacity-80 mt-1">
                    <MapPin className="h-3 w-3" /> {event.location}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
