/**
 * @jest-environment node
 */
import { seededRandom } from '@/core/exam';
import { canonicalResponse } from '@/core/grading';
import { finalizeExam, getExamWithQuestions, getRecentExamQuestionIds, saveExamAnswer, startExam } from '@/db/exams';
import { initDatabase } from '@/db/init';
import { getModulePath } from '@/db/path';
import { loadPracticeQuestions } from '@/db/practice';
import { recordAttempt } from '@/db/progress';
import { openNodeDb } from '../../test-utils/nodeDb';

const NOW = new Date('2026-10-28T15:00:00');

async function freshDb() {
  const db = openNodeDb();
  await initDatabase(db, { now: NOW });
  return db;
}

describe('camino de niveles en la base de datos', () => {
  it('el nivel 1 se abre al resolver bien el nivel 0, y antes no se puede practicar', async () => {
    const db = await freshDb();
    expect(await loadPracticeQuestions(db, 'nivel', 'm1-patrones', 1)).toEqual([]);

    const level0 = await loadPracticeQuestions(db, 'nivel', 'm1-patrones', 0);
    expect(level0.map((q) => q.id)).toEqual(['ini-pat-1', 'ini-pat-2', 'ini-pat-3', 'ini-pat-4']);
    expect(level0.every((q) => q.starter)).toBe(true);

    for (const q of level0.slice(0, 3)) {
      await recordAttempt(db, { question: q, activityType: 'practica', response: canonicalResponse(q.answer), result: 'correcta', timeMs: 1000 }, NOW);
    }
    const path = await getModulePath(db, 'm1-patrones');
    expect(path.slice(0, 3).map((s) => s.status)).toEqual(['completado', 'abierto', 'bloqueado']);

    const level1 = await loadPracticeQuestions(db, 'nivel', 'm1-patrones', 1);
    expect(level1.length).toBeGreaterThan(0);
    expect(level1.every((q) => q.difficulty === 1 && !q.starter)).toBe(true);
    db.close();
  });
});

describe('simulacros con variantes guardadas', () => {
  it('dos simulacros cortos seguidos no repiten preguntas', async () => {
    const db = await freshDb();
    const first = await startExam(db, 'corto', 1200, NOW, seededRandom(1));
    await finalizeExam(db, first, NOW);
    const second = await startExam(db, 'corto', 1200, new Date(NOW.getTime() + 60_000), seededRandom(1));
    const [ids2, ids1] = await getRecentExamQuestionIds(db, 'corto', 2);
    expect(ids2).toHaveLength(12);
    expect(ids2!.filter((id) => ids1!.includes(id))).toEqual([]);
    expect(second).not.toBe(first);
    db.close();
  });

  it('la variante que se vio es la misma al retomar y al calificar', async () => {
    const db = await freshDb();
    const id = await startExam(db, 'completo', 5400, NOW, seededRandom(9));
    const shown = (await getExamWithQuestions(db, id))!;
    const again = (await getExamWithQuestions(db, id))!;
    expect(again.questions).toEqual(shown.questions);
    for (const [i, q] of shown.questions.entries()) {
      const r = canonicalResponse(q.answer);
      if (r !== null) await saveExamAnswer(db, id, i, r, NOW);
    }
    const done = await finalizeExam(db, id, NOW);
    const verifiable = shown.questions.filter((q) => q.verification === 'verificada' && canonicalResponse(q.answer) !== null).length;
    expect(done.score).toBe(verifiable);
    db.close();
  });
});
