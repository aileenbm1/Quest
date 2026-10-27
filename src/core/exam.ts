import { CATEGORY_IDS, type CategoryId, type Question } from './types';

export type ExamKind = 'corto' | 'completo' | 'diagnostico';

export interface ExamPreset {
  kind: ExamKind;
  title: string;
  description: string;
  questionsPerCategory: number;
  defaultMinutes: number | null;
}

export const EXAM_PRESETS: Record<ExamKind, ExamPreset> = {
  corto: {
    kind: 'corto',
    title: 'Simulacro corto',
    description: '12 preguntas de práctica · 20 minutos sugeridos',
    questionsPerCategory: 2,
    defaultMinutes: 20,
  },
  completo: {
    kind: 'completo',
    title: 'Simulacro completo',
    description: '30 preguntas de práctica · hasta 90 minutos',
    questionsPerCategory: 5,
    defaultMinutes: 90,
  },
  diagnostico: {
    kind: 'diagnostico',
    title: 'Diagnóstico inicial',
    description: 'Preguntas breves para saber por dónde empezar. Sin límite de tiempo.',
    questionsPerCategory: 2,
    defaultMinutes: null,
  },
};

/** Generador pseudoaleatorio reproducible (mulberry32). */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: T[], random: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

/**
 * Selecciona preguntas para un simulacro: el mismo número por categoría,
 * ordenadas de menor a mayor dificultad. El diagnóstico usa las preguntas
 * marcadas para ello.
 */
export function pickExamQuestions(
  bank: Question[],
  kind: ExamKind,
  random: () => number = Math.random,
): Question[] {
  const preset = EXAM_PRESETS[kind];
  if (kind === 'diagnostico') {
    return bank
      .filter((q) => q.inDiagnostic)
      .sort((a, b) => a.difficulty - b.difficulty || a.id.localeCompare(b.id));
  }
  const selected: Question[] = [];
  for (const category of CATEGORY_IDS) {
    const pool = shuffle(
      bank.filter((q) => q.category === category),
      random,
    );
    selected.push(...pool.slice(0, preset.questionsPerCategory));
  }
  return selected.sort((a, b) => a.difficulty - b.difficulty || a.category.localeCompare(b.category));
}

export function categoriesInOrder(items: { category: CategoryId }[]): CategoryId[] {
  return CATEGORY_IDS.filter((c) => items.some((i) => i.category === c));
}
