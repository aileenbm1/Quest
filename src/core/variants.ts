import { seededRandom, shuffle } from './exam';
import type { AnswerSpec, Question, QuestionOption } from './types';

// Variantes de ejercicios para que un simulacro no se pueda resolver de memoria:
// otros números (con la respuesta recalculada) y las opciones en otro orden.

/** Cambia los datos de un ejercicio. Debe calcular la respuesta con código, nunca a mano. */
export type VariantMaker = (q: Question, random: () => number) => Partial<
  Pick<Question, 'prompt' | 'data' | 'answer' | 'explanation' | 'hints' | 'options' | 'visual'>
>;

/** Entero aleatorio entre min y max, incluidos. */
export const randInt = (random: () => number, min: number, max: number): number =>
  min + Math.floor(random() * (max - min + 1));

export const pick = <T>(random: () => number, items: readonly T[]): T => items[Math.floor(random() * items.length)]!;

/** Tipos cuyas opciones tienen un orden natural (V/F, letras de la cuadrícula, «Paso 1, 2…»). */
const FIXED_ORDER_TYPES = new Set<Question['type']>(['verdadero_falso', 'cuadricula', 'deteccion_error']);

/** Opciones como «No se puede saber» se quedan al final, como en un examen normal. */
const STAYS_LAST = /^(no se puede|es imposible|no muestra nada)/i;

/**
 * Revuelve las opciones y les vuelve a poner letra según su nueva posición (a, b, c…), para
 * que la respuesta correcta no quede siempre en la misma letra.
 */
export function shuffleOptions(q: Question, random: () => number): Question {
  const options = q.options;
  if (!options || options.length < 2 || FIXED_ORDER_TYPES.has(q.type)) return q;
  if (q.answer.kind !== 'choice' && q.answer.kind !== 'order') return q;
  const last = options.filter((o) => STAYS_LAST.test(o.label));
  const movable = options.filter((o) => !STAYS_LAST.test(o.label));
  let order = [...shuffle(movable, random), ...last];
  if (q.answer.kind === 'order') {
    // En «ordena los pasos» el orden inicial no debe ser ya la respuesta.
    const correct = q.answer.order;
    for (let tries = 0; tries < 10 && order.every((o, i) => o.key === correct[i]); tries++) order = shuffle(options, random);
  }
  const newKey = new Map(order.map((o, i) => [o.key, 'abcdefgh'[i]!]));
  const rekeyed: QuestionOption[] = order.map((o) => ({ key: newKey.get(o.key)!, label: o.label }));
  const answer: AnswerSpec =
    q.answer.kind === 'choice'
      ? { kind: 'choice', correct: newKey.get(q.answer.correct) ?? q.answer.correct }
      : { kind: 'order', order: q.answer.order.map((k) => newKey.get(k) ?? k) };
  return { ...q, options: rekeyed, answer };
}

/**
 * La versión del ejercicio que ve el estudiante en un simulacro. Con la misma semilla
 * siempre sale la misma variante, así el examen se puede retomar y calificar después.
 */
export function materializeQuestion(q: Question, seed: number | null, makers: Record<string, VariantMaker>): Question {
  if (seed === null) return q;
  const random = seededRandom(seed);
  const maker = makers[q.id];
  const varied = maker ? { ...q, ...maker(q, random) } : q;
  return shuffleOptions(varied, random);
}
