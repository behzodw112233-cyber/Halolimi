import { api } from '@halolmia/backend/convex/_generated/api';
import type { Id } from '@halolmia/backend/convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import { useAuth } from './auth';

/**
 * Shared saved-listings state. Reads the user's saved ids and exposes a toggle
 * with an optimistic update so the heart flips instantly (Convex reactivity then
 * confirms it). Returns `authed` so callers can route to /login when logged out.
 */
export function useSaved() {
  const { userId } = useAuth();
  const savedIds = useQuery(api.saved.ids, userId ? { userId } : 'skip');

  const toggle = useMutation(api.saved.toggle).withOptimisticUpdate((store, args) => {
    if (!userId) return;
    const current = store.getQuery(api.saved.ids, { userId });
    if (current === undefined) return;
    const exists = current.includes(args.listingId);
    store.setQuery(
      api.saved.ids,
      { userId },
      exists ? current.filter((x) => x !== args.listingId) : [...current, args.listingId]
    );
  });

  const isSaved = (listingId: Id<'listings'>) => !!savedIds?.includes(listingId);

  /** Toggle a listing. Returns false (a no-op) when the user isn't logged in. */
  const toggleSave = (listingId: Id<'listings'>) => {
    if (!userId) return false;
    toggle({ userId, listingId });
    return true;
  };

  return { isSaved, toggleSave, savedIds: savedIds ?? [], authed: !!userId };
}
