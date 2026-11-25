/**
 * Prayer times: full address, the current time, then one card per prayer.
 * Each card shows a realistic sky for that time of day (assets/sky-*.jpg),
 * the prayer name large on the left and start and end times on the right.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { ImageBackground, StyleSheet, Text, View } from 'react-native';

import { PinIcon } from '../components/Icons';
import { formatCountdown, formatDate, formatHijri, formatTime, type DayPlan, type PrayerKey, type PrayerSlot } from '../lib/prayer';
import type { Place } from '../lib/useLocation';
import { FONT, type Theme } from '../theme';

const SKY: Record<PrayerKey, number> = {
  tahajjud: require('../../assets/sky-tahajjud.jpg'),
  fajr: require('../../assets/sky-fajr.jpg'),
  dhuhr: require('../../assets/sky-dhuhr.jpg'),
  asr: require('../../assets/sky-asr.jpg'),
  maghrib: require('../../assets/sky-maghrib.jpg'),
  isha: require('../../assets/sky-isha.jpg'),
};

function TimeText({ d, style }: { d: Date; style?: object }) {
  const { hm, ampm } = formatTime(d);
  return (
    <Text style={[styles.cardTime, style]}>
      {hm}
      <Text style={styles.cardAmpm}> {ampm}</Text>
    </Text>
  );
}

function PrayerCard({ slot, now, isNow }: { slot: PrayerSlot; now: Date; isNow: boolean }) {
  const past = !isNow && now.getTime() >= slot.end.getTime();
  const progress = isNow ? (now.getTime() - slot.start.getTime()) / (slot.end.getTime() - slot.start.getTime()) : 0;
  return (
    <View style={[styles.cardShadow, past && { opacity: 0.72 }]}>
      <ImageBackground source={SKY[slot.key]} resizeMode="cover" style={styles.card} imageStyle={styles.cardImage}>
        {/* Darken the left and right edges so white text reads on any sky. */}
        <LinearGradient
          colors={['rgba(0,0,0,0.30)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.26)']}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.cardRow}>
          <View style={styles.nameCol}>
            <Text style={styles.name}>{slot.name}</Text>
            {isNow && (
              <View style={styles.nowChip}>
                <View style={styles.nowDot} />
                <Text style={styles.nowText}>Now · {formatCountdown(slot.end.getTime() - now.getTime())} left</Text>
              </View>
            )}
          </View>
          <View style={styles.timesCol}>
            <View style={styles.timeLine}>
              <Text style={styles.timeLabel}>STARTS</Text>
              <TimeText d={slot.start} />
            </View>
            <View style={styles.timeLine}>
              <Text style={styles.timeLabel}>ENDS</Text>
              <TimeText d={slot.end} style={{ opacity: 0.85 }} />
            </View>
          </View>
        </View>
        {isNow && (
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.min(100, Math.max(2, progress * 100))}%` }]} />
          </View>
        )}
        {isNow && <View pointerEvents="none" style={styles.nowRing} />}
      </ImageBackground>
    </View>
  );
}

export function TimesScreen({ plan, now, place, theme }: { plan: DayPlan; now: Date; place: Place; theme: Theme }) {
  const h = now.getHours();
  const hh = h % 12 === 0 ? 12 : h % 12;
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const hijri = formatHijri(now);

  return (
    <View style={styles.wrap}>
      <View style={styles.address}>
        <View style={styles.addrTop}>
          <PinIcon size={15} color={theme.text} />
          <Text style={[styles.addr1, { color: theme.text }]} numberOfLines={1}>
            {place.line1}
          </Text>
        </View>
        <Text style={[styles.addr2, { color: theme.sub }]} numberOfLines={2}>
          {place.line2}
        </Text>
      </View>

      <View style={styles.clockBlock}>
        <Text style={[styles.clock, { color: theme.text }]}>
          {hh}:{mm}
          <Text style={[styles.clockSec, { color: theme.sub }]}>:{ss}</Text>
          <Text style={[styles.clockAmpm, { color: theme.sub }]}> {h < 12 ? 'am' : 'pm'}</Text>
        </Text>
        <Text style={[styles.date, { color: theme.sub }]}>
          {formatDate(now)}
          {hijri ? `  ·  ${hijri}` : ''}
        </Text>
      </View>

      <View style={styles.list}>
        {plan.slots.map((s) => (
          <PrayerCard key={s.key} slot={s} now={now} isNow={plan.current === s} />
        ))}
      </View>

      <Text style={[styles.foot, { color: theme.faint }]}>
        {plan.methodName} method · Asr by shadow length · Isha till half night · Tahajjud in the last third of the night
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16 },
  address: { paddingRight: 64 },
  addrTop: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  addr1: { fontFamily: FONT.bold, fontSize: 22, letterSpacing: -0.3, flexShrink: 1 },
  addr2: { fontFamily: FONT.medium, fontSize: 14, marginTop: 4, lineHeight: 19 },

  clockBlock: { marginTop: 22, marginBottom: 18 },
  clock: { fontFamily: FONT.light, fontSize: 64, letterSpacing: -2, fontVariant: ['tabular-nums'] },
  clockSec: { fontSize: 30, letterSpacing: -0.5 },
  clockAmpm: { fontFamily: FONT.medium, fontSize: 20, letterSpacing: 0 },
  date: { fontFamily: FONT.medium, fontSize: 14, marginTop: -2 },

  list: { gap: 12 },
  cardShadow: {
    borderRadius: 24,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  card: { height: 108, borderRadius: 24, overflow: 'hidden', justifyContent: 'center' },
  cardImage: { borderRadius: 24, width: '100%', height: '100%' },
  cardRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 },
  nameCol: { flex: 1 },
  name: {
    color: '#FFFFFF',
    fontFamily: FONT.bold,
    fontSize: 30,
    letterSpacing: -0.6,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowRadius: 10,
  },
  nowChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 6,
    paddingHorizontal: 9,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  nowDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#7CFFB2' },
  nowText: { color: '#FFFFFF', fontFamily: FONT.semibold, fontSize: 12, fontVariant: ['tabular-nums'] },
  timesCol: { gap: 6, alignItems: 'flex-end' },
  timeLine: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  timeLabel: { color: 'rgba(255,255,255,0.72)', fontFamily: FONT.semibold, fontSize: 10, letterSpacing: 1 },
  cardTime: {
    color: '#FFFFFF',
    fontFamily: FONT.semibold,
    fontSize: 19,
    fontVariant: ['tabular-nums'],
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowRadius: 8,
  },
  cardAmpm: { fontFamily: FONT.medium, fontSize: 12 },
  track: { position: 'absolute', left: 20, right: 20, bottom: 10, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.28)' },
  fill: { height: 3, borderRadius: 2, backgroundColor: '#FFFFFF' },
  nowRing: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, borderRadius: 24, borderWidth: 2, borderColor: 'rgba(255,255,255,0.85)' },

  foot: { fontFamily: FONT.regular, fontSize: 12, textAlign: 'center', marginTop: 18, lineHeight: 17, paddingHorizontal: 10 },
});
