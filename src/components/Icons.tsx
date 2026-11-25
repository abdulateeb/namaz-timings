import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import type { PrayerKey } from '../lib/prayer';

interface P {
  size?: number;
  color?: string;
}

/** Own stacking layer so glass overlays never paint over the icon on web. */
const LAYER = { position: 'relative' as const };

const STROKE = { strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };

export function ClockIcon({ size = 20, color = '#fff' }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={LAYER}>
      <Circle cx={12} cy={12} r={8.5} stroke={color} {...STROKE} />
      <Path d="M12 7.5V12l3 2" stroke={color} {...STROKE} />
    </Svg>
  );
}

export function CompassIcon({ size = 20, color = '#fff' }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={LAYER}>
      <Circle cx={12} cy={12} r={8.5} stroke={color} {...STROKE} />
      <Path d="M14.8 9.2l-1.6 4-4 1.6 1.6-4z" stroke={color} {...STROKE} fill={color} />
    </Svg>
  );
}

export function PinIcon({ size = 14, color = '#fff' }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={LAYER}>
      <Path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 1 1 13 0c0 5.4-6.5 11-6.5 11z" stroke={color} {...STROKE} />
      <Circle cx={12} cy={10} r={2.2} fill={color} />
    </Svg>
  );
}

export function KaabaIcon({ size = 18, color = '#fff', band = '#E8C26A' }: P & { band?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={LAYER}>
      <Path d="M4 8l8-3.5L20 8v9l-8 3.5L4 17z" fill={color} />
      <Path d="M4 8l8 3.5L20 8" stroke="rgba(0,0,0,0.35)" strokeWidth={1} fill="none" />
      <Path d="M12 11.5v9" stroke="rgba(0,0,0,0.35)" strokeWidth={1} />
      <Path d="M4 10.2l8 3.5 8-3.5" stroke={band} strokeWidth={1.6} fill="none" />
    </Svg>
  );
}

function Horizon({ color }: { color: string }) {
  return <Line x1={3} y1={18} x2={21} y2={18} stroke={color} {...STROKE} />;
}

/** White glyph per prayer, drawn on a coloured tile. */
export function PrayerGlyph({ prayer, size = 20, color = '#fff' }: P & { prayer: PrayerKey }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={LAYER}>
      {prayer === 'fajr' && (
        <>
          <Path d="M7 18a5 5 0 0 1 10 0" stroke={color} {...STROKE} />
          <Horizon color={color} />
          <Path d="M12 6v3M5.6 9.6l1.6 1.6M18.4 9.6l-1.6 1.6" stroke={color} {...STROKE} />
        </>
      )}
      {prayer === 'dhuhr' && (
        <>
          <Circle cx={12} cy={12} r={4} fill={color} />
          <Path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" stroke={color} {...STROKE} />
        </>
      )}
      {prayer === 'asr' && (
        <>
          <Circle cx={11} cy={11} r={3.6} fill={color} />
          <Path d="M11 4v1.5M4 11h1.5M6 6l1 1M16 6l-1 1" stroke={color} {...STROKE} />
          <Path d="M3 18h18" stroke={color} {...STROKE} />
          <Path d="M14 18l4-4" stroke={color} {...STROKE} opacity={0.7} />
        </>
      )}
      {prayer === 'maghrib' && (
        <>
          <Path d="M6 16a6 6 0 0 1 12 0z" fill={color} />
          <Horizon color={color} />
          <Path d="M12 6.5V9M12 9l-1.5-1.5M12 9l1.5-1.5" stroke={color} {...STROKE} />
        </>
      )}
      {prayer === 'isha' && (
        <>
          <Path d="M15.5 4.5a7.5 7.5 0 1 0 4 12.5 6 6 0 0 1-4-12.5z" fill={color} />
          <Rect x={17.4} y={5.4} width={1.6} height={1.6} rx={0.8} fill={color} />
        </>
      )}
    </Svg>
  );
}
