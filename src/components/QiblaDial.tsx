import { memo, useMemo, useRef } from 'react';
import { PanResponder, Platform, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, G, Line, LinearGradient as SvgLinear, Path, RadialGradient, Stop, Text as SvgText } from 'react-native-svg';

import { QIBLA_GREEN } from '../theme';
import { Glass } from './Glass';

interface Props {
  size: number;
  qibla: number;
  rotation: SharedValue<number>;
  aligned: boolean;
  /** Browser preview: drag to turn. */
  onDrag?: (delta: number) => void;
}

const CARDINAL: Record<number, string> = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' };

/** The part that turns with the phone: ticks, letters, Qibla needle and Kaaba. */
const DialFace = memo(function DialFace({ size, qibla, aligned }: { size: number; qibla: number; aligned: boolean }) {
  const c = size / 2;
  const tickOuter = c - 16;
  const ticks = useMemo(() => {
    const out: { a: number; major: boolean; mid: boolean }[] = [];
    for (let a = 0; a < 360; a += 3) out.push({ a, major: a % 30 === 0, mid: a % 15 === 0 });
    return out;
  }, []);
  const needleColor = aligned ? QIBLA_GREEN : '#F3CF7A';
  const needleLen = c * 0.6;

  return (
    <Svg width={size} height={size}>
      <Defs>
        <SvgLinear id="needle" x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0" stopColor={needleColor} stopOpacity={0.05} />
          <Stop offset="1" stopColor={needleColor} stopOpacity={1} />
        </SvgLinear>
      </Defs>

      {ticks.map(({ a, major, mid }) => {
        const len = major ? 13 : mid ? 9 : 5;
        const rad = ((a - 90) * Math.PI) / 180;
        const x1 = c + tickOuter * Math.cos(rad);
        const y1 = c + tickOuter * Math.sin(rad);
        const x2 = c + (tickOuter - len) * Math.cos(rad);
        const y2 = c + (tickOuter - len) * Math.sin(rad);
        return (
          <Line
            key={a}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={a === 0 ? '#FF6B5E' : '#FFFFFF'}
            strokeOpacity={major ? 0.95 : mid ? 0.55 : 0.28}
            strokeWidth={major ? 2.2 : 1.3}
            strokeLinecap="round"
          />
        );
      })}

      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((a) => {
        const card = CARDINAL[a];
        const r = tickOuter - (card ? 34 : 30);
        const rad = ((a - 90) * Math.PI) / 180;
        const x = c + r * Math.cos(rad);
        const y = c + r * Math.sin(rad);
        return (
          <SvgText
            key={a}
            x={x}
            y={y + (card ? 7 : 4)}
            fill={a === 0 ? '#FF6B5E' : '#FFFFFF'}
            fillOpacity={card ? 1 : 0.55}
            fontSize={card ? 20 : 11}
            fontWeight={card ? '700' : '500'}
            fontFamily="Inter_600SemiBold"
            textAnchor="middle"
            transform={`rotate(${a} ${x} ${y})`}
          >
            {card ?? String(a)}
          </SvgText>
        );
      })}

      {/* Qibla needle and Kaaba, pointing at the Qibla bearing on the dial. */}
      <G transform={`rotate(${qibla} ${c} ${c})`}>
        <Path d={`M ${c - 3} ${c} L ${c} ${c - needleLen} L ${c + 3} ${c} Z`} fill="url(#needle)" />
        <G transform={`translate(${c - 14} ${c - needleLen - 30}) rotate(${-qibla} 14 14)`}>
          <Circle cx={14} cy={14} r={18} fill={needleColor} opacity={aligned ? 0.35 : 0.18} />
          <G transform="translate(2 2)">
            <Path d="M4 8l8-3.5L20 8v9l-8 3.5L4 17z" fill="#111317" />
            <Path d="M4 8l8 3.5L20 8M12 11.5v9" stroke="rgba(255,255,255,0.25)" strokeWidth={0.8} fill="none" />
            <Path d="M4 10.2l8 3.5 8-3.5" stroke="#E8C26A" strokeWidth={1.6} fill="none" />
          </G>
        </G>
      </G>
    </Svg>
  );
});

