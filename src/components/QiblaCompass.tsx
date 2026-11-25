/**
 * Qibla compass styled on the user's reference: thick green ring, white face,
 * navy ticks and N E S W, a light-green street-map centre, a Kaaba on the rim
 * at the Qibla bearing with a red dashed line to it, and a fixed red arrow for
 * where the phone points.
 *
 * Bull's eye: concentric rings in the centre with a spirit-level bubble. The
 * reading is only accurate when the phone is flat, i.e. the bubble is centred.
 *
 * The dial (ticks, letters, map, Kaaba) turns with the compass; the arrow and
 * bull's eye stay fixed to the phone.
 */
import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, Line, Path, Polygon, RadialGradient, Stop, Text as SvgText } from 'react-native-svg';

const GREEN = '#1BA556';
const GREEN_ON = '#22C766';
const NAVY = '#12294A';
const RED = '#E8202A';
const MAP = '#CFEFDF';
const MAP_ROAD = '#E9F8F0';

interface Props {
  size: number;
  qibla: number;
  rotation: SharedValue<number>;
  aligned: boolean;
  tiltX: SharedValue<number>;
  tiltY: SharedValue<number>;
  flat: boolean;
}

/** Kaaba drawn in a 100 x 100 box, top face pointing outward. */
function Kaaba() {
  const scallops = (a: [number, number], b: [number, number]) =>
    [0.22, 0.5, 0.78].map((t) => {
      const x = a[0] + (b[0] - a[0]) * t;
      const y = a[1] + (b[1] - a[1]) * t;
      return <Ellipse key={`${x}`} cx={x} cy={y} rx={4.2} ry={5.2} fill="#141414" stroke="#FFFFFF" strokeWidth={1.6} />;
    });
  return (
    <G>
      <Polygon points="50,3 93,23 93,75 50,97 7,75 7,23" fill="#141414" stroke="#FFFFFF" strokeWidth={5} strokeLinejoin="round" />
      <Polygon points="50,5 91,24 50,43 9,24" fill="#3B3B3B" />
      <Line x1={50} y1={43} x2={50} y2={95} stroke="#2C2C2C" strokeWidth={1.5} />
      <Polygon points="9,33 50,52 50,62 9,43" fill="#F2C94C" />
      <Polygon points="50,52 91,33 91,43 50,62" fill="#E2B53A" />
      {scallops([12, 50], [46, 66])}
      {scallops([54, 66], [88, 50])}
    </G>
  );
}

const Dial = memo(function Dial({ s, qibla }: { s: number; qibla: number }) {
  const c = s / 2;
  const mapR = s * 0.27;
  const tickR = c - s * 0.075;

  const ticks = useMemo(() => {
    const out: { a: number; major: boolean }[] = [];
    for (let a = 0; a < 360; a += 5) out.push({ a, major: a % 30 === 0 });
    return out;
  }, []);

  // Diagonal street grid for the map centre.
  const roads = useMemo(() => {
    const out: number[] = [];
    for (let k = -4; k <= 4; k++) out.push(k * s * 0.095);
    return out;
  }, [s]);

  const kSize = s * 0.24;
  const kR = c - s * 0.1; // Kaaba centre distance from the dial centre

  return (
    <Svg width={s} height={s}>
      <Defs>
        <ClipPath id="mapClip">
          <Circle cx={c} cy={c} r={mapR} />
        </ClipPath>
      </Defs>

      {/* Map centre. */}
      <Circle cx={c} cy={c} r={mapR} fill={MAP} />
      <G clipPath="url(#mapClip)">
        <G transform={`rotate(-35 ${c} ${c})`}>
          {roads.map((d) => (
            <Line key={`v${d}`} x1={c + d} y1={0} x2={c + d} y2={s} stroke={MAP_ROAD} strokeWidth={s * 0.028} />
          ))}
          {roads.map((d) => (
            <Line key={`h${d}`} x1={0} y1={c + d * 1.15} x2={s} y2={c + d * 1.15} stroke={MAP_ROAD} strokeWidth={s * 0.028} />
          ))}
        </G>
        <Circle cx={c - s * 0.13} cy={c + s * 0.03} r={s * 0.03} fill="none" stroke={MAP_ROAD} strokeWidth={s * 0.022} />
      </G>

      {/* Ticks. */}
      {ticks.map(({ a, major }) => {
        const r = ((a - 90) * Math.PI) / 180;
        const len = major ? s * 0.06 : s * 0.033;
        return (
          <Line
            key={a}
            x1={c + tickR * Math.cos(r)}
            y1={c + tickR * Math.sin(r)}
            x2={c + (tickR - len) * Math.cos(r)}
            y2={c + (tickR - len) * Math.sin(r)}
            stroke={NAVY}
            strokeWidth={major ? 3.2 : 1.8}
            strokeLinecap="round"
          />
        );
      })}

      {/* Cardinal letters. */}
      {(['N', 'E', 'S', 'W'] as const).map((l, i) => {
        const a = i * 90;
        const r = ((a - 90) * Math.PI) / 180;
        const d = c - s * 0.185;
        const x = c + d * Math.cos(r);
        const y = c + d * Math.sin(r);
        return (
          <SvgText key={l} x={x} y={y + s * 0.032} fill={NAVY} fontSize={s * 0.095} fontWeight="800" fontFamily="Inter_700Bold" textAnchor="middle" transform={`rotate(${a} ${x} ${y})`}>
            {l}
          </SvgText>
        );
      })}

      {/* Red dashed line to the Kaaba, then the Kaaba on the rim. */}
      <G transform={`rotate(${qibla} ${c} ${c})`}>
        <Line x1={c} y1={c} x2={c} y2={c - kR + kSize * 0.42} stroke={RED} strokeWidth={Math.max(2.5, s * 0.008)} strokeDasharray={`${s * 0.018} ${s * 0.014}`} />
        <G transform={`translate(${c - kSize / 2} ${c - kR - kSize / 2}) scale(${kSize / 100})`}>
          <Kaaba />
        </G>
      </G>
    </Svg>
  );
});

