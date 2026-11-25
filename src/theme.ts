export type Mode = 'light' | 'dark';

export interface Theme {
  mode: Mode;
  bg: string;
  text: string;
  sub: string;
  faint: string;
  glass: 'light' | 'dark';
  /** Selected segment in the glass tab bar. */
  thumb: string;
  thumbIcon: string;
  icon: string;
  statusBar: 'light' | 'dark';
}

export const THEMES: Record<Mode, Theme> = {
  light: {
    mode: 'light',
    bg: '#EEF2F8',
    text: '#0E1220',
    sub: 'rgba(14,18,32,0.62)',
    faint: 'rgba(14,18,32,0.42)',
    glass: 'light',
    thumb: '#FFFFFF',
    thumbIcon: '#0E1220',
    icon: 'rgba(14,18,32,0.55)',
    statusBar: 'dark',
  },
  dark: {
    mode: 'dark',
    bg: '#05070D',
    text: '#FFFFFF',
    sub: 'rgba(255,255,255,0.66)',
    faint: 'rgba(255,255,255,0.42)',
    glass: 'dark',
    thumb: 'rgba(255,255,255,0.92)',
    thumbIcon: '#0B0D14',
    icon: 'rgba(255,255,255,0.7)',
    statusBar: 'light',
  },
};

export const FONT = {
  light: 'Inter_300Light',
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;
