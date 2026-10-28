import { buildModulePath, type PathStep } from '@/core/path';
import { queryQuestions } from './questions';
import type { Db } from './types';

/** Camino de niveles de un módulo según los ejercicios que el estudiante ya resolvió bien. */
export async function getModulePath(db: Db, moduleId: string): Promise<PathStep[]> {
  const questions = await queryQuestions(db, 'q.module_id = ?', [moduleId]);
  const rows = await db.getAllAsync<{ question_id: string }>(
    `SELECT DISTINCT a.question_id FROM attempts a JOIN questions q ON q.id = a.question_id
     WHERE q.module_id = ? AND a.result = 'correcta'`,
    [moduleId],
  );
  return buildModulePath(questions, new Set(rows.map((r) => r.question_id)));
}
