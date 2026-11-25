/**
 * Small floating Liquid Glass tab bar: clock (prayer times) and compass (Qibla).
 * The selected tab sits under a glass lens that stretches while it slides and
 * settles with a spring, as on iOS.
 */
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { FONT, type Theme } from '../theme';
import { ClockIcon, CompassIcon } from './Icons';
import { LiquidGlass } from './LiquidGlass';

export type Tab = 'times' | 'qibla';

const SEG_W = 68;
const SEG_H = 48;
const PAD = 4;
const R = (SEG_H + PAD * 2) / 2;

export function GlassTabBar({ tab, onChange, theme, bottom }: { tab: Tab; onChange: (t: Tab) => void; theme: Theme; bottom: number }) {
  const dark = theme.mode === 'dark';
  const x = useSharedValue(tab === 'times' ? 0 : SEG_W);
  const stretch = useSharedValue(1);
  useEffect(() => {
    x.value = withSpring(tab === 'times' ? 0 : SEG_W, { damping: 16, stiffness: 190, mass: 0.7 });
    stretch.value = withSequence(withTiming(1.22, { duration: 120 }), withSpring(1, { damping: 9, stiffness: 180 }));
  }, [tab, x, stretch]);
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }, { scaleX: stretch.value }, { scaleY: 2 - stretch.value * 0.95 - 0.05 }] }));

  const pick = (t: Tab) => {
    if (t === tab) return;
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    onChange(t);
  };

  const fg = dark ? '#FFFFFF' : '#0E1220';
  const item = (t: Tab, label: string) => {
    const on = tab === t;
    const color = on ? fg : dark ? 'rgba(255,255,255,0.6)' : 'rgba(14,18,32,0.5)';
    const Icon = t === 'times' ? ClockIcon : CompassIcon;
    return (
      <Pressable key={t} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={label} onPress={() => pick(t)} style={styles.seg}>
        <Icon size={19} color={color} />
        <Text style={[styles.label, { color }]}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <View pointerEvents="box-none" style={[styles.dock, { bottom }]}>
      <View style={[styles.shadow, { shadowOpacity: dark ? 0.45 : 0.18 }]}>
        <LiquidGlass radius={R} dark={dark} style={styles.bar}>
          <Animated.View style={[styles.thumb, thumb]}>
            <LiquidGlass radius={SEG_H / 2} dark={dark} lens style={StyleSheet.absoluteFill} />
          </Animated.View>
          {item('times', 'Times')}
          {item('qibla', 'Qibla')}
        </LiquidGlass>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  shadow: {
    borderRadius: R,
    shadowColor: '#000',
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  bar: { flexDirection: 'row', padding: PAD },
  seg: { width: SEG_W, height: SEG_H, alignItems: 'center', justifyContent: 'center', gap: 2 },
  label: { fontFamily: FONT.semibold, fontSize: 10, letterSpacing: 0.2 },
  thumb: { position: 'absolute', left: PAD, top: PAD, width: SEG_W, height: SEG_H },
});
