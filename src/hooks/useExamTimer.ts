import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { remainingSeconds } from '@/core/timer';

/**
 * Cuenta regresiva basada en la hora de inicio guardada (no en un contador
 * en memoria), así sigue siendo correcta tras pausar o cerrar la app.
 * Llama a `onExpire` una sola vez cuando el tiempo llega a cero.
 */
export function useExamTimer(
  startedAt: string | null,
  durationSeconds: number | null,
  onExpire: () => void,
  clock: () => number = Date.now,
): number | null {
  const compute = () =>
    startedAt && durationSeconds ? remainingSeconds(startedAt, durationSeconds, clock()) : null;
  const [remaining, setRemaining] = useState<number | null>(compute);
  const expired = useRef(false);
  const onExpireRef = useRef(onExpire);
  const clockRef = useRef(clock);
  useLayoutEffect(() => {
    onExpireRef.current = onExpire;
    clockRef.current = clock;
  });

  useEffect(() => {
    if (!startedAt || !durationSeconds) return;
    expired.current = false;
    const tick = () => {
      const left = remainingSeconds(startedAt, durationSeconds, clockRef.current());
      setRemaining(left);
      if (left === 0 && !expired.current) {
        expired.current = true;
        onExpireRef.current();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') tick();
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [startedAt, durationSeconds]);

  return remaining;
}
