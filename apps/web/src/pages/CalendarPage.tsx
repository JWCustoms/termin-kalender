import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCalendarStore } from '@/stores';
import { CalendarHeader } from '@/components/CalendarHeader';
import { MonthView } from '@/components/calendar/MonthView';
import { WeekView } from '@/components/calendar/WeekView';
import { DayView } from '@/components/calendar/DayView';
import { AgendaView } from '@/components/calendar/AgendaView';
import { YearView } from '@/components/calendar/YearView';
import { EventModal } from '@/components/EventModal';
import { SearchModal } from '@/components/SearchModal';

export function CalendarPage() {
  const view = useCalendarStore((s) => s.view);
  const setCurrentDate = useCalendarStore((s) => s.setCurrentDate);
  const setView = useCalendarStore((s) => s.setView);
  const openEventModal = useCalendarStore((s) => s.openEventModal);
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);

  function handleDayClick(date: Date) {
    setCurrentDate(date);
    setView('day');
  }

  function handleEventClick(eventId: string) {
    openEventModal(undefined, eventId);
  }

  function handleSlotClick(date: Date) {
    openEventModal(date);
  }

  return (
    <div className="flex flex-col h-full">
      <CalendarHeader
        onSearch={() => setSearchOpen(true)}
        onSettings={() => navigate('/settings')}
      />

      <main className="flex-1 overflow-hidden">
        {view === 'month' && (
          <MonthView onDayClick={handleDayClick} onEventClick={handleEventClick} />
        )}
        {view === 'week' && (
          <WeekView onEventClick={handleEventClick} onSlotClick={handleSlotClick} />
        )}
        {view === 'day' && (
          <DayView onEventClick={handleEventClick} onSlotClick={handleSlotClick} />
        )}
        {view === 'agenda' && (
          <AgendaView onEventClick={handleEventClick} />
        )}
        {view === 'year' && <YearView />}
      </main>

      <EventModal />
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
