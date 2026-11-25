/**
 * Compact Liquid Glass switch for the header: clock (prayer times) and
 * compass (Qibla). Same height as the theme button beside it. The selected
 * icon sits under a glass lens that slides with a spring; the lens is inset
 * and only squashes slightly, so it never spills past the capsule's curve.
 */
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import type { Theme } from '../theme';
import { ClockIcon, CompassIcon } from './Icons';
import { LiquidGlass } from './LiquidGlass';

export type Tab = 'times' | 'qibla';

export const TABS_HEIGHT = 42;
const PAD = 3;
const SEG = TABS_HEIGHT - PAD * 2; // 36: round segments
const SEG_W = SEG + 8; // a little wider than tall, like iOS segmented pills

export function GlassTabBar({ tab, onChange, theme }: { tab: Tab; onChange: (t: Tab) => void; theme: Theme }) {
  const dark = theme.mode === 'dark';
  const x = useSharedValue(tab === 'times' ? 0 : SEG_W);
  const squash = useSharedValue(1);
  useEffect(() => {
    x.value = withSpring(tab === 'times' ? 0 : SEG_W, { damping: 18, stiffness: 220, mass: 0.6 });
    squash.value = withSequence(withTiming(1.06, { duration: 110 }), withSpring(1, { damping: 12, stiffness: 220 }));
  }, [tab, x, squash]);
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }, { scaleX: squash.value }, { scaleY: 2 - squash.value }] }));

  const pick = (t: Tab) => {
    if (t === tab) return;
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    onChange(t);
  };

  const fg = dark ? '#FFFFFF' : '#0E1220';
  const item = (t: Tab, label: string) => {
    const on = tab === t;
    const Icon = t === 'times' ? ClockIcon : CompassIcon;
    return (
      <Pressable key={t} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={label} onPress={() => pick(t)} style={styles.seg} hitSlop={4}>
        <Icon size={19} color={on ? fg : dark ? 'rgba(255,255,255,0.55)' : 'rgba(14,18,32,0.45)'} />
      </Pressable>
    );
  };

  return (
    <View style={[styles.shadow, { shadowOpacity: dark ? 0.4 : 0.16 }]}>
      <LiquidGlass radius={TABS_HEIGHT / 2} dark={dark} style={styles.bar}>
        <Animated.View style={[styles.thumb, thumb]}>
          <LiquidGlass radius={SEG / 2} dark={dark} lens style={StyleSheet.absoluteFill} />
        </Animated.View>
        {item('times', 'Prayer times')}
        {item('qibla', 'Qibla compass')}
      </LiquidGlass>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    borderRadius: TABS_HEIGHT / 2,
    shadowColor: '#000',
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  bar: { flexDirection: 'row', padding: PAD, height: TABS_HEIGHT },
  seg: { width: SEG_W, height: SEG, alignItems: 'center', justifyContent: 'center' },
  thumb: { position: 'absolute', left: PAD, top: PAD, width: SEG_W, height: SEG },
});
