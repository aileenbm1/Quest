import { CATEGORY_IDS, type CategoryId, type GradeResult } from './types';

export interface ScoredItem {
  category: CategoryId;
  result: GradeResult;
}

export interface CategoryScore {
  correct: number;
  /** Preguntas calificables automáticamente en la categoría. */
  gradable: number;
  /** Preguntas mostradas (incluye las de revisión manual). */
  total: number;
  percent: number;
}

export interface ScoreSummary {
  score: number;
  maxScore: number;
  percent: number;
  correct: number;
  incorrect: number;
  empty: number;
  unverifiable: number;
  byCategory: Partial<Record<CategoryId, CategoryScore>>;
}

/**
 * Criterio de práctica, transparente y NO oficial:
 * - 1 punto por respuesta correcta.
 * - 0 puntos por respuesta incorrecta o vacía (no hay penalización).
 * - Las preguntas sin validación automática fiable no suman ni restan y no
 *   cuentan en el puntaje máximo; se muestran para revisión manual.
 */
export const SCORING_RULES = [
  '1 punto por cada respuesta correcta.',
  '0 puntos por respuesta incorrecta o sin contestar (no se restan puntos).',
  'Las preguntas abiertas sin validación automática no cuentan en el puntaje: compáralas tú con la solución de referencia.',
  'Este criterio es de práctica. No reproduce la calificación oficial de la OIEG.',
];

export function computeScore(items: ScoredItem[]): ScoreSummary {
  const summary: ScoreSummary = {
    score: 0,
    maxScore: 0,
    percent: 0,
    correct: 0,
    incorrect: 0,
    empty: 0,
    unverifiable: 0,
    byCategory: {},
  };
  for (const item of items) {
    const cat = (summary.byCategory[item.category] ??= { correct: 0, gradable: 0, total: 0, percent: 0 });
    cat.total += 1;
    switch (item.result) {
      case 'correcta':
        summary.correct += 1;
        summary.score += 1;
        summary.maxScore += 1;
        cat.correct += 1;
        cat.gradable += 1;
        break;
      case 'incorrecta':
        summary.incorrect += 1;
        summary.maxScore += 1;
        cat.gradable += 1;
        break;
      case 'vacia':
        summary.empty += 1;
        summary.maxScore += 1;
        cat.gradable += 1;
        break;
      case 'no_verificable':
        summary.unverifiable += 1;
        break;
    }
  }
  summary.percent = summary.maxScore === 0 ? 0 : Math.round((summary.score / summary.maxScore) * 100);
  for (const id of CATEGORY_IDS) {
    const cat = summary.byCategory[id];
    if (cat) cat.percent = cat.gradable === 0 ? 0 : Math.round((cat.correct / cat.gradable) * 100);
  }
  return summary;
}

/** Categorías que conviene reforzar, de menor a mayor porcentaje. */
export function weakCategories(summary: ScoreSummary, threshold = 60): CategoryId[] {
  return (Object.entries(summary.byCategory) as [CategoryId, CategoryScore][])
    .filter(([, c]) => c.gradable > 0 && c.percent < threshold)
    .sort((a, b) => a[1].percent - b[1].percent)
    .map(([id]) => id);
}
