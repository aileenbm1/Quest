import { CATEGORY_IDS, type AnswerSpec, type Question, type QuestionType } from '@/core/types';

/**
 * Formato para importar preguntas oficiales revisadas a mano.
 * Reglas:
 *  - `source` debe ser la URL oficial donde aparece la pregunta.
 *  - Si no hay una solución publicada o verificable, `answer` se omite y la
 *    pregunta queda «pendiente» (la app no la califica como correcta).
 *  - `reviewedBy` y `reviewedAt` documentan quién la revisó.
 */
export interface OfficialQuestionInput {
  id: string;
  moduleId: string;
  category: string;
  difficulty: number;
  type: string;
  prompt: string;
  options?: { key: string; label: string }[];
  answer?: AnswerSpec;
  explanation?: string;
  hints?: string[];
  estimatedSeconds?: number;
  source: string;
  examLabel: string;
  reviewedBy: string;
  reviewedAt: string;
  answerVerified: boolean;
}

const QUESTION_TYPES: QuestionType[] = [
  'opcion_multiple',
  'verdadero_falso',
  'numerica',
  'texto',
  'secuencia',
  'ordenamiento',
  'seguimiento',
  'cuadricula',
  'deteccion_error',
  'abierta',
];

export class ImportError extends Error {}

export function importOfficialQuestion(input: OfficialQuestionInput, moduleIds: string[]): Question {
  const fail = (msg: string): never => {
    throw new ImportError(`Pregunta ${input.id || '(sin id)'}: ${msg}`);
  };
  if (!/^ofi-[a-z0-9-]+$/.test(input.id)) fail('el id debe empezar con «ofi-».');
  if (!moduleIds.includes(input.moduleId)) fail(`módulo desconocido «${input.moduleId}».`);
  if (!(CATEGORY_IDS as string[]).includes(input.category)) fail(`categoría desconocida «${input.category}».`);
  if (!(QUESTION_TYPES as string[]).includes(input.type)) fail(`tipo desconocido «${input.type}».`);
  if (!Number.isInteger(input.difficulty) || input.difficulty < 1 || input.difficulty > 5) fail('dificultad fuera de 1–5.');
  if (!input.prompt?.trim()) fail('falta el enunciado.');
  if (!/^https:\/\/(www\.)?cimat\.mx\//.test(input.source) && !/^https:\/\/forms\.gle\//.test(input.source))
    fail('la fuente debe ser una URL oficial de la OIEG/CIMAT.');
  if (!input.reviewedBy?.trim() || !input.reviewedAt?.trim()) fail('falta registrar la revisión manual.');

  const verified = input.answerVerified && input.answer !== undefined && input.answer.kind !== 'reference';
  const answer: AnswerSpec =
    input.answer ?? { kind: 'reference', solution: 'Solución pendiente de revisión: no hay una respuesta oficial verificada.' };
  if (answer.kind === 'choice' && !input.options?.some((o) => o.key === answer.correct))
    fail('la respuesta no corresponde a ninguna opción.');

  return {
    id: input.id,
    moduleId: input.moduleId,
    lessonId: null,
    category: input.category as Question['category'],
    difficulty: input.difficulty as Question['difficulty'],
    type: input.type as QuestionType,
    prompt: input.prompt.trim(),
    options: input.options,
    answer,
    explanation: input.explanation?.trim() || 'Explicación pendiente de revisión.',
    hints: input.hints ?? [],
    estimatedSeconds: input.estimatedSeconds ?? 120,
    source: `${input.examLabel} — ${input.source} (revisada por ${input.reviewedBy}, ${input.reviewedAt})`,
    verification: verified ? 'verificada' : 'pendiente',
    origin: 'oficial',
  };
}
