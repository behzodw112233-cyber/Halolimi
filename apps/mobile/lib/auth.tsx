import type { Doc, Id } from '@halolmia/backend/convex/_generated/dataModel';
import { api } from '@halolmia/backend/convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';
import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { Alert, AppState, Platform } from 'react-native';

const KEY = 'halolmi_auth';
const HEARTBEAT_INTERVAL_MS = Platform.OS === 'web' ? 120_000 : 45_000;

type Stored = { userId?: string; rootUserId?: string; onboarded?: boolean };

// SecureStore is unavailable on web; fall back to localStorage there.
const storage = {
  async get(): Promise<Stored> {
    try {
      const raw =
        Platform.OS === 'web'
          ? globalThis.localStorage?.getItem(KEY)
          : await SecureStore.getItemAsync(KEY);
      return raw ? (JSON.parse(raw) as Stored) : {};
    } catch {
      return {};
    }
  },
  async set(value: Stored) {
    const raw = JSON.stringify(value);
    try {
      if (Platform.OS === 'web') globalThis.localStorage?.setItem(KEY, raw);
      else await SecureStore.setItemAsync(KEY, raw);
    } catch {
      /* ignore */
    }
  },
};

interface AuthValue {
  userId: Id<'users'> | null;
  rootUserId: Id<'users'> | null;
  user: Doc<'users'> | null | undefined;
  loading: boolean;
  onboarded: boolean;
  login: (phone: string, name?: string) => Promise<Id<'users'>>;
  /** Adopt an already-resolved user id (e.g. after Telegram verifies the phone). */
  adoptSession: (id: Id<'users'>) => Promise<void>;
  switchAccount: (id: Id<'users'>) => Promise<void>;
  logout: () => Promise<void>;
  finishOnboarding: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<Id<'users'> | null>(null);
  const [rootUserId, setRootUserId] = useState<Id<'users'> | null>(null);
  const [onboarded, setOnboarded] = useState(false);
  const [loading, setLoading] = useState(true);

  const getOrCreate = useMutation(api.users.getOrCreate);
  const heartbeat = useMutation(api.users.heartbeat);
  const user = useQuery(api.users.get, userId ? { id: userId } : 'skip');
  const verifiedUserId = userId && user ? userId : null;
  const authLoading = loading || (!!userId && user === undefined);

  // Hydrate persisted identity on mount.
  useEffect(() => {
    let active = true;
    storage.get().then((s) => {
      if (!active) return;
      if (s.userId) setUserId(s.userId as Id<'users'>);
      setRootUserId((s.rootUserId ?? s.userId ?? null) as Id<'users'> | null);
      if (s.onboarded) setOnboarded(true);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const login = async (phone: string, name?: string) => {
    const id = await getOrCreate({ phone, name });
    setUserId(id);
    setRootUserId(id);
    setOnboarded(true);
    await storage.set({ userId: id, rootUserId: id, onboarded: true });
    return id;
  };

  const adoptSession = async (id: Id<'users'>) => {
    setUserId(id);
    setRootUserId(rootUserId ?? id);
    setOnboarded(true);
    await storage.set({ userId: id, rootUserId: rootUserId ?? id, onboarded: true });
  };

  const switchAccount = async (id: Id<'users'>) => {
    setUserId(id);
    setOnboarded(true);
    await storage.set({ userId: id, rootUserId: rootUserId ?? userId ?? id, onboarded: true });
  };

  const logout = async () => {
    setUserId(null);
    setRootUserId(null);
    // Keep onboarded so we don't drop back into the language picker.
    await storage.set({ onboarded: true });
  };

  const finishOnboarding = async () => {
    setOnboarded(true);
    await storage.set({ userId: userId ?? undefined, rootUserId: rootUserId ?? userId ?? undefined, onboarded: true });
  };

  // React to server-side account state. `user` is `undefined` while the query is
  // loading and `null` only when the account genuinely no longer exists — so we
  // never wipe a valid session during a refetch.
  useEffect(() => {
    if (!userId) return;
    if (user && user.status === 'blocked') {
      Alert.alert('Hisob bloklangan', 'Hisobingiz administrator tomonidan bloklandi.');
      logout();
    } else if (user === null) {
      // Stored id points to a deleted account — clear it silently (stay onboarded).
      logout();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userId]);

  // Presence heartbeat powers seller "online / last seen" trust signals.
  useEffect(() => {
    if (!verifiedUserId) return;
    const ping = () => {
      if (AppState.currentState === 'active') heartbeat({ id: verifiedUserId }).catch(() => {});
    };
    ping();
    const interval = setInterval(ping, HEARTBEAT_INTERVAL_MS);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') ping();
    });
    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [heartbeat, verifiedUserId]);

  return (
    <AuthContext.Provider
      value={{
        userId: verifiedUserId,
        rootUserId,
        user,
        loading: authLoading,
        onboarded,
        login,
        adoptSession,
        switchAccount,
        logout,
        finishOnboarding,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
