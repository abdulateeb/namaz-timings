import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
import { PanResponder, Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Glass } from '../components/Glass';
import { QiblaCompass } from '../components/QiblaCompass';
import { distanceToKaabaKm, qiblaBearing } from '../lib/prayer';
import { useHeading } from '../lib/useHeading';
import { useTilt } from '../lib/useTilt';
import { FONT, type Theme } from '../theme';

const ALIGN_DEG = 3;
const GREEN = '#1BA556';

function Stat({ label, value, theme }: { label: string; value: string; theme: Theme }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statLabel, { color: theme.faint }]}>{label}</Text>
      <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
    </View>
  );
}

export function QiblaScreen({ lat, lon, active, theme }: { lat: number; lon: number; active: boolean; theme: Theme }) {
  const { width, height } = useWindowDimensions();
  const qibla = qiblaBearing(lat, lon);
  const km = distanceToKaabaKm(lat, lon);
  // Browser preview starts turned away so the Kaaba visibly has to be lined up.
  const heading = useHeading(active, Platform.OS === 'web' ? qibla - 48 : 0);
  const tilt = useTilt(active);

  const diff = ((qibla - heading.degrees + 540) % 360) - 180; // + means turn right
  const aligned = Math.abs(diff) <= ALIGN_DEG;

  const wasAligned = useRef(false);
  useEffect(() => {
    if (aligned && tilt.flat && !wasAligned.current && Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    wasAligned.current = aligned && tilt.flat;
  }, [aligned, tilt.flat]);

  // Browser preview: drag sideways anywhere to turn.
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, g) => heading.nudge(-g.dx * 0.24),
    }),
  ).current;

  const size = Math.min(width - 40, height * 0.46, 380);
  const guide = !tilt.flat
    ? 'Lay the phone flat'
    : aligned
      ? 'You are facing the Qibla'
      : `Turn ${diff > 0 ? 'right' : 'left'} ${Math.abs(Math.round(diff))}°`;
  const sub = !tilt.flat
    ? 'Centre the bubble in the bull’s eye for an accurate reading'
    : heading.supported
      ? heading.accuracy <= 1
        ? 'Compass needs calibration: move the phone in a figure 8'
        : 'Line up the Kaaba with the red arrow'
      : 'Preview: drag sideways to turn';

  return (
    <View style={styles.wrap} {...(Platform.OS === 'web' ? pan.panHandlers : {})}>
      <View style={styles.titleBlock}>
        <Text style={[styles.guide, { color: aligned && tilt.flat ? GREEN : theme.text }]}>{guide}</Text>
        <Text style={[styles.sub, { color: theme.sub }]}>{sub}</Text>
      </View>

      <QiblaCompass
        size={size}
        qibla={qibla}
        rotation={heading.rotation}
        aligned={aligned}
        tiltX={tilt.x}
        tiltY={tilt.y}
        flat={tilt.flat}
      />

      <Glass variant={theme.glass} radius={22} style={styles.stats}>
        <Stat label="Qibla" value={`${Math.round(qibla)}°`} theme={theme} />
        <View style={[styles.div, { backgroundColor: theme.faint }]} />
        <Stat label="Heading" value={`${heading.degrees}°`} theme={theme} />
        <View style={[styles.div, { backgroundColor: theme.faint }]} />
        <Stat label="Makkah" value={`${Math.round(km).toLocaleString('en-IN')} km`} theme={theme} />
      </Glass>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, gap: 22 },
  titleBlock: { alignItems: 'center' },
  guide: { fontFamily: FONT.bold, fontSize: 26, letterSpacing: -0.4, fontVariant: ['tabular-nums'] },
  sub: { fontFamily: FONT.medium, fontSize: 14, marginTop: 6, textAlign: 'center' },
  stats: { flexDirection: 'row', paddingVertical: 14, alignSelf: 'stretch' },
  stat: { flex: 1, alignItems: 'center' },
  statLabel: { fontFamily: FONT.semibold, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' },
  statValue: { fontFamily: FONT.bold, fontSize: 20, marginTop: 3, fontVariant: ['tabular-nums'] },
  div: { width: StyleSheet.hairlineWidth, marginVertical: 4, opacity: 0.6 },
});