/** Static parts: recessed face and the skeuomorphic centre knob. */
const DialBase = memo(function DialBase({ size }: { size: number }) {
  const c = size / 2;
  return (
    <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
      <Defs>
        <RadialGradient id="face" cx="50%" cy="45%" r="55%">
          <Stop offset="0" stopColor="#1C2030" stopOpacity={0.15} />
          <Stop offset="0.8" stopColor="#0A0C14" stopOpacity={0.45} />
          <Stop offset="1" stopColor="#000000" stopOpacity={0.6} />
        </RadialGradient>
      </Defs>
      <Circle cx={c} cy={c} r={c - 8} fill="url(#face)" />
      <Circle cx={c} cy={c} r={c - 8} stroke="rgba(255,255,255,0.10)" strokeWidth={1} fill="none" />
    </Svg>
  );
});

const Knob = memo(function Knob({ aligned }: { aligned: boolean }) {
  const s = 64;
  return (
    <Svg width={s} height={s}>
      <Defs>
        <RadialGradient id="knob" cx="40%" cy="30%" r="75%">
          <Stop offset="0" stopColor="#5A6072" />
          <Stop offset="0.55" stopColor="#262A35" />
          <Stop offset="1" stopColor="#0E1016" />
        </RadialGradient>
        <SvgLinear id="rim" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.45} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0.02} />
        </SvgLinear>
      </Defs>
      <Circle cx={s / 2} cy={s / 2 + 2} r={26} fill="rgba(0,0,0,0.45)" />
      <Circle cx={s / 2} cy={s / 2} r={26} fill="url(#knob)" />
      <Circle cx={s / 2} cy={s / 2} r={25.3} stroke="url(#rim)" strokeWidth={1.4} fill="none" />
      <Circle cx={s / 2} cy={s / 2} r={4} fill={aligned ? QIBLA_GREEN : '#F3CF7A'} />
    </Svg>
  );
});

export function QiblaDial({ size, qibla, rotation, aligned, onDrag }: Props) {
  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${-rotation.value}deg` }] }));

  const last = useRef<number | null>(null);
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !!onDrag,
        onMoveShouldSetPanResponder: () => !!onDrag,
        onPanResponderGrant: (e) => {
          const { locationX, locationY } = e.nativeEvent;
          last.current = (Math.atan2(locationY - size / 2, locationX - size / 2) * 180) / Math.PI;
        },
        onPanResponderMove: (e, g) => {
          if (last.current === null || !onDrag) return;
          // Angle from dial centre using page coordinates relative to gesture start.
          const { locationX, locationY } = e.nativeEvent;
          const a = (Math.atan2(locationY - size / 2, locationX - size / 2) * 180) / Math.PI;
          let d = a - last.current;
          d = ((d + 540) % 360) - 180;
          last.current = a;
          onDrag(-d);
          void g;
        },
        onPanResponderRelease: () => {
          last.current = null;
        },
      }),
    [onDrag, size],
  );

  return (
    <View style={{ width: size, height: size + 26, alignItems: 'center' }}>
      {/* Fixed pointer: line the Kaaba up under this. */}
      <Svg width={24} height={18} style={{ marginBottom: 8 }}>
        <Path d="M12 18 L3 3 Q12 7 21 3 Z" fill={aligned ? QIBLA_GREEN : '#FFFFFF'} />
      </Svg>
      <View style={{ width: size, height: size }} {...(Platform.OS === 'web' && onDrag ? pan.panHandlers : {})}>
        <Glass radius={size / 2} style={StyleSheet.absoluteFill} intensity={55} tint="rgba(12,14,22,0.28)">
          <DialBase size={size} />
        </Glass>
        <Animated.View style={[StyleSheet.absoluteFill, spin]} pointerEvents="none">
          <DialFace size={size} qibla={qibla} aligned={aligned} />
        </Animated.View>
        <View style={styles.center} pointerEvents="none">
          <Knob aligned={aligned} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
});
