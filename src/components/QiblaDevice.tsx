/**
 * Qibla compass styled on design reference 1: a green hardware unit with a
 * phosphor LCD, three dark slots, two small round buttons and a big knob.
 *
 *  - LCD: a heading tape that scrolls with the phone. The raised step marks the
 *    Qibla; line it up with the centre marker.
 *  - Knob: its pointer always aims at the Qibla, relative to the top of the phone.
 *  - Slots and buttons: Qibla bearing, guidance, heading, distance.
 *
 * Proportions are measured from the reference (device box = 1.0).
 */
import { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Pattern, RadialGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';

const C = {
  body: '#225B34',
  bodyTop: '#2A6B3F',
  bodyBottom: '#1B4A2B',
  lcd: '#083D0F',
  lcdEdge: '#04240A',
  phosphor: '#4BB668',
  phosphorDim: 'rgba(75,182,104,0.28)',
  lcdText: '#92AA8D',
  slot: '#071E07',
  label: '#7FAF8C',
  value: '#8CF0A8',
  pointer: '#D8F59A',
  aligned: '#6CFF9A',
};
const DOT = 'Doto_700Bold';
const SANS = 'Inter_600SemiBold';

interface Props {
  size: number;
  qibla: number;
  rotation: SharedValue<number>;
  heading: number;
  aligned: boolean;
  guide: string;
  distanceKm: number;
}

/** Scrolling heading tape inside the LCD. Drawn once; moved on the UI thread. */
const Tape = memo(function Tape({ ppd, height, qibla, aligned }: { ppd: number; height: number; qibla: number; aligned: boolean }) {
  const span = 1080; // -360..720 so wrapping is invisible
  const width = span * ppd;
  const x = (deg: number) => (deg + 360) * ppd;
  const base = height * 0.74;
  const peak = height * 0.2;
  const half = 14; // degrees either side of the Qibla for the raised step

  const items = useMemo(() => {
    const out: { deg: number; label: string | null }[] = [];
    for (let d = -360; d <= 720; d += 15) {
      const w = ((d % 360) + 360) % 360;
      const label = d % 30 === 0 ? ({ 0: 'N', 90: 'E', 180: 'S', 270: 'W' } as Record<number, string>)[w] ?? String(w) : null;
      out.push({ deg: d, label });
    }
    return out;
  }, []);

  const steps = [qibla - 360, qibla, qibla + 360];
  // Step trace: flat baseline with raised plateaus at each Qibla copy.
  let path = `M 0 ${base}`;
  for (const q of steps) {
    path += ` L ${x(q - half)} ${base} L ${x(q - half)} ${peak} L ${x(q + half)} ${peak} L ${x(q + half)} ${base}`;
  }
  path += ` L ${width} ${base}`;
  const line = aligned ? C.aligned : C.phosphor;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <Pattern id="hatch" patternUnits="userSpaceOnUse" width={3} height={3}>
          <Rect x={0} y={0} width={1.4} height={3} fill={line} opacity={0.55} />
        </Pattern>
      </Defs>
      {[0.2, 0.47, 0.74].map((f) => (
        <Line key={f} x1={0} y1={height * f} x2={width} y2={height * f} stroke={C.phosphorDim} strokeWidth={1} strokeDasharray="1 3" />
      ))}
      {items.map(({ deg, label }) => (
        <G key={deg}>
          <Line x1={x(deg)} y1={height * 0.08} x2={x(deg)} y2={height * 0.8} stroke={C.phosphorDim} strokeWidth={1} strokeDasharray="1 3" />
          {label && (
            <SvgText x={x(deg)} y={height * 0.97} fill={label.length === 1 ? C.value : C.lcdText} fontSize={height * 0.13} fontFamily={DOT} textAnchor="middle">
              {label}
            </SvgText>
          )}
        </G>
      ))}
      {steps.map((q) => (
        <Rect key={q} x={x(q - half)} y={peak} width={half * 2 * ppd} height={base - peak} fill="url(#hatch)" />
      ))}
      <Path d={path} stroke={line} strokeWidth={2} fill="none" strokeLinejoin="miter" />
    </Svg>
  );
});

