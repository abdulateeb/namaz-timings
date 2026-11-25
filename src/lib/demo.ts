/**
 * Browser-only demo mode for clean README screenshots.
 *
 * Open the web preview with ?demo&t=2026-11-25T18:12&theme=dark&tab=qibla&heading=0
 *   t        fixed local start time (the clock then runs on from it)
 *   theme    dark | light
 *   tab      times | qibla
 *   heading  compass offset from the Qibla in degrees (0 = facing it)
 *
 * Never active in the phone app: on native it always returns null.
 */
import { Platform } from 'react-native';

export interface Demo {
  start?: Date;
  theme?: 'dark' | 'light';
  tab?: 'times' | 'qibla';
  heading?: number;
}

export const DEMO: Demo | null = (() => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const q = new URLSearchParams(window.location.search);
  if (!q.has('demo')) return null;
  const t = q.get('t');
  const theme = q.get('theme');
  const tab = q.get('tab');
  const heading = q.get('heading');
  return {
    start: t ? new Date(t) : undefined,
    theme: theme === 'dark' || theme === 'light' ? theme : undefined,
    tab: tab === 'times' || tab === 'qibla' ? tab : undefined,
    heading: heading !== null ? Number(heading) : undefined,
  };
})();

const offset = DEMO?.start ? DEMO.start.getTime() - Date.now() : 0;

/** Current time, shifted to the demo start time when demo mode is on. */
export function demoNow(): Date {
  return new Date(Date.now() + offset);
}
