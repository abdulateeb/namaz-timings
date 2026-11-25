import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { Glass } from '../components/Glass';
import { PrayerGlyph } from '../components/Icons';
import { formatCountdown, formatTime, type DayPlan, type PrayerSlot } from '../lib/prayer';
import { FONT, PRAYER_TILES, TEXT } from '../theme';

function Time({ d, dim }: { d: Date; dim?: boolean }) {
  const { hm, ampm } = formatTime(d);
  return (
    <Text style={[styles.time, dim && { color: TEXT.secondary }]}>
      {hm}
      <Text style={styles.ampm}> {ampm}</Text>
    </Text>
  );
}

function Row({ slot, state, last }: { slot: PrayerSlot; state: 'past' | 'now' | 'later'; last: boolean }) {
  return (
    <View style={[styles.row, state === 'now' && styles.rowNow, state === 'past' && { opacity: 0.45 }]}>
      <LinearGradient colors={PRAYER_TILES[slot.key]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.tile}>
        <PrayerGlyph prayer={slot.key} size={19} />
      </LinearGradient>
      <View style={styles.nameCol}>
        <Text style={styles.name}>{slot.name}</Text>
        {state === 'now' && <Text style={styles.nowTag}>Now</Text>}
      </View>
      <View style={styles.timeCol}>
        <Time d={slot.start} />
      </View>
      <View style={styles.timeCol}>
        <Time d={slot.end} dim />
      </View>
      {!last && state !== 'now' && <View style={styles.sep} />}
    </View>
  );
}

export function TimesScreen({ plan, now }: { plan: DayPlan; now: Date }) {
  const t = now.getTime();
  const { current, next } = plan;

  const heroLabel = current ? `${current.name} is on` : 'Next prayer';
  const target = current ? current.end : next.start;
  const caption = current
    ? `left · next ${next.name} at ${formatTime(next.start).hm} ${formatTime(next.start).ampm}`
    : `until ${next.name} at ${formatTime(next.start).hm} ${formatTime(next.start).ampm}`;
  const progress = current ? (t - current.start.getTime()) / (current.end.getTime() - current.start.getTime()) : null;

  return (
    <View style={styles.wrap}>
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>{heroLabel}</Text>
        <Text style={styles.countdown}>{formatCountdown(target.getTime() - t)}</Text>
        <Text style={styles.caption}>{caption}</Text>
        {progress !== null && (
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.min(100, Math.max(2, progress * 100))}%` }]} />
          </View>
        )}
      </View>

      <Glass style={styles.card}>
        <View style={styles.headRow}>
          <Text style={[styles.head, { flex: 1 }]}>Today</Text>
          <Text style={[styles.head, styles.timeCol]}>Starts</Text>
          <Text style={[styles.head, styles.timeCol]}>Ends</Text>
        </View>
        {plan.slots.map((s, i) => {
          const state = current === s ? 'now' : t >= s.end.getTime() ? 'past' : 'later';
          return <Row key={s.key} slot={s} state={state} last={i === plan.slots.length - 1} />;
        })}
      </Glass>

      <Text style={styles.foot}>
        {plan.methodName} method · Asr by shadow length · Isha till half night · Sunrise {formatTime(plan.sunrise).hm}{' '}
        {formatTime(plan.sunrise).ampm}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 16 },
  hero: { alignItems: 'center', paddingTop: 26, paddingBottom: 30 },
  heroLabel: { color: TEXT.secondary, fontFamily: FONT.semibold, fontSize: 15, letterSpacing: 0.2 },
  countdown: {
    color: TEXT.primary,
    fontFamily: FONT.light,
    fontSize: 76,
    letterSpacing: -2,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
    textShadowColor: 'rgba(0,0,0,0.18)',
    textShadowRadius: 12,
  },
  caption: { color: TEXT.secondary, fontFamily: FONT.medium, fontSize: 15 },
  track: { marginTop: 18, width: 180, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.18)', overflow: 'hidden' },
  fill: { height: 5, borderRadius: 3, backgroundColor: '#FFFFFF' },

  card: { paddingHorizontal: 8, paddingTop: 12, paddingBottom: 8 },
  headRow: { flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 6 },
  head: { color: TEXT.tertiary, fontFamily: FONT.semibold, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase' },

  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 64, borderRadius: 18 },
  rowNow: { backgroundColor: 'rgba(255,255,255,0.16)' },
  tile: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  nameCol: { flex: 1 },
  name: { color: TEXT.primary, fontFamily: FONT.semibold, fontSize: 17 },
  nowTag: { color: '#FFFFFF', fontFamily: FONT.medium, fontSize: 12, opacity: 0.75, marginTop: 1 },
  timeCol: { width: 84, alignItems: 'flex-end', textAlign: 'right' },
  time: { color: TEXT.primary, fontFamily: FONT.medium, fontSize: 16, fontVariant: ['tabular-nums'] },
  ampm: { fontSize: 12, color: TEXT.secondary },
  sep: { position: 'absolute', left: 62, right: 12, bottom: 0, height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.16)' },

  foot: { color: TEXT.tertiary, fontFamily: FONT.regular, fontSize: 12, textAlign: 'center', marginTop: 16, lineHeight: 18, paddingHorizontal: 12 },
});
