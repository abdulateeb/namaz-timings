/**
 * "hh:mm:ss:ms AM/PM", ticking every animation frame. Lives in its own
 * component so the fast updates never re-render the prayer cards.
 */
import { useEffect, useState } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';

function format(d: Date) {
  const h = d.getHours();
  const p2 = (n: number) => String(n).padStart(2, '0');
  const hh = p2(h % 12 === 0 ? 12 : h % 12);
  return {
    main: `${hh}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`,
    ms: String(d.getMilliseconds()).padStart(3, '0'),
    ampm: h < 12 ? 'AM' : 'PM',
  };
}

export function LiveClock({ style, msStyle }: { style?: StyleProp<TextStyle>; msStyle?: StyleProp<TextStyle> }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let id = 0;
    const loop = () => {
      setNow(new Date());
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, []);
  const t = format(now);
  return (
    <Text style={style}>
      {t.main}
      <Text style={msStyle}>:{t.ms}</Text> {t.ampm}
    </Text>
  );
}
