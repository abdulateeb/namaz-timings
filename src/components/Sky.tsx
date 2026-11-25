import { LinearGradient } from 'expo-linear-gradient';
import { memo, useEffect, useMemo } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { PALETTES, type Phase } from '../theme';

function Blob({ color, size, id }: { color: string; size: number; id: string }) {
  return (
    <Svg width={size} height={size}>
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={color} stopOpacity={0.85} />
          <Stop offset="0.45" stopColor={color} stopOpacity={0.35} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id})`} />
    </Svg>
  );
}

/** Slow looping drift; gives the frosted glass a living background. */
function Drift({ children, dx, dy, period, style }: { children: React.ReactNode; dx: number; dy: number; period: number; style: object }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: period, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [period, t]);
  const anim = useAnimatedStyle(() => ({
    transform: [{ translateX: dx * t.value }, { translateY: dy * t.value }, { scale: 1 + 0.08 * t.value }],
  }));
  return <Animated.View style={[styles.pos, style, anim]}>{children}</Animated.View>;
}

function Stars({ width, height }: { width: number; height: number }) {
  const stars = useMemo(() => {
    // Fixed pseudo-random field so stars do not reshuffle on re-render.
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    return Array.from({ length: 70 }, () => ({
      x: rnd() * width,
      y: rnd() * height * 0.7,
      r: 0.4 + rnd() * 1.1,
      o: 0.25 + rnd() * 0.6,
    }));
  }, [width, height]);
  return (
    <Svg width={width} height={height} style={styles.abs}>
      {stars.map((s, i) => (
        <Circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#FFFFFF" opacity={s.o} />
      ))}
    </Svg>
  );
}

function SkyInner({ phase }: { phase: Phase }) {
  const { width, height } = useWindowDimensions();
  const p = PALETTES[phase];
  const glow = Math.max(width, height) * 0.9;
  const cloud = Math.max(width, height) * 0.85;

  return (
    <View style={[styles.abs, styles.clip]}>
      <LinearGradient colors={p.sky} locations={[0, 0.55, 1]} style={styles.abs} />
      {p.stars && <Stars width={width} height={height} />}
      <View style={[styles.pos, { left: p.glowAt.x * width - glow / 2, top: p.glowAt.y * height - glow / 2, width: glow, height: glow }]}>
        <Blob color={p.glow} size={glow} id="glow" />
      </View>
      <Drift dx={40} dy={60} period={14000} style={{ left: -cloud * 0.35, top: height * 0.32, width: cloud, height: cloud }}>
        <Blob color={p.clouds[0]} size={cloud} id="c0" />
      </Drift>
      <Drift dx={-50} dy={-40} period={18000} style={{ left: width - cloud * 0.6, top: height * 0.6, width: cloud, height: cloud }}>
        <Blob color={p.clouds[1]} size={cloud} id="c1" />
      </Drift>
    </View>
  );
}

export const Sky = memo(SkyInner);

const styles = StyleSheet.create({
  abs: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 },
  pos: { position: 'absolute' },
  // 'clip' (web) also blocks programmatic scrolling, which 'hidden' allows.
  clip: { overflow: Platform.OS === 'web' ? ('clip' as 'hidden') : 'hidden' },
});
