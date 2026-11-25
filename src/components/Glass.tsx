/**
 * Apple-style frosted glass: real backdrop blur, a soft top sheen, and a
 * hairline light edge. On Android the blur needs a target view, provided by
 * BlurTargetContext from App.tsx.
 *
 * variant "light" is the white iOS sheet material of design reference 2.
 * The surface clips its content; put drop shadows on a wrapper view.
 */
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { createContext, useContext, type ComponentRef, type RefObject } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

export const BlurTargetContext = createContext<RefObject<ComponentRef<typeof View> | null> | null>(null);

interface Props {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  radius?: number;
  intensity?: number;
  variant?: 'light' | 'dark';
  /** Extra tint over the blur; defaults per variant. */
  tint?: string;
}

const LOOK = {
  light: {
    blurTint: 'light' as const,
    tint: 'rgba(255,255,255,0.80)',
    sheen: ['rgba(255,255,255,0.55)', 'rgba(255,255,255,0.10)', 'rgba(255,255,255,0)'] as const,
    edge: 'rgba(255,255,255,0.85)',
  },
  dark: {
    blurTint: 'dark' as const,
    tint: 'rgba(16,18,28,0.22)',
    sheen: ['rgba(255,255,255,0.20)', 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)'] as const,
    edge: 'rgba(255,255,255,0.18)',
  },
};

export function Glass({ children, style, radius = 26, intensity = 45, variant = 'dark', tint }: Props) {
  const target = useContext(BlurTargetContext);
  const look = LOOK[variant];
  return (
    <View style={[{ borderRadius: radius, overflow: 'hidden' }, style]}>
      {/* zIndex -1 keeps the material under every child, including bare SVGs on web. */}
      <View style={[StyleSheet.absoluteFill, { zIndex: -1 }]} pointerEvents="none">
        <BlurView
          style={StyleSheet.absoluteFill}
          intensity={intensity}
          tint={look.blurTint}
          blurTarget={target ?? undefined}
          blurMethod="dimezisBlurViewSdk31Plus"
          blurReductionFactor={3}
        />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: tint ?? look.tint }]} />
        <LinearGradient colors={look.sheen} locations={[0, 0.35, 1]} style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { borderRadius: radius, borderWidth: 1, borderColor: look.edge }]} />
      </View>
      {children}
    </View>
  );
}
