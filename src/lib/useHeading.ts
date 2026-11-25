/**
 * Smooth compass heading.
 *
 * Why the old compass felt jumpy:
 *  1. Raw sensor values were drawn directly, so every bit of noise showed.
 *  2. When the reading wrapped from 359° to 0°, the dial spun the long way round.
 *
 * Fix:
 *  - Low-pass filter on the unit vector (cos, sin), not on the angle, so
 *    averaging across north never produces a wrong middle value.
 *  - Unwrap into a continuous angle (…, 358, 361, 365 …) so the dial always
 *    takes the short way.
 *  - Hand the continuous angle to a Reanimated spring on the UI thread, which
 *    fills the gaps between sensor events at the screen's refresh rate.
 */
import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useSharedValue, withSpring, type SharedValue } from 'react-native-reanimated';

const ALPHA = 0.18; // filter strength: lower is smoother but slower
const DEADBAND = 0.25; // degrees; ignore tinier changes so the dial rests still

const SPRING = { damping: 22, stiffness: 140, mass: 0.7 } as const;

export interface Heading {
  /** Continuous heading for animation (not wrapped to 0..360). */
  rotation: SharedValue<number>;
  /** Wrapped heading 0..359 for display. */
  degrees: number;
  /** 0 unreliable … 3 high (expo-location scale). */
  accuracy: number;
  /** Browser preview only: turn the dial by dragging. */
  nudge: (delta: number) => void;
  supported: boolean;
}

export function useHeading(active: boolean, initial = 0): Heading {
  const rotation = useSharedValue(initial);
  const [degrees, setDegrees] = useState(Math.round(initial));
  const [accuracy, setAccuracy] = useState(3);

  const vec = useRef<{ x: number; y: number } | null>(null);
  const cont = useRef(initial);
  const lastShown = useRef(Math.round(initial));

  const push = useCallback(
    (value: number) => {
      cont.current = value;
      rotation.value = withSpring(value, SPRING);
      const wrapped = Math.round(((value % 360) + 360) % 360) % 360;
      if (wrapped !== lastShown.current) {
        lastShown.current = wrapped;
        setDegrees(wrapped);
      }
    },
    [rotation],
  );

  const feed = useCallback(
    (raw: number) => {
      const r = (raw * Math.PI) / 180;
      const v = vec.current;
      if (!v) {
        vec.current = { x: Math.cos(r), y: Math.sin(r) };
      } else {
        v.x += ALPHA * (Math.cos(r) - v.x);
        v.y += ALPHA * (Math.sin(r) - v.y);
      }
      const angle = (Math.atan2(vec.current!.y, vec.current!.x) * 180) / Math.PI;
      const prevWrapped = ((cont.current % 360) + 360) % 360;
      let delta = angle - prevWrapped;
      delta = ((delta + 540) % 360) - 180; // shortest way, -180..180
      if (Math.abs(delta) < DEADBAND) return;
      push(cont.current + delta);
    },
    [push],
  );

  useEffect(() => {
    if (!active || Platform.OS === 'web') return;
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;
    Location.watchHeadingAsync((h) => {
      const value = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
      feed(value);
      setAccuracy((a) => (a === h.accuracy ? a : h.accuracy));
    })
      .then((s) => {
        if (cancelled) s.remove();
        else sub = s;
      })
      .catch(() => setAccuracy(0));
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [active, feed]);

  const nudge = useCallback((delta: number) => push(cont.current + delta), [push]);

  return { rotation, degrees, accuracy, nudge, supported: Platform.OS !== 'web' };
}
