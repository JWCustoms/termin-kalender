import { useAuthStore } from '@/stores';
import type { User } from '@/lib/api';

export function useCurrentUser(): User | null {
  const user = useAuthStore((s) => s.user);
  if (!user?.id) return null;
  return user;
}

export function useUserId(): string | undefined {
  return useAuthStore((s) => s.user?.id);
}
