import { useLiveQuery } from 'dexie-react-hooks';
import { getDb } from '@/db/schema';
import { useCurrentUser, useUserId } from './useCurrentUser';

export function useUserCalendars() {
  const user = useCurrentUser();
  const userId = useUserId();
  const calendars = useLiveQuery(
    () => (userId ? getDb(userId).calendars.where('userId').equals(userId).toArray() : []),
    [userId]
  );
  return { user, userId, calendars: calendars ?? undefined };
}
