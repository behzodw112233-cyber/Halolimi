import * as SecureStore from 'expo-secure-store';
import { useSegments } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

const DISTINCT_ID_KEY = 'halolmi_posthog_distinct_id';
const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

type CaptureProperties = Record<string, unknown>;

async function getStoredValue(key: string) {
  try {
    if (Platform.OS === 'web') return globalThis.localStorage?.getItem(key) ?? null;
    return SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function setStoredValue(key: string, value: string) {
  try {
    if (Platform.OS === 'web') {
      globalThis.localStorage?.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  } catch {
    /* analytics must never break app UX */
  }
}

function hash(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

async function getAnonymousId() {
  const existing = await getStoredValue(DISTINCT_ID_KEY);
  if (existing) return existing;
  const next = `anon_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  await setStoredValue(DISTINCT_ID_KEY, next);
  return next;
}

export function assignExperimentVariant<T extends readonly string[]>(
  experiment: string,
  variants: T,
  distinctId: string
): T[number] {
  const index = hash(`${experiment}:${distinctId}`) % variants.length;
  return variants[index];
}

export async function capture(event: string, properties: CaptureProperties = {}, userId?: string | null) {
  if (!POSTHOG_KEY) return;
  const distinctId = userId ?? (await getAnonymousId());
  fetch(`${POSTHOG_HOST.replace(/\/$/, '')}/capture/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: POSTHOG_KEY,
      event,
      distinct_id: distinctId,
      properties: {
        ...properties,
        platform: Platform.OS,
      },
    }),
  }).catch(() => {});
}

export function useExperiment<T extends readonly string[]>(
  experiment: string,
  variants: T,
  userId?: string | null
) {
  const [anonymousId, setAnonymousId] = useState<string | null>(null);
  const distinctId = userId ?? anonymousId ?? 'anonymous_pending';
  const variant = useMemo(
    () => assignExperimentVariant(experiment, variants, distinctId),
    [distinctId, experiment, variants]
  );

  useEffect(() => {
    if (userId) return;
    getAnonymousId().then(setAnonymousId).catch(() => {});
  }, [userId]);

  useEffect(() => {
    if (!userId && !anonymousId) return;
    capture('experiment_exposure', { experiment, variant }, userId ?? anonymousId);
  }, [anonymousId, experiment, userId, variant]);

  return variant;
}

export function AnalyticsTracker({ userId }: { userId?: string | null }) {
  const segments = useSegments();
  const screen = segments.length ? `/${segments.join('/')}` : '/';

  useEffect(() => {
    capture('screen_view', { screen }, userId);
  }, [screen, userId]);

  return null;
}
