import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { nearestRegion } from '../constants/regions';

export type Coords = { lat: number; lng: number };

type ExpoLocationModule = typeof import('expo-location');

let ExpoLocation: ExpoLocationModule | null = null;
try {
  // Some installed dev clients were built before expo-location was added. Keep
  // the app bootable and let location features gracefully no-op until rebuild.
  ExpoLocation = require('expo-location') as ExpoLocationModule;
} catch {
  ExpoLocation = null;
}

type LocationState = {
  /** Cached buyer coordinates, or null until they grant GPS once. */
  coords: Coords | null;
  /** Human-readable place label (e.g. "Samarqand") for the UI. */
  label: string | null;
  loading: boolean;
  denied: boolean;
  /** Ask for permission + a fresh fix. Returns coords or null if denied. */
  request: () => Promise<Coords | null>;
};

const Ctx = createContext<LocationState | null>(null);
const KEY = 'my_location_v1';

export function LocationProvider({ children }: { children: ReactNode }) {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [label, setLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [denied, setDenied] = useState(false);

  // Rehydrate the last known location so "nearby" works instantly on next open.
  useEffect(() => {
    SecureStore.getItemAsync(KEY)
      .then((raw) => {
        if (!raw) return;
        try {
          const v = JSON.parse(raw) as { coords: Coords; label?: string };
          if (v?.coords) {
            setCoords(v.coords);
            setLabel(v.label ?? null);
          }
        } catch {
          /* ignore corrupt cache */
        }
      })
      .catch(() => {});
  }, []);

  const request = useCallback(async () => {
    if (!ExpoLocation) {
      setDenied(true);
      return null;
    }
    setLoading(true);
    try {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setDenied(true);
        return null;
      }
      setDenied(false);
      const pos = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.Balanced,
      });
      const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      let lbl: string | null = null;
      try {
        const geo = await ExpoLocation.reverseGeocodeAsync({
          latitude: c.lat,
          longitude: c.lng,
        });
        lbl = geo[0]?.city || geo[0]?.subregion || geo[0]?.region || nearestRegion(c).name;
      } catch {
        lbl = nearestRegion(c).name;
      }
      setCoords(c);
      setLabel(lbl);
      SecureStore.setItemAsync(KEY, JSON.stringify({ coords: c, label: lbl })).catch(
        () => {}
      );
      return c;
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <Ctx.Provider value={{ coords, label, loading, denied, request }}>
      {children}
    </Ctx.Provider>
  );
}

export function useMyLocation() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useMyLocation must be used inside LocationProvider');
  return ctx;
}
