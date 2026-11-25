/**
 * Spirit-level tilt from the accelerometer, for the bull's eye.
 *
 * Returns a smoothed offset (-1..1 on each axis) toward the HIGHER side of the
 * phone, which is where a real bubble floats, plus whether the phone is flat.
 * A compass reading is only trustworthy with the phone flat, so the Qibla
 * screen asks the user to centre the bubble first.
 */
import { Accelerometer } from 'expo-sensors';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useSharedValue, withSpring, type SharedValue } from 'react-native-reanimated';

const FLAT_G = 0.05; // about 3 degrees of tilt
const ALPHA = 0.25;
const SPRING = { damping: 16, stiffness: 160, mass: 0.6 } as const;

export interface Tilt {
  x: SharedValue<number>;
  y: SharedValue<number>;
  flat: boolean;
  supported: boolean;
}

export function useTilt(active: boolean): Tilt {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const [flat, setFlat] = useState(true);
  const [supported, setSupported] = useState(Platform.OS !== 'web');
  const f = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!active || Platform.OS === 'web') return;
    let sub: { remove: () => void } | null = null;
    let cancelled = false;
    Accelerometer.isAvailableAsync()
      .then((ok) => {
        if (cancelled) return;
        if (!ok) {
          setSupported(false);
          return;
        }
        Accelerometer.setUpdateInterval(33);
        sub = Accelerometer.addListener((a) => {
          // Android reports +x when the right edge is raised and +y when the top
          // edge is raised; iOS reports the opposite sign.
          const s = Platform.OS === 'ios' ? -1 : 1;
          f.current.x += ALPHA * (s * a.x - f.current.x);
          f.current.y += ALPHA * (s * a.y - f.current.y);
          // Bubble floats to the high side: right is +x on screen, top is -y.
          x.value = withSpring(Math.max(-1, Math.min(1, f.current.x * 4)), SPRING);
          y.value = withSpring(Math.max(-1, Math.min(1, -f.current.y * 4)), SPRING);
          const isFlat = Math.hypot(f.current.x, f.current.y) < FLAT_G;
          setFlat((prev) => (prev === isFlat ? prev : isFlat));
        });
      })
      .catch(() => setSupported(false));
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [active, x, y]);

  return { x, y, flat, supported };
}
