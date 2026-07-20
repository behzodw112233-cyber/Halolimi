import * as SecureStore from 'expo-secure-store';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

const KEY = 'halolmi_recent';
const MAX = 12;
const CONVEX_ID_RE = /^[a-z0-9]{20,}$/i;

function cleanIds(value: unknown, exclude?: string) {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value
    .filter((id): id is string => typeof id === 'string' && CONVEX_ID_RE.test(id))
    .filter((id) => id !== exclude)
    .filter((id) => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .slice(0, MAX);
}

// Same storage strategy as auth: SecureStore on native, localStorage on web.
async function readIds(): Promise<string[]> {
  try {
    const raw =
      Platform.OS === 'web'
        ? globalThis.localStorage?.getItem(KEY)
        : await SecureStore.getItemAsync(KEY);
    return cleanIds(raw ? (JSON.parse(raw) as unknown) : []);
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
    readIds().then((list) => {
      const next = cleanIds(list, exclude);
      setIds(next);
      if (next.length !== list.length) writeIds(next);
    });
  }, [exclude]);
  useEffect(() => {
    refresh();
  }, [refresh]);
  useFocusEffect(refresh);
  return ids;
}
