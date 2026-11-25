import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
import { PanResponder, Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { QiblaDevice } from '../components/QiblaDevice';
import { distanceToKaabaKm, qiblaBearing } from '../lib/prayer';
import { useHeading } from '../lib/useHeading';
import { FONT } from '../theme';

const ALIGN_DEG = 3;

export function QiblaScreen({ lat, lon, active }: { lat: number; lon: number; active: boolean }) {
  const { width, height } = useWindowDimensions();
  const qibla = qiblaBearing(lat, lon);
  const km = distanceToKaabaKm(lat, lon);
  // Browser preview starts turned away so the step visibly has to be lined up.
  const heading = useHeading(active, Platform.OS === 'web' ? qibla - 48 : 0);

  const diff = ((qibla - heading.degrees + 540) % 360) - 180; // + means turn right
  const aligned = Math.abs(diff) <= ALIGN_DEG;

  const wasAligned = useRef(false);
  useEffect(() => {
    if (aligned && !wasAligned.current && Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    wasAligned.current = aligned;
  }, [aligned]);

  // Browser preview: drag sideways anywhere to turn.
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, g) => {
        heading.nudge(-g.dx * 0.004 * 60);
      },
    }),
  ).current;

  const size = Math.min(width - 36, height * 0.6, 420);
  const guide = aligned ? 'ALIGNED' : `${diff > 0 ? 'RIGHT' : 'LEFT'} ${Math.abs(Math.round(diff))}°`;
  const calibrate = heading.supported && heading.accuracy <= 1;

  return (
    <View style={styles.wrap} {...(Platform.OS === 'web' ? pan.panHandlers : {})}>
      <QiblaDevice
        size={size}
        qibla={qibla}
        rotation={heading.rotation}
        heading={heading.degrees}
        aligned={aligned}
        guide={guide}
        distanceKm={km}
      />
      <Text style={styles.hint}>
        {calibrate
          ? 'Compass needs calibration: move the phone in a figure 8'
          : heading.supported
            ? 'Hold the phone flat, away from metal'
            : 'Preview: drag sideways to turn'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 40 },
  hint: {
    marginTop: 22,
    color: 'rgba(255,255,255,0.92)',
    fontFamily: FONT.medium,
    fontSize: 13,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowRadius: 6,
  },
});
