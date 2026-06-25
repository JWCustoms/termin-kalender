import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { MapPin, Clock } from 'lucide-react';
import { useAuthStore, useCalendarStore } from '@/stores';
import { getDb, type CalendarEvent } from '@/db/schema';
import { getEventsForRange } from '@/db/repository';
import { startOfMonth, endOfMonth, formatDateShort, formatTime, isToday, parseISO } from '@/lib/date-utils';
import { cn } from '@/lib/utils';
import { hapticLight } from '@/lib/haptics';

interface AgendaViewProps {
  onEventClick: (eventId: string) => void;
}

export function AgendaView({ onEventClick }: AgendaViewProps) {
  const user = useAuthStore((s) => s.user)!;
  const currentDate = useCalendarStore((s) => s.currentDate);
  const visibleCalendarIds = useCalendarStore((s) => s.visibleCalendarIds);

  const calendars = useLiveQuery(() => getDb(user.id).calendars.where('userId').equals(user.id).toArray(), [user.id]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const rangeStart = startOfMonth(currentDate);
  const rangeEnd = endOfMonth(currentDate);

  async function loadEvents() {
    const ids = visibleCalendarIds.length
      ? visibleCalendarIds
      : calendars?.filter((c) => c.isVisible).map((c) => c.id);
    const data = await getEventsForRange(user.id, rangeStart, rangeEnd, ids);
    setEvents(data);
  }

  useEffect(() => { loadEvents(); }, [user.id, rangeStart.getTime(), rangeEnd.getTime(), visibleCalendarIds, calendars]);

  const calendarMap = new Map(calendars?.map((c) => [c.id, c]) || []);

  const grouped = events.reduce<Record<string, CalendarEvent[]>>((acc, event) => {
    const key = event.startDate.slice(0, 10);
    if (!acc[key]) acc[key] = [];
    acc[key].push(event);
    return acc;
  }, {});

  async function handleRefresh() {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  }

  return (
    <div
      className="flex-1 overflow-y-auto"
      onTouchStart={(e) => {
        const el = e.currentTarget;
        if (el.scrollTop === 0) {
          (el as HTMLElement & { _startY?: number })._startY = e.touches[0].clientY;
        }
      }}
      onTouchEnd={async (e) => {
        const el = e.currentTarget as HTMLElement & { _startY?: number };
        if (el._startY && e.changedTouches[0].clientY - el._startY > 80) {
          await handleRefresh();
        }
        el._startY = undefined;
      }}
    >
      {refreshing && (
        <div className="text-center py-2 text-sm text-muted-foreground">Aktualisiere...</div>
      )}

      {Object.keys(grouped).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Clock className="h-12 w-12 mb-3 opacity-50" />
          <p>Keine Termine in diesem Monat</p>
        </div>
      ) : (
        Object.entries(grouped).map(([dateKey, dayEvents]) => {
          const date = parseISO(dateKey);
          return (
            <div key={dateKey} className="border-b border-border">
              <div className={cn(
                'sticky top-0 bg-background/95 backdrop-blur px-4 py-2 text-sm font-semibold border-b border-border',
                isToday(date) && 'text-primary'
              )}>
                {formatDateShort(date)}
                {isToday(date) && ' — Heute'}
              </div>
              {dayEvents.map((event) => {
                const color = calendarMap.get(event.calendarId)?.color || '#2563eb';
                return (
                  <button
                    key={event.id}
                    onClick={() => { hapticLight(); onEventClick(event.id); }}
                    className="flex w-full items-start gap-3 px-4 py-3 hover:bg-accent/50 text-left"
                  >
                    <div className="w-1 self-stretch rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{event.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {event.allDay ? 'Ganztägig' : `${formatTime(event.startDate)} – ${formatTime(event.endDate)}`}
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <MapPin className="h-3 w-3" /> {event.location}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })
      )}
    </div>
  );
}
