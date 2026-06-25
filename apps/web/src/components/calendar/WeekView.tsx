import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuthStore, useCalendarStore } from '@/stores';
import { getDb, type CalendarEvent } from '@/db/schema';
import { getEventsForRange } from '@/db/repository';
import {
  startOfWeek, endOfWeek, addDays, isSameDay, isToday,
  formatTime, WEEKDAY_LABELS, differenceInMinutes, setHours, setMinutes,
} from '@/lib/date-utils';
import { cn } from '@/lib/utils';
import { getVisibleCalendarIds } from '@/lib/calendars';
import { hapticLight } from '@/lib/haptics';

const HOURS = Array.from({ length: 24 }, (_, i) => i);

interface WeekViewProps {
  onEventClick: (eventId: string) => void;
  onSlotClick: (date: Date) => void;
}

export function WeekView({ onEventClick, onSlotClick }: WeekViewProps) {
  const user = useAuthStore((s) => s.user)!;
  const currentDate = useCalendarStore((s) => s.currentDate);
  const visibleCalendarIds = useCalendarStore((s) => s.visibleCalendarIds);

  const calendars = useLiveQuery(() => getDb(user.id).calendars.where('userId').equals(user.id).toArray(), [user.id]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  useEffect(() => {
    const ids = visibleCalendarIds.length
      ? visibleCalendarIds
      : getVisibleCalendarIds(calendars);
    if (!ids) return;
    getEventsForRange(user.id, weekStart, weekEnd, ids).then(setEvents);
  }, [user.id, weekStart.getTime(), weekEnd.getTime(), visibleCalendarIds, calendars]);

  const calendarMap = new Map(calendars?.map((c) => [c.id, c]) || []);

  function getTimedEvents(day: Date) {
    return events.filter((e) => !e.allDay && isSameDay(new Date(e.startDate), day));
  }

  function getAllDayEvents(day: Date) {
    return events.filter((e) => e.allDay && isSameDay(new Date(e.startDate), day));
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="grid grid-cols-[40px_repeat(7,1fr)] border-b border-border shrink-0">
        <div />
        {days.map((day, i) => (
          <div key={i} className="py-2 text-center">
            <div className="text-xs text-muted-foreground">{WEEKDAY_LABELS[i]}</div>
            <div className={cn(
              'mx-auto mt-1 flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium',
              isToday(day) && 'bg-primary text-primary-foreground'
            )}>
              {day.getDate()}
            </div>
          </div>
        ))}
      </div>

      {days.some((d) => getAllDayEvents(d).length > 0) && (
        <div className="grid grid-cols-[40px_repeat(7,1fr)] border-b border-border shrink-0">
          <div className="text-[10px] text-muted-foreground p-1">Ganztägig</div>
          {days.map((day) => (
            <div key={day.toISOString()} className="p-0.5 space-y-0.5">
              {getAllDayEvents(day).map((e) => (
                <button
                  key={e.id}
                  onClick={() => onEventClick(e.id)}
                  className="w-full truncate rounded px-1 text-[10px] text-white text-left"
                  style={{ backgroundColor: calendarMap.get(e.calendarId)?.color }}
                >
                  {e.title}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-[40px_repeat(7,1fr)] relative" style={{ minHeight: 24 * 48 }}>
          {HOURS.map((hour) => (
            <div key={hour} className="contents">
              <div className="text-[10px] text-muted-foreground text-right pr-1 -mt-2 border-t border-border/50" style={{ gridRow: hour + 1 }}>
                {String(hour).padStart(2, '0')}:00
              </div>
              {days.map((day) => (
                <button
                  key={`${day.toISOString()}-${hour}`}
                  onClick={() => { hapticLight(); onSlotClick(setMinutes(setHours(day, hour), 0)); }}
                  className="border-t border-r border-border/50 hover:bg-accent/30"
                  style={{ gridRow: hour + 1 }}
                />
              ))}
            </div>
          ))}

          {days.map((day, dayIndex) => {
            const dayEvents = getTimedEvents(day);
            return dayEvents.map((event) => {
              const start = new Date(event.startDate);
              const end = new Date(event.endDate);
              const startMinutes = start.getHours() * 60 + start.getMinutes();
              const duration = differenceInMinutes(end, start) || 30;
              const top = (startMinutes / 60) * 48;
              const height = Math.max((duration / 60) * 48, 20);
              const color = calendarMap.get(event.calendarId)?.color || '#2563eb';

              return (
                <button
                  key={event.id}
                  onClick={() => onEventClick(event.id)}
                  className="absolute rounded px-1 text-left text-[10px] text-white overflow-hidden z-10"
                  style={{
                    top: top + 0,
                    height,
                    left: `calc(40px + ${dayIndex} * ((100% - 40px) / 7) + 2px)`,
                    width: `calc((100% - 40px) / 7 - 4px)`,
                    backgroundColor: color,
                  }}
                >
                  <div className="font-medium truncate">{event.title}</div>
                  <div className="opacity-80">{formatTime(event.startDate)}</div>
                </button>
              );
            });
          })}
        </div>
      </div>
    </div>
  );
}