/** Static hardware: body, LCD frame, slots, button wells and knob dots. */
const Body = memo(function Body({ s }: { s: number }) {
  const r = s * 0.14;
  const lcd = { x: s * 0.07, y: s * 0.045, w: s * 0.86, h: s * 0.3, r: s * 0.035 };
  const slotY = s * 0.405;
  const slotH = s * 0.038;
  const slots = [
    [0.07, 0.335],
    [0.355, 0.645],
    [0.665, 0.93],
  ];
  const knob = { x: s * 0.5, y: s * 0.7 };
  const dots = [];
  for (let a = -135; a <= 135; a += 15) {
    const rad = ((a - 90) * Math.PI) / 180;
    const rr = s * 0.205;
    dots.push(<Circle key={a} cx={knob.x + rr * Math.cos(rad)} cy={knob.y + rr * Math.sin(rad)} r={s * 0.0055} fill={C.label} opacity={a === 0 ? 1 : 0.6} />);
  }
  const btn = (cx: number) => (
    <G key={cx}>
      <Circle cx={cx} cy={s * 0.667 + 2} r={s * 0.052} fill="rgba(0,0,0,0.35)" />
      <Circle cx={cx} cy={s * 0.667} r={s * 0.052} fill="url(#btn)" />
      <Circle cx={cx} cy={s * 0.667} r={s * 0.05} stroke="url(#rim)" strokeWidth={1.2} fill="none" />
    </G>
  );

  return (
    <Svg width={s} height={s} style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id="body" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={C.bodyTop} />
          <Stop offset="0.5" stopColor={C.body} />
          <Stop offset="1" stopColor={C.bodyBottom} />
        </LinearGradient>
        <LinearGradient id="edge" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.28} />
          <Stop offset="0.12" stopColor="#FFFFFF" stopOpacity={0.04} />
          <Stop offset="1" stopColor="#000000" stopOpacity={0.25} />
        </LinearGradient>
        <LinearGradient id="lcdGlass" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.07} />
          <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity={0} />
        </LinearGradient>
        <RadialGradient id="btn" cx="40%" cy="30%" r="80%">
          <Stop offset="0" stopColor="#327A49" />
          <Stop offset="1" stopColor="#173F24" />
        </RadialGradient>
        <LinearGradient id="rim" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.35} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </LinearGradient>
      </Defs>

      <Rect x={0} y={0} width={s} height={s} rx={r} fill="url(#body)" />
      <Rect x={0.75} y={0.75} width={s - 1.5} height={s - 1.5} rx={r} fill="none" stroke="url(#edge)" strokeWidth={1.5} />

      {/* LCD bezel and screen. */}
      <Rect x={lcd.x - 3} y={lcd.y - 3} width={lcd.w + 6} height={lcd.h + 6} rx={lcd.r + 3} fill="#15402A" />
      <Rect x={lcd.x - 3} y={lcd.y - 3} width={lcd.w + 6} height={lcd.h + 6} rx={lcd.r + 3} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth={1} />
      <Rect x={lcd.x} y={lcd.y} width={lcd.w} height={lcd.h} rx={lcd.r} fill={C.lcd} stroke={C.lcdEdge} strokeWidth={1.5} />

      {/* Three recessed slots. */}
      {slots.map(([a, b]) => (
        <G key={a}>
          <Rect x={s * a} y={slotY} width={s * (b - a)} height={slotH} rx={slotH / 2} fill={C.slot} />
          <Rect x={s * a} y={slotY + slotH - 1} width={s * (b - a)} height={1} fill="rgba(255,255,255,0.12)" />
        </G>
      ))}

      {btn(s * 0.14)}
      {btn(s * 0.86)}
      {dots}

      {/* Knob shadow well. */}
      <Circle cx={knob.x} cy={knob.y + s * 0.012} r={s * 0.16} fill="rgba(0,0,0,0.35)" />

      <Rect x={lcd.x} y={lcd.y} width={lcd.w} height={lcd.h} rx={lcd.r} fill="url(#lcdGlass)" />
    </Svg>
  );
});

const Knob = memo(function Knob({ s, aligned }: { s: number; aligned: boolean }) {
  const d = s * 0.31;
  const c = d / 2;
  return (
    <Svg width={d} height={d}>
      <Defs>
        <RadialGradient id="knob" cx="38%" cy="28%" r="80%">
          <Stop offset="0" stopColor="#3A7D4E" />
          <Stop offset="0.5" stopColor="#1F4F2E" />
          <Stop offset="1" stopColor="#0F2D19" />
        </RadialGradient>
        <LinearGradient id="krim" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.4} />
          <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity={0.02} />
          <Stop offset="1" stopColor="#000000" stopOpacity={0.3} />
        </LinearGradient>
      </Defs>
      <Circle cx={c} cy={c} r={c - 1} fill="url(#knob)" />
      <Circle cx={c} cy={c} r={c - 1.5} stroke="url(#krim)" strokeWidth={1.6} fill="none" />
      {/* Pointer: from near the centre toward the rim, at 12 o'clock before rotation. */}
      <Line x1={c} y1={c - d * 0.14} x2={c} y2={c - d * 0.4} stroke={aligned ? C.aligned : C.pointer} strokeWidth={Math.max(2.5, d * 0.035)} strokeLinecap="round" />
    </Svg>
  );
});

