import { useFocusEffect } from 'expo-router';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';

interface AsyncState<T> {
  data: T | undefined;
  error: unknown;
  loading: boolean;
  reload: () => void;
}

/**
 * Carga datos de SQLite y los vuelve a cargar cada vez que la pantalla
 * recupera el foco, para que el progreso mostrado siempre esté al día.
 * `key` identifica los parámetros de la carga (por ejemplo, el id de la ruta).
 */
export function useAsyncData<T>(load: () => Promise<T>, key: string | number = ''): AsyncState<T> {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const loadRef = useRef(load);
  useLayoutEffect(() => {
    loadRef.current = load;
  });

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      loadRef
        .current()
        .then((d) => {
          if (!active) return;
          setData(d);
          setError(null);
        })
        .catch((e: unknown) => {
          if (active) setError(e);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
      // tick y key son disparadores intencionales de recarga.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tick, key]),
  );

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, loading, reload };
}
