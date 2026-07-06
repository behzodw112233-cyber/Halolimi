import { api } from '@halolmia/backend/convex/_generated/api';
import { useQuery } from 'convex/react';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

const SEEN_KEY = 'halolmi_notifs_seen';

async function readSeen(): Promise<number> {
  try {
    const raw =
      Platform.OS === 'web'
        ? globalThis.localStorage?.getItem(SEEN_KEY)
        : await SecureStore.getItemAsync(SEEN_KEY);
    return raw ? Number(raw) : 0;
  } catch {
    return 0;
  }
}

async function writeSeen(ts: number) {
  try {
    if (Platform.OS === 'web') globalThis.localStorage?.setItem(SEEN_KEY, String(ts));
    else await SecureStore.setItemAsync(SEEN_KEY, String(ts));
  } catch {
    /* ignore */
  }
}

/** Global announcements + a locally-tracked "unread" flag. */
export function useNotifications() {
  const items = useQuery(api.notifications.list);
  const [seen, setSeen] = useState(0);

  useEffect(() => {
    readSeen().then(setSeen);
  }, []);

  const latest = items?.[0]?.createdAt ?? 0;
  const hasUnread = latest > seen;

  const markSeen = useCallback(() => {
    const now = Date.now();
    setSeen(now);
    writeSeen(now);
  }, []);

  return { items, hasUnread, markSeen };
}
