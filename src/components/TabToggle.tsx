import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Glass } from './Glass';
import { ClockIcon, CompassIcon } from './Icons';

export type Tab = 'times' | 'qibla';

const SEG = 44;
const PAD = 4;

/** Top-right switch: clock = prayer times, compass = Qibla. */
export function TabToggle({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  const x = useSharedValue(tab === 'times' ? 0 : SEG);
  useEffect(() => {
    x.value = withSpring(tab === 'times' ? 0 : SEG, { damping: 18, stiffness: 220, mass: 0.6 });
  }, [tab, x]);
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  const pick = (t: Tab) => {
    if (t === tab) return;
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    onChange(t);
  };

  return (
    <Glass radius={(SEG + PAD * 2) / 2} style={styles.wrap}>
      <Animated.View style={[styles.thumb, thumb]} />
      <View style={styles.row}>
        <Pressable accessibilityRole="button" accessibilityLabel="Prayer times" onPress={() => pick('times')} style={styles.seg} hitSlop={6}>
          <ClockIcon size={20} color={tab === 'times' ? '#11131A' : 'rgba(255,255,255,0.85)'} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Qibla compass" onPress={() => pick('qibla')} style={styles.seg} hitSlop={6}>
          <CompassIcon size={20} color={tab === 'qibla' ? '#11131A' : 'rgba(255,255,255,0.85)'} />
        </Pressable>
      </View>
    </Glass>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: PAD, height: SEG + PAD * 2 },
  row: { flexDirection: 'row' },
  seg: { width: SEG, height: SEG, alignItems: 'center', justifyContent: 'center' },
  thumb: {
    position: 'absolute',
    left: PAD,
    top: PAD,
    width: SEG,
    height: SEG,
    borderRadius: SEG / 2,
    backgroundColor: 'rgba(255,255,255,0.92)',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
});
