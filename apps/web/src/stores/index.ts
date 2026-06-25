import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/lib/api';
import { initUserData } from '@/db/repository';
import { closeDb } from '@/db/schema';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  setAuth: (user: User, token: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,
      setAuth: async (user, token) => {
        if (!user?.id) {
          throw new Error('Ungültige Benutzerdaten');
        }
        localStorage.setItem('token', token);
        await initUserData(user.id);
        set({ user, token });
      },
      logout: () => {
        localStorage.removeItem('token');
        closeDb();
        set({ user: null, token: null });
      },
      setUser: (user) => set({ user }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
);

export type CalendarView = 'month' | 'week' | 'day' | 'agenda' | 'year';

interface CalendarState {
  currentDate: Date;
  view: CalendarView;
  selectedEventId: string | null;
  isEventModalOpen: boolean;
  eventModalDate: Date | null;
  searchQuery: string;
  visibleCalendarIds: string[];
  setCurrentDate: (date: Date) => void;
  setView: (view: CalendarView) => void;
  goToToday: () => void;
  navigate: (direction: 1 | -1) => void;
  openEventModal: (date?: Date, eventId?: string) => void;
  closeEventModal: () => void;
  setSearchQuery: (q: string) => void;
  setVisibleCalendarIds: (ids: string[]) => void;
}

export const useCalendarStore = create<CalendarState>((set, get) => ({
  currentDate: new Date(),
  view: 'month',
  selectedEventId: null,
  isEventModalOpen: false,
  eventModalDate: null,
  searchQuery: '',
  visibleCalendarIds: [],
  setCurrentDate: (date) => set({ currentDate: date }),
  setView: (view) => set({ view }),
  goToToday: () => set({ currentDate: new Date() }),
  navigate: (direction) => {
    const { currentDate, view } = get();
    const d = new Date(currentDate);
    switch (view) {
      case 'day':
        d.setDate(d.getDate() + direction);
        break;
      case 'week':
        d.setDate(d.getDate() + direction * 7);
        break;
      case 'month':
      case 'agenda':
        d.setMonth(d.getMonth() + direction);
        break;
      case 'year':
        d.setFullYear(d.getFullYear() + direction);
        break;
    }
    set({ currentDate: d });
  },
  openEventModal: (date, eventId) =>
    set({ isEventModalOpen: true, eventModalDate: date || new Date(), selectedEventId: eventId || null }),
  closeEventModal: () => set({ isEventModalOpen: false, selectedEventId: null, eventModalDate: null }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setVisibleCalendarIds: (ids) => set({ visibleCalendarIds: ids }),
}));

interface SettingsState {
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },
    }),
    { name: 'settings-storage' }
  )
);

export function applyTheme(theme: 'light' | 'dark' | 'system') {
  const root = document.documentElement;
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', prefersDark);
  } else {
    root.classList.toggle('dark', theme === 'dark');
  }
}
