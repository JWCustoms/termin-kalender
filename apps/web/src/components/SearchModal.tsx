import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/stores';
import { searchEvents } from '@/db/repository';
import { formatDateShort, formatTime } from '@/lib/date-utils';
import type { CalendarEvent } from '@/db/schema';
import { useCalendarStore } from '@/stores';

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

export function SearchModal({ open, onClose }: SearchModalProps) {
  const user = useAuthStore((s) => s.user)!;
  const openEventModal = useCalendarStore((s) => s.openEventModal);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CalendarEvent[]>([]);

  async function handleSearch(q: string) {
    setQuery(q);
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const events = await searchEvents(user.id, q);
    setResults(events);
  }

  function handleSelect(eventId: string) {
    openEventModal(undefined, eventId);
    onClose();
    setQuery('');
    setResults([]);
  }

  return (
    <Modal open={open} onClose={onClose} title="Termine suchen">
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Titel, Ort, Beschreibung..."
            className="pl-9"
            autoFocus
          />
          {query && (
            <button onClick={() => handleSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {results.length > 0 ? (
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {results.map((event) => (
              <button
                key={event.id}
                onClick={() => handleSelect(event.id)}
                className="w-full text-left rounded-lg px-3 py-2 hover:bg-accent"
              >
                <div className="font-medium">{event.title}</div>
                <div className="text-sm text-muted-foreground">
                  {formatDateShort(event.startDate)}
                  {!event.allDay && ` · ${formatTime(event.startDate)}`}
                  {event.location && ` · ${event.location}`}
                </div>
              </button>
            ))}
          </div>
        ) : query.length >= 2 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Keine Ergebnisse gefunden</p>
        ) : null}
      </div>
    </Modal>
  );
}
