import * as SecureStore from 'expo-secure-store';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

const KEY = 'halolmi_recent';
const MAX = 12;

// Same storage strategy as auth: SecureStore on native, localStorage on web.
async function readIds(): Promise<string[]> {
  try {
    const raw =
      Platform.OS === 'web'
        ? globalThis.localStorage?.getItem(KEY)
        : await SecureStore.getItemAsync(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

async function writeIds(ids: string[]) {
  const raw = JSON.stringify(ids.slice(0, MAX));
  try {
    if (Platform.OS === 'web') globalThis.localStorage?.setItem(KEY, raw);
    else await SecureStore.setItemAsync(KEY, raw);
  } catch {
    /* ignore */
  }
}

/** Record a listing as just-viewed. Returns true when this is a fresh local view. */
export async function recordViewed(id: string): Promise<boolean> {
  const ids = await readIds();
  const fresh = !ids.includes(id);
  const next = [id, ...ids.filter((x) => x !== id)].slice(0, MAX);
  await writeIds(next);
  return fresh;
}

/** Reactive list of recently viewed ids. `exclude` drops the current listing. */
export function useRecentlyViewed(exclude?: string): string[] {
  const [ids, setIds] = useState<string[]>([]);
  const refresh = useCallback(() => {
    readIds().then((list) => setIds(exclude ? list.filter((x) => x !== exclude) : list));
  }, [exclude]);
  useEffect(() => {
    refresh();
  }, [refresh]);
  useFocusEffect(refresh);
  return ids;
}