export function QiblaDevice({ size: s, qibla, rotation, heading, aligned, guide, distanceKm }: Props) {
  const lcd = { x: s * 0.07, y: s * 0.045, w: s * 0.86, h: s * 0.3 };
  const axisW = lcd.w * 0.09;
  const plot = { x: lcd.x + axisW, y: lcd.y + lcd.h * 0.06, w: lcd.w - axisW - lcd.w * 0.03, h: lcd.h * 0.88 };
  const ppd = plot.w / 100; // 100 degrees visible across the LCD

  const tapeStyle = useAnimatedStyle(() => {
    const h = ((rotation.value % 360) + 360) % 360;
    return { transform: [{ translateX: plot.w / 2 - (h + 360) * ppd }] };
  });
  const knobStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${qibla - rotation.value}deg` }] }));

  const fs = Math.max(8, s * 0.03); // tiny hardware label size
  const valueFs = Math.max(10, s * 0.038);
  const km = distanceKm >= 1000 ? `${(distanceKm / 1000).toFixed(1)}K KM` : `${Math.round(distanceKm)} KM`;

  return (
    <View style={[styles.shadow, { width: s, height: s, borderRadius: s * 0.14 }]}>
      <Body s={s} />

      {/* LCD axis labels, styled like the reference's -6 / 0 / -6. */}
      {['+', '0', '-'].map((t, i) => (
        <Text key={t} style={[styles.lcdAxis, { left: lcd.x, width: axisW, top: lcd.y + lcd.h * (0.12 + i * 0.27), fontSize: lcd.h * 0.12 }]}>
          {t}
        </Text>
      ))}

      <View style={[styles.clip, { left: plot.x, top: plot.y, width: plot.w, height: plot.h }]}>
        <Animated.View style={[styles.tape, tapeStyle]}>
          <Tape ppd={ppd} height={plot.h} qibla={qibla} aligned={aligned} />
        </Animated.View>
        {/* Fixed centre marker = where the phone points. */}
        <View style={[styles.marker, { left: plot.w / 2 - 1, height: plot.h * 0.82, backgroundColor: aligned ? C.aligned : C.pointer }]} />
      </View>

      {/* Slot readouts. */}
      {[
        { a: 0.07, b: 0.335, t: `QIBLA ${Math.round(qibla)}°` },
        { a: 0.355, b: 0.645, t: guide },
        { a: 0.665, b: 0.93, t: `HDG ${heading}°` },
      ].map(({ a, b, t }) => (
        <Text
          key={a}
          numberOfLines={1}
          style={[styles.slotText, { left: s * a, width: s * (b - a), top: s * 0.405, height: s * 0.038, lineHeight: s * 0.038, fontSize: s * 0.026, color: aligned && a === 0.355 ? C.aligned : C.value }]}
        >
          {t}
        </Text>
      ))}

      {/* Side buttons with labels above and values below, like DRIVE / ON and OUTPUT / AUTO. */}
      {[
        { cx: 0.14, top: 'HEADING', bottom: `${heading}°` },
        { cx: 0.86, top: 'MAKKAH', bottom: km },
      ].map(({ cx, top, bottom }) => (
        <View key={cx} style={[styles.btnCol, { left: s * cx - s * 0.12, width: s * 0.24, top: s * 0.555 }]}>
          <Text style={[styles.label, { fontSize: fs }]}>{top}</Text>
          <View style={{ height: s * 0.165 }} />
          <Text style={[styles.value, { fontSize: valueFs }]}>{bottom}</Text>
        </View>
      ))}

      {/* Knob, rotating so its pointer aims at the Qibla. */}
      <Animated.View style={[styles.knob, { left: s * 0.5 - s * 0.155, top: s * 0.7 - s * 0.155, width: s * 0.31, height: s * 0.31 }, knobStyle]}>
        <Knob s={s} aligned={aligned} />
      </Animated.View>

      <Text style={[styles.label, styles.knobLabel, { top: s * 0.895, fontSize: fs, color: aligned ? C.aligned : C.label }]}>
        {aligned ? 'FACING QIBLA' : 'QIBLA'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor: '#06301A',
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 16,
  },
  clip: { position: 'absolute', overflow: 'hidden' },
  tape: { position: 'absolute', left: 0, top: 0 },
  marker: { position: 'absolute', top: 0, width: 2, opacity: 0.9 },
  lcdAxis: { position: 'absolute', color: C.lcdText, fontFamily: DOT, textAlign: 'center' },
  slotText: { position: 'absolute', fontFamily: DOT, textAlign: 'center', letterSpacing: 0.5 },
  btnCol: { position: 'absolute', alignItems: 'center' },
  label: { color: C.label, fontFamily: SANS, letterSpacing: 1.2 },
  value: { color: C.value, fontFamily: DOT, marginTop: 2 },
  knob: { position: 'absolute' },
  knobLabel: { position: 'absolute', left: 0, right: 0, textAlign: 'center' },
});
