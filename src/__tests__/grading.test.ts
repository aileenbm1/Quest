import { describeCorrectAnswer, gradeAnswer, normalizeText, parseNumber, splitTokens } from '@/core/grading';
import type { AnswerSpec, Question } from '@/core/types';

const q = (answer: AnswerSpec, verification: Question['verification'] = 'verificada') => ({ answer, verification });

describe('normalización de texto', () => {
  it('ignora mayúsculas, acentos, espacios extra y puntuación en los extremos', () => {
    expect(normalizeText('  MIÉRCOLES. ')).toBe('miercoles');
    expect(normalizeText('¿El   Perro?')).toBe('el perro');
    expect(normalizeText('"Hola"')).toBe('hola');
  });

  it('conserva el punto inicial de un decimal', () => {
    expect(normalizeText('.5')).toBe('.5');
  });

  it('separa tokens por comas, espacios o punto y coma', () => {
    expect(splitTokens('36, 49')).toEqual(['36', '49']);
    expect(splitTokens('36 49')).toEqual(['36', '49']);
    expect(splitTokens(' 1;6 , 3 ')).toEqual(['1', '6', '3']);
  });
});

describe('interpretación de números', () => {
  it.each([
    ['12', 12],
    [' 12 ', 12],
    ['-3', -3],
    ['2.5', 2.5],
    ['2,5', 2.5],
    ['1,000', 1000],
    ['1 000', 1000],
    ['3/4', 0.75],
    ['12 metros', 12],
    ['.5', 0.5],
  ])('interpreta %p como %p', (raw, value) => {
    expect(parseNumber(raw)).toBeCloseTo(value);
  });

  it.each(['', 'doce', '12 o 13', '1/0', '1..2'])('rechaza %p', (raw) => {
    expect(parseNumber(raw)).toBeNull();
  });
});

describe('corrección de respuestas', () => {
  it('opción múltiple', () => {
    expect(gradeAnswer(q({ kind: 'choice', correct: 'b' }), 'b')).toBe('correcta');
    expect(gradeAnswer(q({ kind: 'choice', correct: 'b' }), 'a')).toBe('incorrecta');
  });

  it('numérica con equivalencias matemáticamente correctas', () => {
    const spec: AnswerSpec = { kind: 'number', value: 0.5 };
    expect(gradeAnswer(q(spec), '1/2')).toBe('correcta');
    expect(gradeAnswer(q(spec), '0,5')).toBe('correcta');
    expect(gradeAnswer(q(spec), '2/4')).toBe('correcta');
    expect(gradeAnswer(q(spec), '0.6')).toBe('incorrecta');
    expect(gradeAnswer(q(spec), 'medio')).toBe('incorrecta');
  });

  it('numérica entera no acepta valores cercanos', () => {
    expect(gradeAnswer(q({ kind: 'number', value: 31 }), '31')).toBe('correcta');
    expect(gradeAnswer(q({ kind: 'number', value: 31 }), '31.0')).toBe('correcta');
    expect(gradeAnswer(q({ kind: 'number', value: 31 }), '30.99')).toBe('incorrecta');
  });

  it('texto normalizado con varias respuestas aceptadas', () => {
    const spec: AnswerSpec = { kind: 'text', accepted: ['miércoles'] };
    expect(gradeAnswer(q(spec), 'Miercoles')).toBe('correcta');
    expect(gradeAnswer(q(spec), '  MIÉRCOLES. ')).toBe('correcta');
    expect(gradeAnswer(q(spec), 'jueves')).toBe('incorrecta');
  });

  it('secuencias, comparando números por su valor', () => {
    const spec: AnswerSpec = { kind: 'sequence', values: ['36', '49'] };
    expect(gradeAnswer(q(spec), '36, 49')).toBe('correcta');
    expect(gradeAnswer(q(spec), '36 49')).toBe('correcta');
    expect(gradeAnswer(q(spec), '49, 36')).toBe('incorrecta');
    expect(gradeAnswer(q(spec), '36')).toBe('incorrecta');
    expect(gradeAnswer(q({ kind: 'sequence', values: ['I'] }), 'i')).toBe('correcta');
  });

  it('ordenamiento', () => {
    const spec: AnswerSpec = { kind: 'order', order: ['b', 'd', 'a', 'c'] };
    expect(gradeAnswer(q(spec), 'b,d,a,c')).toBe('correcta');
    expect(gradeAnswer(q(spec), 'b, d, a, c')).toBe('correcta');
    expect(gradeAnswer(q(spec), 'a,b,c,d')).toBe('incorrecta');
    expect(gradeAnswer(q(spec), 'b,d,a')).toBe('incorrecta');
  });

  it('trata las respuestas vacías como vacías, no como incorrectas', () => {
    expect(gradeAnswer(q({ kind: 'number', value: 3 }), '')).toBe('vacia');
    expect(gradeAnswer(q({ kind: 'number', value: 3 }), '   ')).toBe('vacia');
    expect(gradeAnswer(q({ kind: 'choice', correct: 'a' }), null)).toBe('vacia');
    expect(gradeAnswer(q({ kind: 'choice', correct: 'a' }), undefined)).toBe('vacia');
  });

  it('nunca marca como correcta una pregunta sin solución verificada', () => {
    expect(gradeAnswer(q({ kind: 'choice', correct: 'a' }, 'pendiente'), 'a')).toBe('no_verificable');
    expect(gradeAnswer(q({ kind: 'reference', solution: 'x' }), 'cualquier cosa')).toBe('no_verificable');
  });

  it('describe la respuesta correcta para mostrarla después', () => {
    expect(
      describeCorrectAnswer({
        answer: { kind: 'choice', correct: 'b' },
        options: [
          { key: 'a', label: 'Uno' },
          { key: 'b', label: 'Dos' },
        ],
      }),
    ).toBe('Dos');
  });
});
