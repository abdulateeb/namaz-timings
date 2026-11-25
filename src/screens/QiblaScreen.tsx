import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
import { PanResponder, Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { QiblaCompass } from '../components/QiblaCompass';
import { qiblaBearing } from '../lib/prayer';
import { useHeading } from '../lib/useHeading';
import { useTilt } from '../lib/useTilt';
import { FONT } from '../theme';

const ALIGN_DEG = 3;
const GREEN = '#3BE07F';

export function QiblaScreen({ lat, lon, active }: { lat: number; lon: number; active: boolean }) {
  const { width, height } = useWindowDimensions();
  const qibla = qiblaBearing(lat, lon);
  // Browser preview starts turned away so the Kaaba visibly has to be lined up.
  const heading = useHeading(active, Platform.OS === 'web' ? qibla - 48 : 0);
  const tilt = useTilt(active);

  const diff = ((qibla - heading.degrees + 540) % 360) - 180; // + means turn right
  const aligned = Math.abs(diff) <= ALIGN_DEG;
  const ready = aligned && tilt.flat;

  const wasReady = useRef(false);
  useEffect(() => {
    if (ready && !wasReady.current && Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    wasReady.current = ready;
  }, [ready]);

  // Browser preview: drag sideways anywhere to turn (no compass sensor on a laptop).
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, g) => heading.nudge(-g.dx * 0.24),
    }),
  ).current;

  const size = Math.min(width - 40, height * 0.5, 400);
  // One line of guidance, most important first.
  const guide = !tilt.flat
    ? 'Lay the phone flat'
    : heading.supported && heading.accuracy <= 1
      ? 'Move the phone in a figure 8'
      : aligned
        ? 'You are facing the Qibla'
        : `Turn ${diff > 0 ? 'right' : 'left'} ${Math.abs(Math.round(diff))}°`;

  return (
    <View style={styles.wrap} {...(Platform.OS === 'web' ? pan.panHandlers : {})}>
      <Text style={[styles.guide, ready && { color: GREEN }]}>{guide}</Text>
      <QiblaCompass
        size={size}
        qibla={qibla}
        rotation={heading.rotation}
        aligned={aligned}
        tiltX={tilt.x}
        tiltY={tilt.y}
        flat={tilt.flat}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, gap: 26 },
  // White with a soft shadow: reads on both the night and the morning sky.
  guide: {
    color: '#FFFFFF',
    fontFamily: FONT.bold,
    fontSize: 26,
    letterSpacing: -0.4,
    fontVariant: ['tabular-nums'],
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowRadius: 10,
    textShadowOffset: { width: 0, height: 1 },
  },
});
