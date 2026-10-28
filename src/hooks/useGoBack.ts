import { useRouter, type Href } from 'expo-router';
import { useCallback } from 'react';

/**
 * Regresa a la pantalla anterior. Si no hay historial (por ejemplo, en la versión web
 * cuando se abrió el enlace directo o se recargó la página), va a `fallback`.
 */
export function useGoBack(fallback: Href) {
  const router = useRouter();
  return useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace(fallback);
  }, [router, fallback]);
}
