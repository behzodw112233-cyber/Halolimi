import { api } from '@halolmia/backend/convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useAuth } from './auth';

const SEEN_KEY = 'halolmi_notifs_seen';

export type AppNotification = {
  _id: string;
  icon: string;
  title: string;
  body: string;
  createdAt: number;
  readAt?: number;
  targetType?: string;
  targetId?: string;
};

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
  const { userId } = useAuth();
  const globalItems = useQuery(api.notifications.list);
  const userItems = useQuery(
    api.notifications.listForUser,
    userId ? { userId, limit: 50 } : { userId: undefined, limit: 0 }
  );
  const markAllRead = useMutation(api.notifications.markAllRead);
  const [seen, setSeen] = useState(0);

  useEffect(() => {
    readSeen().then(setSeen);
  }, []);

  const items: AppNotification[] = [
    ...(userItems ?? []).map((item) => ({
      _id: item._id,
      icon: item.icon,
      title: item.title,
      body: item.body,
      createdAt: item.createdAt,
      readAt: item.readAt,
      targetType: item.targetType,
      targetId: item.targetId,
    })),
    ...(globalItems ?? []).map((item) => ({
      _id: item._id,
      icon: item.icon,
      title: item.title,
      body: item.body,
      createdAt: item.createdAt,
      readAt: seen,
    })),
  ].sort((a, b) => b.createdAt - a.createdAt);
  const latestGlobal = globalItems?.[0]?.createdAt ?? 0;
  const hasUserUnread = (userItems ?? []).some((item) => !item.readAt);
  const hasUnread = hasUserUnread || latestGlobal > seen;

  const markSeen = () => {
    const now = Date.now();
    setSeen(now);
    writeSeen(now);
    if (userId) markAllRead({ userId }).catch(() => {});
  };

  return { items, hasUnread, markSeen };
}
