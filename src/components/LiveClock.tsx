/**
 * "hh:mm:ss AM/PM", updated on each whole second. Lives in its own component
 * so the ticking never re-renders the prayer cards.
 */
import { useEffect, useState } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';

function format(d: Date) {
  const h = d.getHours();
  const p2 = (n: number) => String(n).padStart(2, '0');
  return `${p2(h % 12 === 0 ? 12 : h % 12)}:${p2(d.getMinutes())}:${p2(d.getSeconds())} ${h < 12 ? 'AM' : 'PM'}`;
}

export function LiveClock({ style }: { style?: StyleProp<TextStyle> }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      setNow(new Date());
      timer = setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
    };
    timer = setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
    return () => clearTimeout(timer);
  }, []);
  return <Text style={style}>{format(now)}</Text>;
}
