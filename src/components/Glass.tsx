/**
 * Apple-style frosted glass: real backdrop blur, a soft top sheen, and a
 * hairline light edge. On Android the blur needs a target view, provided by
 * BlurTargetContext from App.tsx.
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
  /** Extra tint over the blur, e.g. to highlight a selected surface. */
  tint?: string;
}

export function Glass({ children, style, radius = 26, intensity = 45, tint = 'rgba(16,18,28,0.22)' }: Props) {
  const target = useContext(BlurTargetContext);
  return (
    <View style={[{ borderRadius: radius, overflow: 'hidden' }, style]}>
      <BlurView
        style={StyleSheet.absoluteFill}
        intensity={intensity}
        tint="dark"
        blurTarget={target ?? undefined}
        blurMethod="dimezisBlurViewSdk31Plus"
        blurReductionFactor={3}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: tint }]} />
      <LinearGradient
        colors={['rgba(255,255,255,0.20)', 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
        locations={[0, 0.35, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' }]} />
      {children}
    </View>
  );
}
