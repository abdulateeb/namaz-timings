import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Platform } from 'react-native';

export interface Place {
  lat: number;
  lon: number;
  /** Area or street, e.g. "Moti Nagar". */
  line1: string;
  /** City, state, PIN and country, e.g. "Hyderabad, Telangana 500018, India". */
  line2: string;
}

export type LocationState =
  | { status: 'loading' }
  | { status: 'denied' }
  | { status: 'error'; message: string }
  | { status: 'ready'; place: Place };

/** Browser preview has no phone GPS; it uses a public landmark (Charminar, Hyderabad). */
const PREVIEW_PLACE: Place = {
  lat: 17.3616,
  lon: 78.4747,
  line1: 'Charminar',
  line2: 'Hyderabad, Telangana 500002, India',
};

function coordText(lat: number, lon: number) {
  return `${Math.abs(lat).toFixed(4)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(4)}°${lon >= 0 ? 'E' : 'W'}`;
}

function uniq(parts: (string | null | undefined)[]) {
  const out: string[] = [];
  for (const p of parts) if (p && !out.includes(p)) out.push(p);
  return out;
}

async function placeFor(lat: number, lon: number): Promise<Place> {
  try {
    const [r] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
    if (r) {
      const street = r.street && !/\+/.test(r.street) ? r.street : null; // skip plus codes
      const area = uniq([street, r.district || r.subregion || r.name]).join(', ');
      const statePin = uniq([r.region, r.postalCode]).join(' ');
      const line2 = uniq([r.city, statePin, r.country]).join(', ');
      if (area || line2) {
        return { lat, lon, line1: area || r.city || coordText(lat, lon), line2: line2 || coordText(lat, lon) };
      }
    }
  } catch {
    // Geocoder unavailable offline; coordinates are shown instead.
  }
  return { lat, lon, line1: 'Current location', line2: coordText(lat, lon) };
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
        setState({ status: 'ready', place: await placeFor(last.coords.latitude, last.coords.longitude) });
      }
      const fresh = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setState({ status: 'ready', place: await placeFor(fresh.coords.latitude, fresh.coords.longitude) });
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
