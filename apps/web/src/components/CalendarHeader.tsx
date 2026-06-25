import { ChevronLeft, ChevronRight, Search, Plus, Settings } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useCalendarStore, type CalendarView } from '@/stores';
import { formatMonthYear, formatDateLong } from '@/lib/date-utils';
import { hapticLight } from '@/lib/haptics';

const VIEW_LABELS: Record<CalendarView, string> = {
  month: 'Monat',
  week: 'Woche',
  day: 'Tag',
  agenda: 'Agenda',
  year: 'Jahr',
};

interface CalendarHeaderProps {
  onSearch: () => void;
  onSettings: () => void;
}

export function CalendarHeader({ onSearch, onSettings }: CalendarHeaderProps) {
  const { currentDate, view, setView, navigate, goToToday, openEventModal } = useCalendarStore();

  function getTitle() {
    switch (view) {
      case 'day':
        return formatDateLong(currentDate);
      case 'year':
        return String(currentDate.getFullYear());
      default:
        return formatMonthYear(currentDate);
    }
  }

  return (
    <header className="shrink-0 border-b border-border bg-background">
      <div className="flex items-center justify-between px-4 py-3">
        <h1 className="text-lg font-bold truncate">{getTitle()}</h1>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={onSearch}>
            <Search className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onSettings}>
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between px-4 pb-2">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => { hapticLight(); navigate(-1); }}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => { hapticLight(); goToToday(); }}>
            Heute
          </Button>
          <Button variant="outline" size="icon" onClick={() => { hapticLight(); navigate(1); }}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button size="sm" onClick={() => { hapticLight(); openEventModal(); }}>
          <Plus className="h-4 w-4" />
          Neu
        </Button>
      </div>

      <div className="flex gap-1 px-4 pb-3 overflow-x-auto scrollbar-hide">
        {(Object.keys(VIEW_LABELS) as CalendarView[]).map((v) => (
          <button
            key={v}
            onClick={() => { hapticLight(); setView(v); }}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              view === v
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-accent'
            }`}
          >
            {VIEW_LABELS[v]}
          </button>
        ))}
      </div>
    </header>
  );
}
