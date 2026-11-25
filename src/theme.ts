import type { DayPlan } from './lib/prayer';

export type Phase = 'night' | 'dawn' | 'day' | 'golden' | 'dusk';

export interface SkyPalette {
  /** Top to bottom background gradient. */
  sky: [string, string, string];
  /** Sun or moon glow colour. */
  glow: string;
  /** Two drifting colour clouds that give the glass something to refract. */
  clouds: [string, string];
  stars: boolean;
  /** Glow position as a fraction of the screen. */
  glowAt: { x: number; y: number };
}

export const PALETTES: Record<Phase, SkyPalette> = {
  night: {
    sky: ['#04060F', '#0A1030', '#171544'],
    glow: '#A9B8FF',
    clouds: ['#3A2B8C', '#0D4B66'],
    stars: true,
    glowAt: { x: 0.78, y: 0.12 },
  },
  dawn: {
    sky: ['#14183A', '#563A72', '#E98C6C'],
    glow: '#FFC9A0',
    clouds: ['#7B4FA3', '#F09A78'],
    stars: true,
    glowAt: { x: 0.3, y: 0.9 },
  },
  day: {
    sky: ['#0B4F96', '#2F7FC8', '#8CC6F0'],
    glow: '#FFF6DC',
    clouds: ['#5BA9EE', '#E8F4FF'],
    stars: false,
    glowAt: { x: 0.72, y: 0.1 },
  },
  golden: {
    sky: ['#173E78', '#8E6A6A', '#F0B871'],
    glow: '#FFD48A',
    clouds: ['#E39348', '#4F72B8'],
    stars: false,
    glowAt: { x: 0.2, y: 0.55 },
  },
  dusk: {
    sky: ['#120B2A', '#6B2748', '#DD6446'],
    glow: '#FF9C6A',
    clouds: ['#A83459', '#40287A'],
    stars: true,
    glowAt: { x: 0.25, y: 0.85 },
  },
};

export function phaseFor(plan: DayPlan | null, now: Date): Phase {
  if (!plan) return 'night';
  const t = now.getTime();
  const [fajr, , asr, maghrib, isha] = plan.slots;
  const min = 60_000;
  if (t < fajr.start.getTime() || t >= isha.start.getTime()) return 'night';
  if (t < plan.sunrise.getTime() + 40 * min) return 'dawn';
  if (t < asr.start.getTime() + 60 * min) return 'day';
  if (t < maghrib.start.getTime() - 25 * min) return 'golden';
  return 'dusk';
}

export const FONT = {
  light: 'Inter_300Light',
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export const TEXT = {
  primary: '#FFFFFF',
  secondary: 'rgba(255,255,255,0.72)',
  tertiary: 'rgba(255,255,255,0.5)',
};

/** Tile gradients for each prayer icon, like iOS settings icons. */
export const PRAYER_TILES = {
  fajr: ['#5B6CF0', '#E97AA8'],
  dhuhr: ['#F5B53A', '#F08A24'],
  asr: ['#F29A4A', '#D9573A'],
  maghrib: ['#E2584A', '#8E2C68'],
  isha: ['#3046A8', '#151E54'],
} as const;

export const QIBLA_GREEN = '#34E39A';
