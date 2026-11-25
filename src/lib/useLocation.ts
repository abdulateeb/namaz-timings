import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Platform } from 'react-native';

export interface Place {
  lat: number;
  lon: number;
  label: string;
}

export type LocationState =
  | { status: 'loading' }
  | { status: 'denied' }
  | { status: 'error'; message: string }
  | { status: 'ready'; place: Place };

/** Browser preview has no phone GPS; it uses a fixed point in Hyderabad. */
const PREVIEW_PLACE: Place = { lat: 17.454, lon: 78.4227, label: 'Moti Nagar, Hyderabad' };

async function labelFor(lat: number, lon: number): Promise<string> {
  try {
    const [r] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
    if (r) {
      const local = r.district || r.subregion || r.name;
      const city = r.city || r.region;
      const parts = [local, city].filter((p, i, a) => p && a.indexOf(p) === i);
      if (parts.length) return parts.join(', ');
    }
  } catch {
    // Geocoder unavailable offline; coordinates are shown instead.
  }
  return `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'W'}`;
}

export function useDeviceLocation() {
  const [state, setState] = useState<LocationState>(
    Platform.OS === 'web' ? { status: 'ready', place: PREVIEW_PLACE } : { status: 'loading' },
  );

  const load = useCallback(async () => {
    if (Platform.OS === 'web') return;
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        setState({ status: 'denied' });
        return;
      }
      // Last known fix first so the screen fills instantly, then refine.
      const last = await Location.getLastKnownPositionAsync();
      if (last) {
        const { latitude, longitude } = last.coords;
        setState({ status: 'ready', place: { lat: latitude, lon: longitude, label: await labelFor(latitude, longitude) } });
      }
      const fresh = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = fresh.coords;
      setState({ status: 'ready', place: { lat: latitude, lon: longitude, label: await labelFor(latitude, longitude) } });
    } catch (e) {
      setState((s) => (s.status === 'ready' ? s : { status: 'error', message: e instanceof Error ? e.message : 'Location failed' }));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openSettings = useCallback(() => Linking.openSettings(), []);

  return { state, retry: load, openSettings };
}
