import { useEffect, useState } from 'react';

import { demoNow } from './demo';

/** Current time, re-rendered on each whole second. */
export function useNow(): Date {
  const [now, setNow] = useState(() => demoNow());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      setNow(demoNow());
      timer = setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
    };
    timer = setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
    return () => clearTimeout(timer);
  }, []);
  return now;
}
