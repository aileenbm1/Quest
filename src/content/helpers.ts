import type { Question, QuestionOption } from '@/core/types';

export const ORIGINAL_SOURCE =
  'Ejercicio original de OIEG Quest, creado para practicar. No es una pregunta oficial de la OIEG.';

type OriginalInput = Omit<Question, 'source' | 'verification' | 'origin'>;

/** Crea una pregunta original verificada por el equipo de contenido de la app. */
export function original(q: OriginalInput): Question {
  return { ...q, source: ORIGINAL_SOURCE, verification: 'verificada', origin: 'original' };
}

/** Opciones con claves a, b, c, d… en el orden dado. */
export function opts(...labels: string[]): QuestionOption[] {
  return labels.map((label, i) => ({ key: 'abcdefgh'[i]!, label }));
}

export const TRUE_FALSE: QuestionOption[] = [
  { key: 'v', label: 'Verdadero' },
  { key: 'f', label: 'Falso' },
];
