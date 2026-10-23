import { useRenderClock } from '@/helpers/render-clock';
import { useEffect, useState } from 'react';

const getSecondsLeft = (target: number | null, now: number) => {
  if (target === null) return 0;

  return Math.max(0, Math.ceil((target - now) / 1000));
};

const useCountdownSeconds = (target: number | null) => {
  const getNow = useRenderClock();
  const [secondsLeft, setSecondsLeft] = useState(() =>
    getSecondsLeft(target, getNow())
  );

  useEffect(() => {
    setSecondsLeft(getSecondsLeft(target, getNow()));

    if (target === null) return;

    const timer = setInterval(
      () => setSecondsLeft(getSecondsLeft(target, getNow())),
      250
    );

    return () => clearInterval(timer);
  }, [getNow, target]);

  return secondsLeft;
};

export { useCountdownSeconds };
