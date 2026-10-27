import type { ActivityType, Question } from '@/core/types';
import { getDueReviewQuestions, getFailedQuestions, getRecommendedChallenge, getRecommendedDifficulty } from './progress';
import { getModule, queryQuestions } from './questions';
import type { Db } from './types';

export type PracticeMode = 'leccion' | 'modulo' | 'fallados' | 'repaso' | 'reto';

export const ACTIVITY: Record<PracticeMode, ActivityType> = {
  leccion: 'leccion',
  modulo: 'practica',
  fallados: 'repaso',
  repaso: 'repaso',
  reto: 'reto',
};

export const PRACTICE_TITLES: Record<PracticeMode, string> = {
  leccion: 'Práctica de la lección',
  modulo: 'Práctica del módulo',
  fallados: 'Repetir fallados',
  repaso: 'Repaso de errores',
  reto: 'Reto recomendado',
};

export async function loadPracticeQuestions(db: Db, mode: PracticeMode, id?: string): Promise<Question[]> {
  switch (mode) {
    case 'leccion':
      return queryQuestions(db, 'q.lesson_id = ?', [id ?? '']);
    case 'modulo': {
      const module = await getModule(db, id ?? '');
      if (!module) return [];
      const level = await getRecommendedDifficulty(db, module.category);
      // Primero los no resueltos y cercanos al nivel recomendado: la dificultad sube con el desempeño.
      const list = await queryQuestions(
        db,
        'q.module_id = ?',
        [module.id],
        `(SELECT COUNT(*) FROM attempts a WHERE a.question_id = q.id AND a.result = 'correcta') > 0,
         ABS(q.difficulty - ${level}), q.difficulty, q.id`,
      );
      return list.slice(0, 8).sort((a, b) => a.difficulty - b.difficulty);
    }
    case 'fallados':
      return getFailedQuestions(db, id);
    case 'repaso':
      return getDueReviewQuestions(db, new Date());
    case 'reto':
      return (await getRecommendedChallenge(db))?.questions ?? [];
  }
}

