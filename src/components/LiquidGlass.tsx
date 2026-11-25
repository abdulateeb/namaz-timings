/**
 * Apple-style Liquid Glass for small floating controls.
 *
 * Layers, back to front:
 *  1. Strong backdrop blur with almost no tint, so colour shows through.
 *  2. Inner top glow (light entering the curved top of the glass).
 *  3. Bottom caustic: a faint bright band where light exits the lower edge.
 *  4. Specular rim: an SVG ring whose stroke is bright at the top left and
 *     fades toward the bottom right, plus a softer inner ring for thickness.
 */
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useContext, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient as SvgLinear, Rect, Stop } from 'react-native-svg';

import { BlurTargetContext } from './Glass';

interface Props {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  radius: number;
  dark: boolean;
  /** Lens mode: lighter, used for the selected thumb inside a bar. */
  lens?: boolean;
}

function Rim({ w, h, r, dark, lens }: { w: number; h: number; r: number; dark: boolean; lens: boolean }) {
  if (!w || !h) return null;
  const top = dark ? 0.55 : 0.95;
  const bottom = dark ? 0.08 : 0.25;
  const id = lens ? 'rimL' : 'rimB';
  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <SvgLinear id={id} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={top} />
          <Stop offset="0.45" stopColor="#FFFFFF" stopOpacity={bottom} />
          <Stop offset="0.8" stopColor="#FFFFFF" stopOpacity={bottom * 0.6} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={top * 0.55} />
        </SvgLinear>
      </Defs>
      <Rect x={0.6} y={0.6} width={w - 1.2} height={h - 1.2} rx={r - 0.6} fill="none" stroke={`url(#${id})`} strokeWidth={1.2} />
      <Rect x={2} y={2} width={w - 4} height={h - 4} rx={Math.max(0, r - 2)} fill="none" stroke="#FFFFFF" strokeOpacity={dark ? 0.06 : 0.18} strokeWidth={1} />
    </Svg>
  );
}

export function LiquidGlass({ children, style, radius, dark, lens = false }: Props) {
  const target = useContext(BlurTargetContext);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width !== size.w || height !== size.h) setSize({ w: width, h: height });
  };

  const tint = lens ? (dark ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.55)') : dark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.18)';

  // Every layer carries the same rounded clip: on Android a rectangular child
  // (the blur especially) can otherwise paint past the parent's curve.
  const round = { borderRadius: radius, overflow: 'hidden' as const };

  return (
    <View onLayout={onLayout} style={[round, style]}>
      <View style={[StyleSheet.absoluteFill, round, { zIndex: -1 }]} pointerEvents="none">
        {!lens && (
          <BlurView
            style={[StyleSheet.absoluteFill, round]}
            intensity={dark ? 32 : 40}
            tint="default"
            blurTarget={target ?? undefined}
            blurMethod="dimezisBlurViewSdk31Plus"
            blurReductionFactor={2.5}
          />
        )}
        <View style={[StyleSheet.absoluteFill, round, { backgroundColor: tint }]} />
        {/* Inner top glow. */}
        <LinearGradient
          colors={[dark ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.65)', 'rgba(255,255,255,0)']}
          locations={[0, 0.55]}
          style={[StyleSheet.absoluteFill, round]}
        />
        {/* Bottom caustic. */}
        <LinearGradient
          colors={['rgba(255,255,255,0)', dark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.35)']}
          locations={[0.7, 1]}
          style={[StyleSheet.absoluteFill, round]}
        />
        <Rim w={size.w} h={size.h} r={radius} dark={dark} lens={lens} />
      </View>
      {children}
    </View>
  );
}
