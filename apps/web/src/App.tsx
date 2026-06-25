import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore, useSettingsStore, useCalendarStore, applyTheme } from '@/stores';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { CalendarPage } from '@/pages/CalendarPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { initNotifications, requestNotificationPermission } from '@/lib/notifications';
import { initUserData } from '@/db/repository';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthHydrated();
  if (!hydrated) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Laden...
      </div>
    );
  }
  if (!user?.id) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function useAuthHydrated() {
  const [hydrated, setHydrated] = useState(useAuthStore.persist.hasHydrated());
  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
    setHydrated(useAuthStore.persist.hasHydrated());
    return unsub;
  }, []);
  return hydrated;
}

function AppInit() {
  const user = useAuthStore((s) => s.user);
  const theme = useSettingsStore((s) => s.theme);

  useEffect(() => {
    applyTheme(theme);
    initNotifications();
    requestNotificationPermission();
  }, [theme]);

  useEffect(() => {
    if (user?.id) {
      initUserData(user.id);
    }
  }, [user?.id]);

  useEffect(() => {
    const handler = (e: Event) => {
      const { eventId } = (e as CustomEvent).detail;
      if (eventId) {
        useCalendarStore.getState().openEventModal(undefined, eventId);
      }
    };
    window.addEventListener('open-event', handler);
    return () => window.removeEventListener('open-event', handler);
  }, []);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInit />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
