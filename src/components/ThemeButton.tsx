/** Top-right glass button that flips between light and dark theme. */
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import type { Theme } from '../theme';
import { LiquidGlass } from './LiquidGlass';
import { MoonIcon, SunIcon } from './Icons';

const SIZE = 42;

export function ThemeButton({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  const dark = theme.mode === 'dark';
  const p = useSharedValue(dark ? 1 : 0);
  useEffect(() => {
    p.value = withSpring(dark ? 1 : 0, { damping: 14, stiffness: 160 });
  }, [dark, p]);
  // Sun rotates out as the moon rotates in.
  const sun = useAnimatedStyle(() => ({ opacity: 1 - p.value, transform: [{ rotate: `${-90 * p.value}deg` }, { scale: 1 - 0.4 * p.value }] }));
  const moon = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ rotate: `${90 * (1 - p.value)}deg` }, { scale: 0.6 + 0.4 * p.value }] }));

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: dark }}
      accessibilityLabel="Dark theme"
      onPress={() => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onToggle();
      }}
      hitSlop={8}
      style={styles.shadow}
    >
      <LiquidGlass radius={SIZE / 2} dark={dark} style={styles.btn}>
        <Animated.View style={[styles.icon, sun]}>
          <SunIcon size={22} color={theme.text} />
        </Animated.View>
        <Animated.View style={[styles.icon, moon]}>
          <MoonIcon size={21} color={theme.text} />
        </Animated.View>
      </LiquidGlass>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shadow: {
    borderRadius: SIZE / 2,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  btn: { width: SIZE, height: SIZE },
  icon: { position: 'absolute', left: 0, top: 0, width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
});
