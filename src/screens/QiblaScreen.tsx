import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
import { Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Glass } from '../components/Glass';
import { QiblaDial } from '../components/QiblaDial';
import { distanceToKaabaKm, qiblaBearing } from '../lib/prayer';
import { useHeading } from '../lib/useHeading';
import { FONT, QIBLA_GREEN, TEXT } from '../theme';

const ALIGN_DEG = 3;

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>
        {value}
        {unit ? <Text style={styles.statUnit}>{unit}</Text> : null}
      </Text>
    </View>
  );
}

export function QiblaScreen({ lat, lon, active }: { lat: number; lon: number; active: boolean }) {
  const { width, height } = useWindowDimensions();
  const qibla = qiblaBearing(lat, lon);
  const km = distanceToKaabaKm(lat, lon);
  // Browser preview starts turned away so the needle visibly has to be lined up.
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

  const size = Math.min(width - 48, height * 0.42, 360);
  const guide = aligned
    ? 'You are facing the Qibla'
    : `Turn ${diff > 0 ? 'right' : 'left'} ${Math.abs(Math.round(diff))}°`;

  return (
    <View style={styles.wrap}>
      <View style={styles.titleBlock}>
        <Text style={[styles.guide, aligned && { color: QIBLA_GREEN }]}>{guide}</Text>
        <Text style={styles.sub}>
          {heading.supported ? 'Hold the phone flat, away from metal' : 'Preview: drag the dial to turn'}
        </Text>
      </View>

      <View style={styles.dialWrap}>
        <QiblaDial
          size={size}
          qibla={qibla}
          rotation={heading.rotation}
          aligned={aligned}
          onDrag={heading.supported ? undefined : heading.nudge}
        />
      </View>

      {heading.supported && heading.accuracy <= 1 && (
        <Glass radius={16} style={styles.calib}>
          <Text style={styles.calibText}>Compass needs calibration. Move the phone in a figure 8.</Text>
        </Glass>
      )}

      <Glass style={styles.stats}>
        <Stat label="Qibla" value={`${Math.round(qibla)}`} unit="°" />
        <View style={styles.div} />
        <Stat label="Heading" value={`${heading.degrees}`} unit="°" />
        <View style={styles.div} />
        <Stat label="Makkah" value={km >= 1000 ? `${(km / 1000).toFixed(1)}k` : `${Math.round(km)}`} unit=" km" />
      </Glass>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 16 },
  titleBlock: { alignItems: 'center', paddingTop: 26 },
  guide: { color: TEXT.primary, fontFamily: FONT.semibold, fontSize: 28, letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  sub: { color: TEXT.secondary, fontFamily: FONT.medium, fontSize: 14, marginTop: 6 },
  dialWrap: { alignItems: 'center', marginTop: 22, marginBottom: 18 },
  calib: { paddingVertical: 10, paddingHorizontal: 14, marginBottom: 12 },
  calibText: { color: '#FFD9A0', fontFamily: FONT.medium, fontSize: 13, textAlign: 'center' },
  stats: { flexDirection: 'row', paddingVertical: 16 },
  stat: { flex: 1, alignItems: 'center' },
  statLabel: { color: TEXT.tertiary, fontFamily: FONT.semibold, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase' },
  statValue: { color: TEXT.primary, fontFamily: FONT.semibold, fontSize: 26, marginTop: 4, fontVariant: ['tabular-nums'] },
  statUnit: { fontFamily: FONT.medium, fontSize: 15, color: TEXT.secondary },
  div: { width: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.18)', marginVertical: 4 },
});
