/**
 * Floating liquid-glass tab bar: clock (prayer times) and compass (Qibla).
 * A bright thumb slides between the two with a spring.
 */
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { FONT, type Theme } from '../theme';
import { Glass } from './Glass';
import { ClockIcon, CompassIcon } from './Icons';

export type Tab = 'times' | 'qibla';

const SEG_W = 104;
const SEG_H = 52;
const PAD = 6;

export function GlassTabBar({ tab, onChange, theme, bottom }: { tab: Tab; onChange: (t: Tab) => void; theme: Theme; bottom: number }) {
  const x = useSharedValue(tab === 'times' ? 0 : SEG_W);
  useEffect(() => {
    x.value = withSpring(tab === 'times' ? 0 : SEG_W, { damping: 17, stiffness: 210, mass: 0.7 });
  }, [tab, x]);
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  const pick = (t: Tab) => {
    if (t === tab) return;
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    onChange(t);
  };

  const item = (t: Tab, label: string) => {
    const on = tab === t;
    const color = on ? theme.thumbIcon : theme.icon;
    const Icon = t === 'times' ? ClockIcon : CompassIcon;
    return (
      <Pressable key={t} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={label} onPress={() => pick(t)} style={styles.seg}>
        <Icon size={21} color={color} />
        <Text style={[styles.label, { color }]}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <View pointerEvents="box-none" style={[styles.dock, { bottom }]}>
      <View style={styles.shadow}>
        <Glass variant={theme.glass} radius={(SEG_H + PAD * 2) / 2} intensity={60} style={styles.bar}>
          <Animated.View style={[styles.thumb, { backgroundColor: theme.thumb }, thumb]} />
          {item('times', 'Times')}
          {item('qibla', 'Qibla')}
        </Glass>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  shadow: {
    borderRadius: (SEG_H + PAD * 2) / 2,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  bar: { flexDirection: 'row', padding: PAD },
  seg: { width: SEG_W, height: SEG_H, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  label: { fontFamily: FONT.semibold, fontSize: 15 },
  thumb: {
    position: 'absolute',
    left: PAD,
    top: PAD,
    width: SEG_W,
    height: SEG_H,
    borderRadius: SEG_H / 2,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
});