/** Fixed overlay: bull's eye rings and the red phone-direction arrow. */
const Fixed = memo(function Fixed({ s, aligned, flat }: { s: number; aligned: boolean; flat: boolean }) {
  const c = s / 2;
  const ay = c - s * 0.175; // arrow centre, near the top of the map circle
  const a = s * 0.05;
  const ring = flat ? GREEN : NAVY;
  return (
    <Svg width={s} height={s} style={StyleSheet.absoluteFill} pointerEvents="none">
      {[0.03, 0.06, 0.09].map((r) => (
        <Circle key={r} cx={c} cy={c} r={s * r} fill="none" stroke={ring} strokeOpacity={flat ? 0.75 : 0.35} strokeWidth={1.6} />
      ))}
      <Line x1={c - s * 0.1} y1={c} x2={c + s * 0.1} y2={c} stroke={ring} strokeOpacity={0.3} strokeWidth={1.2} />
      <Line x1={c} y1={c - s * 0.1} x2={c} y2={c + s * 0.1} stroke={ring} strokeOpacity={0.3} strokeWidth={1.2} />
      {/* Navigation arrow, two-tone for depth. */}
      <Path d={`M ${c} ${ay - a} L ${c} ${ay + a * 0.35} L ${c - a * 0.62} ${ay + a * 0.8} Z`} fill={aligned ? '#16A34A' : '#C8141C'} />
      <Path d={`M ${c} ${ay - a} L ${c + a * 0.62} ${ay + a * 0.8} L ${c} ${ay + a * 0.35} Z`} fill={aligned ? GREEN_ON : '#FF3B3B'} />
    </Svg>
  );
});

export function QiblaCompass({ size: s, qibla, rotation, aligned, tiltX, tiltY, flat }: Props) {
  const c = s / 2;
  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${-rotation.value}deg` }] }));
  const travel = s * 0.085;
  const bubble = useAnimatedStyle(() => ({ transform: [{ translateX: tiltX.value * travel }, { translateY: tiltY.value * travel }] }));
  const ringW = s * 0.05;
  const b = s * 0.056;

  return (
    <View style={[styles.shadow, { width: s, height: s, borderRadius: c }]}>
      {/* Green ring and white face (static; a circle looks the same at any angle). */}
      <Svg width={s} height={s} style={StyleSheet.absoluteFill}>
        <Circle cx={c} cy={c} r={c - ringW / 2} fill="#FFFFFF" stroke={aligned ? GREEN_ON : GREEN} strokeWidth={ringW} />
      </Svg>

      <Animated.View style={[StyleSheet.absoluteFill, spin]}>
        <Dial s={s} qibla={qibla} />
      </Animated.View>

      <Fixed s={s} aligned={aligned} flat={flat} />

      {/* Spirit-level bubble. */}
      <Animated.View pointerEvents="none" style={[styles.bubbleWrap, { left: c - b / 2, top: c - b / 2, width: b, height: b }, bubble]}>
        <Svg width={b} height={b}>
          <Defs>
            <RadialGradient id="bub" cx="35%" cy="30%" r="75%">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.95} />
              <Stop offset="0.35" stopColor={flat ? GREEN_ON : '#F5A524'} />
              <Stop offset="1" stopColor={flat ? '#0F7A3D' : '#B8730C'} />
            </RadialGradient>
          </Defs>
          <Circle cx={b / 2} cy={b / 2} r={b / 2 - 1} fill="url(#bub)" stroke="#FFFFFF" strokeWidth={1.5} />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor: '#0B3D22',
    shadowOpacity: 0.25,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  bubbleWrap: { position: 'absolute' },
});
