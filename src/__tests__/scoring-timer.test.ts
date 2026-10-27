import { computeScore, weakCategories } from '@/core/scoring';
import { clampExamMinutes, formatClock, isExpired, remainingSeconds } from '@/core/timer';

describe('puntuación del simulacro', () => {
  it('suma 1 punto por correcta y no penaliza errores ni vacías', () => {
    const s = computeScore([
      { category: 'logica', result: 'correcta' },
      { category: 'logica', result: 'incorrecta' },
      { category: 'patrones', result: 'correcta' },
      { category: 'patrones', result: 'vacia' },
    ]);
    expect(s.score).toBe(2);
    expect(s.maxScore).toBe(4);
    expect(s.percent).toBe(50);
    expect(s.empty).toBe(1);
    expect(s.byCategory.logica).toEqual({ correct: 1, gradable: 2, total: 2, percent: 50 });
  });

  it('excluye del máximo las preguntas no verificables', () => {
    const s = computeScore([
      { category: 'mixtos', result: 'correcta' },
      { category: 'mixtos', result: 'no_verificable' },
    ]);
    expect(s.maxScore).toBe(1);
    expect(s.percent).toBe(100);
    expect(s.unverifiable).toBe(1);
    expect(s.byCategory.mixtos?.total).toBe(2);
  });

  it('un examen vacío da 0 sin dividir entre cero', () => {
    expect(computeScore([]).percent).toBe(0);
  });

  it('detecta categorías débiles en orden', () => {
    const s = computeScore([
      { category: 'logica', result: 'incorrecta' },
      { category: 'patrones', result: 'correcta' },
      { category: 'algoritmos', result: 'correcta' },
      { category: 'algoritmos', result: 'incorrecta' },
      { category: 'algoritmos', result: 'incorrecta' },
    ]);
    expect(weakCategories(s)).toEqual(['logica', 'algoritmos']);
  });
});

describe('temporizador', () => {
  const start = '2026-11-01T10:00:00.000Z';
  const t0 = Date.parse(start);

  it('calcula el tiempo restante', () => {
    expect(remainingSeconds(start, 90 * 60, t0)).toBe(5400);
    expect(remainingSeconds(start, 90 * 60, t0 + 60_000)).toBe(5340);
  });

  it('nunca devuelve tiempo negativo y marca el examen como agotado', () => {
    expect(remainingSeconds(start, 60, t0 + 61_000)).toBe(0);
    expect(isExpired(start, 60, t0 + 60_000)).toBe(true);
    expect(isExpired(start, 60, t0 + 59_000)).toBe(false);
  });

  it('limita la duración a un máximo de 90 minutos', () => {
    expect(clampExamMinutes(120)).toBe(90);
    expect(clampExamMinutes(1)).toBe(5);
    expect(clampExamMinutes(Number.NaN)).toBe(90);
  });

  it('formatea el reloj', () => {
    expect(formatClock(5400)).toBe('1:30:00');
    expect(formatClock(65)).toBe('01:05');
    expect(formatClock(-3)).toBe('00:00');
  });
});
