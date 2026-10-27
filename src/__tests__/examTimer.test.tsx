import { act, renderHook } from '@testing-library/react-native';
import { useExamTimer } from '@/hooks/useExamTimer';

describe('temporizador del simulador', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('cuenta hacia atrás y envía el examen una sola vez al agotarse', async () => {
    let now = Date.parse('2026-11-01T10:00:00Z');
    const clock = () => now;
    const onExpire = jest.fn();
    const { result } = await renderHook(() => useExamTimer('2026-11-01T10:00:00.000Z', 3, onExpire, clock));
    expect(result.current).toBe(3);

    for (let i = 0; i < 5; i++) {
      now += 1000;
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });
    }
    expect(result.current).toBe(0);
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('si la app estuvo cerrada más tiempo del límite, expira de inmediato', async () => {
    const onExpire = jest.fn();
    const clock = () => Date.parse('2026-11-01T12:00:00Z');
    await renderHook(() => useExamTimer('2026-11-01T10:00:00.000Z', 90 * 60, onExpire, clock));
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('sin duración (diagnóstico) no hay temporizador', async () => {
    const onExpire = jest.fn();
    const { result } = await renderHook(() => useExamTimer('2026-11-01T10:00:00.000Z', null, onExpire));
    expect(result.current).toBeNull();
    expect(onExpire).not.toHaveBeenCalled();
  });
});
