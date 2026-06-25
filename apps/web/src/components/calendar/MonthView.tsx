import { useEffect, useState } from 'react';
import { useCalendarStore } from '@/stores';
import { type CalendarEvent } from '@/db/schema';
import { getEventsForRange } from '@/db/repository';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameDay, isToday, formatDate, WEEKDAY_LABELS } from '@/lib/date-utils';
import { cn } from '@/lib/utils';
import { getVisibleCalendarIds } from '@/lib/calendars';
import { hapticLight } from '@/lib/haptics';
import { useUserCalendars } from '@/hooks/useUserCalendars';

interface MonthViewProps {
  onDayClick: (date: Date) => void;
  onEventClick: (eventId: string) => void;
}

export function MonthView({ onDayClick, onEventClick }: MonthViewProps) {
  const { user, userId, calendars } = useUserCalendars();
  const currentDate = useCalendarStore((s) => s.currentDate);
  const visibleCalendarIds = useCalendarStore((s) => s.visibleCalendarIds);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days: Date[] = [];
  let d = calStart;
  while (d <= calEnd) {
    days.push(new Date(d));
    d = addDays(d, 1);
  }

  useEffect(() => {
    const ids = visibleCalendarIds.length ? visibleCalendarIds : getVisibleCalendarIds(calendars);
    if (!userId || !ids) return;
    getEventsForRange(userId, calStart, calEnd, ids).then(setEvents);
  }, [userId, calStart.getTime(), calEnd.getTime(), visibleCalendarIds, calendars]);

  if (!user) {
    return <div className="flex flex-1 items-center justify-center text-muted-foreground">Laden...</div>;
  }

  const calendarMap = new Map((calendars ?? []).map((c) => [c.id, c]));

  function getEventsForDay(day: Date) {
    return events.filter((e) => e?.id && isSameDay(new Date(e.startDate), day));
  }

  return (
    <div className="flex flex-col h-full">
      <div className="grid grid-cols-7 border-b border-border">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="py-2 text-center text-xs font-medium text-muted-foreground">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 flex-1 auto-rows-fr">
        {days.map((day) => {
          const dayEvents = getEventsForDay(day);
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();

          return (
            <button
              key={day.toISOString()}
              onClick={() => { hapticLight(); onDayClick(day); }}
              className={cn(
                'border-b border-r border-border p-1 min-h-[60px] text-left transition-colors hover:bg-accent/50',
                !isCurrentMonth && 'opacity-40'
              )}
            >
              <span
                className={cn(
                  'inline-flex h-7 w-7 items-center justify-center rounded-full text-sm',
                  isToday(day) && 'bg-primary text-primary-foreground font-bold'
                )}
              >
                {day.getDate()}
              </span>
              <div className="mt-0.5 space-y-0.5">
                {dayEvents.slice(0, 3).map((event) => {
                  const cal = calendarMap.get(event.calendarId);
                  return (
                    <div
                      key={event.id}
                      onClick={(e) => { e.stopPropagation(); onEventClick(event.id); }}
                      className="truncate rounded px-1 text-[10px] text-white"
                      style={{ backgroundColor: cal?.color || '#2563eb' }}
                    >
                      {!event.allDay && formatDate(event.startDate, 'HH:mm')} {event.title}
                    </div>
                  );
                })}
                {dayEvents.length > 3 && (
                  <div className="text-[10px] text-muted-foreground px-1">+{dayEvents.length - 3} mehr</div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
