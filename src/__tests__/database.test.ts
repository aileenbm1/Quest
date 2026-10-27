/** @jest-environment node */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ALL_QUESTIONS, CONTENT_VERSION } from '@/content';
import { evaluateAchievements, getAchievements } from '@/db/achievements';
import {
  createExamSession,
  expireOverdueExams,
  finalizeExam,
  getActiveExam,
  getExamAnswers,
  saveExamAnswer,
  startExam,
} from '@/db/exams';
import { initDatabase } from '@/db/init';
import { LATEST_SCHEMA_VERSION } from '@/db/migrations';
import { ensurePlan, setPlanItemDone } from '@/db/plan';
import {
  countDueReviews,
  getDueReviewQuestions,
  getFailedQuestions,
  getModuleProgress,
  getOverview,
  getRecommendedChallenge,
  markLessonProgress,
  recordAttempt,
  resetProgress,
} from '@/db/progress';
import { getAllQuestions, getContentStatus, getQuestionsByIds } from '@/db/questions';
import { BUNDLED_CONTENT, seedContent } from '@/db/seed';
import { getSetting, setSetting } from '@/db/settings';
import { seededRandom } from '@/core/exam';
import { openNodeDb, type TestDb } from '../../test-utils/nodeDb';

const NOW = new Date('2026-10-27T15:00:00');

async function freshDb(): Promise<TestDb> {
  const db = openNodeDb();
  await initDatabase(db, { now: NOW });
  return db;
}

describe('inicialización de la base de datos', () => {
  it('crea el esquema y carga el contenido', async () => {
    const db = openNodeDb();
    const result = await initDatabase(db, { now: NOW });
    expect(result.schemaVersion).toBe(LATEST_SCHEMA_VERSION);
    expect(result.migrationsApplied).toEqual([1, 2, 3, 4]);
    expect(result.contentSeeded).toBe(true);
    const status = await getContentStatus(db);
    expect(status.total).toBe(ALL_QUESTIONS.length);
    expect(status.modules).toBe(6);
    expect(await getSetting(db, 'content_version')).toBe(String(CONTENT_VERSION));
    db.close();
  });

  it('es idempotente: inicializar varias veces no duplica nada', async () => {
    const db = await freshDb();
    const again = await initDatabase(db, { now: NOW });
    expect(again.migrationsApplied).toEqual([]);
    expect(again.contentSeeded).toBe(false);
    await seedContent(db, BUNDLED_CONTENT, { force: true });
    await seedContent(db, BUNDLED_CONTENT, { force: true });
    const counts = await db.getFirstAsync<{ q: number; o: number; m: number }>(
      `SELECT (SELECT COUNT(*) FROM questions) AS q, (SELECT COUNT(*) FROM question_options) AS o,
              (SELECT COUNT(*) FROM schema_migrations) AS m`,
    );
    const expectedOptions = ALL_QUESTIONS.reduce((n, q) => n + (q.options?.length ?? 0), 0);
    expect(counts).toEqual({ q: ALL_QUESTIONS.length, o: expectedOptions, m: 4 });
    db.close();
  });

  it('impide preguntas duplicadas por id', async () => {
    const db = await freshDb();
    await expect(
      db.runAsync(
        `INSERT INTO questions (id, module_id, category, difficulty, type, prompt, answer_json, explanation, hints_json,
          estimated_seconds, source, verification_status, origin)
         VALUES ('pat-01', 'm1-patrones', 'patrones', 1, 'numerica', 'x', '{}', 'x', '[]', 10, 'x', 'verificada', 'original')`,
      ),
    ).rejects.toThrow();
    db.close();
  });

  it('actualizar el contenido conserva el progreso y desactiva preguntas retiradas', async () => {
    const db = await freshDb();
    const [q] = await getQuestionsByIds(db, ['pat-01']);
    await recordAttempt(db, { question: q!, activityType: 'practica', response: '10', result: 'correcta', timeMs: 1000 }, NOW);
    const nextBundle = {
      ...BUNDLED_CONTENT,
      version: CONTENT_VERSION + 1,
      questions: BUNDLED_CONTENT.questions.filter((x) => x.id !== 'pat-15'),
    };
    expect(await seedContent(db, nextBundle)).toBe(true);
    const all = await getAllQuestions(db);
    expect(all.some((x) => x.id === 'pat-15')).toBe(false);
    expect((await getOverview(db, NOW)).correctAttempts).toBe(1);
    db.close();
  });

  it('rechaza datos inválidos con restricciones', async () => {
    const db = await freshDb();
    await expect(
      db.runAsync(
        `INSERT INTO attempts (question_id, activity_type, result, created_at, day) VALUES ('pat-01', 'otro', 'correcta', 'x', 'x')`,
      ),
    ).rejects.toThrow();
    await expect(
      db.runAsync(
        `INSERT INTO attempts (question_id, activity_type, result, created_at, day) VALUES ('no-existe', 'practica', 'correcta', 'x', 'x')`,
      ),
    ).rejects.toThrow();
    db.close();
  });
});

describe('persistencia del progreso', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'oieg-'));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('recupera el progreso después de cerrar y volver a abrir la app', async () => {
    const file = join(dir, 'oieg-quest.db');
    let db = openNodeDb(file);
    await initDatabase(db, { now: NOW });
    const [q1, q2] = await getQuestionsByIds(db, ['pat-01', 'log-01']);
    await recordAttempt(db, { question: q1!, activityType: 'leccion', response: '10', result: 'correcta', timeMs: 5000 }, NOW);
    await recordAttempt(db, { question: q2!, activityType: 'leccion', response: 'f', result: 'incorrecta', timeMs: 3000 }, NOW);
    await markLessonProgress(db, 'l-pat-1', 1, 1, NOW);
    await setSetting(db, 'alias', 'Explorador');
    const examId = await startExam(db, 'corto', 20 * 60, NOW, seededRandom(1));
    await saveExamAnswer(db, examId, 0, '42', NOW);
    const before = await getOverview(db, NOW);
    db.close();

    // «Reinicio» de la app: nueva conexión al mismo archivo.
    db = openNodeDb(file);
    const init = await initDatabase(db, { now: new Date(NOW.getTime() + 60_000) });
    expect(init.migrationsApplied).toEqual([]);
    expect(init.contentSeeded).toBe(false);
    const after = await getOverview(db, NOW);
    expect(after).toEqual(before);
    expect(after.correctAttempts).toBe(1);
    expect(after.lessonsDone).toBe(1);
    expect(await getSetting(db, 'alias')).toBe('Explorador');
    expect((await getActiveExam(db))?.id).toBe(examId);
    expect((await getExamAnswers(db, examId))[0]?.response).toBe('42');
    db.close();
  });
});

describe('intentos, repaso y recomendaciones', () => {
  it('programa el repaso de un error y lo retira tras acertarlo varias veces', async () => {
    const db = await freshDb();
    const [q] = await getQuestionsByIds(db, ['mat-06']);
    await recordAttempt(db, { question: q!, activityType: 'practica', response: '3', result: 'incorrecta', timeMs: 1 }, NOW);
    expect(await countDueReviews(db, NOW)).toBe(0); // se repasa en una sesión futura
    const tomorrow = new Date(NOW.getTime() + 86_400_000);
    expect((await getDueReviewQuestions(db, tomorrow)).map((x) => x.id)).toEqual(['mat-06']);
    expect((await getFailedQuestions(db)).map((x) => x.id)).toEqual(['mat-06']);

    let day = tomorrow;
    for (let i = 0; i < 3; i++) {
      await recordAttempt(db, { question: q!, activityType: 'repaso', response: '2', result: 'correcta', timeMs: 1 }, day);
      day = new Date(day.getTime() + 10 * 86_400_000);
    }
    expect(await countDueReviews(db, day)).toBe(0);
    expect(await getFailedQuestions(db)).toEqual([]);
    db.close();
  });

  it('calcula el progreso por módulo', async () => {
    const db = await freshDb();
    const [q] = await getQuestionsByIds(db, ['pat-01']);
    await recordAttempt(db, { question: q!, activityType: 'practica', response: '10', result: 'correcta', timeMs: 1 }, NOW);
    await recordAttempt(db, { question: q!, activityType: 'practica', response: '10', result: 'correcta', timeMs: 1 }, NOW);
    const m1 = (await getModuleProgress(db)).find((m) => m.moduleId === 'm1-patrones')!;
    expect(m1.solved).toBe(1);
    expect(m1.attempts).toBe(2);
    expect(m1.totalQuestions).toBe(15);
    db.close();
  });

  it('recomienda un reto sin preguntas abiertas de referencia', async () => {
    const db = await freshDb();
    const rec = await getRecommendedChallenge(db);
    expect(rec?.questions.length).toBe(5);
    expect(rec?.questions.every((q) => q.answer.kind !== 'reference')).toBe(true);
    db.close();
  });

  it('reinicia el progreso sin borrar el contenido ni el alias', async () => {
    const db = await freshDb();
    await setSetting(db, 'alias', 'Robo');
    const [q] = await getQuestionsByIds(db, ['pat-01']);
    await recordAttempt(db, { question: q!, activityType: 'practica', response: '10', result: 'correcta', timeMs: 1 }, NOW);
    await evaluateAchievements(db, NOW);
    await ensurePlan(db, NOW);
    await resetProgress(db);
    const o = await getOverview(db, NOW);
    expect(o.totalAttempts).toBe(0);
    expect(o.xp).toBe(0);
    expect((await getAchievements(db)).every((a) => a.unlockedAt === null)).toBe(true);
    expect((await getContentStatus(db)).total).toBe(ALL_QUESTIONS.length);
    expect(await getSetting(db, 'alias')).toBe('Robo');
    db.close();
  });
});

describe('simulador de examen', () => {
  it('guarda respuestas, finaliza y califica con desglose por categoría', async () => {
    const db = await freshDb();
    const questions = await getQuestionsByIds(db, ['pat-01', 'log-01', 'mix-09', 'mat-06']);
    const id = await createExamSession(db, 'corto', questions, 20 * 60, NOW);
    await saveExamAnswer(db, id, 0, '10', NOW); // correcta
    await saveExamAnswer(db, id, 1, 'f', NOW); // incorrecta
    await saveExamAnswer(db, id, 2, 'Lleno la de 5…', NOW); // abierta: no verificable
    // posición 3 sin respuesta → vacía
    const done = await finalizeExam(db, id, new Date(NOW.getTime() + 5 * 60_000));
    expect(done.status).toBe('finalizado');
    expect(done.score).toBe(1);
    expect(done.maxScore).toBe(3);
    expect(done.breakdown?.unverifiable).toBe(1);
    expect(done.breakdown?.empty).toBe(1);
    expect(done.breakdown?.byCategory.patrones?.correct).toBe(1);
    const answers = await getExamAnswers(db, id);
    expect(answers.map((a) => a.result)).toEqual(['correcta', 'incorrecta', 'no_verificable', 'vacia']);
    // Los resultados del simulacro cuentan como intentos.
    expect((await getOverview(db, NOW)).totalAttempts).toBe(3);
    db.close();
  });

  it('finalizar dos veces no duplica intentos y bloquea cambios posteriores', async () => {
    const db = await freshDb();
    const id = await startExam(db, 'corto', 600, NOW, seededRandom(7));
    await saveExamAnswer(db, id, 0, '1', NOW);
    await finalizeExam(db, id, NOW);
    const count = (await getOverview(db, NOW)).totalAttempts;
    await finalizeExam(db, id, NOW);
    expect((await getOverview(db, NOW)).totalAttempts).toBe(count);
    expect(await saveExamAnswer(db, id, 1, '5', NOW)).toBe(false);
    db.close();
  });

  it('envía automáticamente el examen cuando se agota el tiempo', async () => {
    const db = await freshDb();
    const id = await startExam(db, 'corto', 60, NOW, seededRandom(3));
    await saveExamAnswer(db, id, 0, '7', NOW);
    expect(await expireOverdueExams(db, new Date(NOW.getTime() + 59_000))).toEqual([]);
    expect(await expireOverdueExams(db, new Date(NOW.getTime() + 61_000))).toEqual([id]);
    expect(await getActiveExam(db)).toBeNull();
    const answers = await getExamAnswers(db, id);
    expect(answers[0]?.response).toBe('7');
    expect(answers.every((a) => a.result !== null)).toBe(true);
    // initDatabase también cierra exámenes vencidos al abrir la app.
    const id2 = await startExam(db, 'completo', 90 * 60, NOW, seededRandom(4));
    const init = await initDatabase(db, { now: new Date(NOW.getTime() + 91 * 60_000) });
    expect(init.expiredExams).toEqual([id2]);
    db.close();
  });

  it('el simulacro completo tiene 30 preguntas equilibradas y el corto 12', async () => {
    const db = await freshDb();
    const full = await startExam(db, 'completo', 5400, NOW, seededRandom(11));
    expect((await getExamAnswers(db, full)).length).toBe(30);
    const short = await startExam(db, 'corto', 1200, NOW, seededRandom(12));
    expect((await getExamAnswers(db, short)).length).toBe(12);
    const diag = await startExam(db, 'diagnostico', null, NOW);
    expect((await getExamAnswers(db, diag)).length).toBe(12);
    db.close();
  });
});

describe('insignias y plan', () => {
  it('desbloquea insignias una sola vez', async () => {
    const db = await freshDb();
    const [q] = await getQuestionsByIds(db, ['pat-01']);
    await recordAttempt(db, { question: q!, activityType: 'practica', response: '9', result: 'incorrecta', timeMs: 1 }, NOW);
    await recordAttempt(db, { question: q!, activityType: 'practica', response: '10', result: 'correcta', timeMs: 1 }, NOW);
    const first = await evaluateAchievements(db, NOW);
    expect(first.map((a) => a.id).sort()).toEqual(['cazador-errores', 'primer-paso']);
    expect(await evaluateAchievements(db, NOW)).toEqual([]);
    db.close();
  });

  it('genera un plan editable que persiste', async () => {
    const db = await freshDb();
    const plan = await ensurePlan(db, NOW);
    expect(plan.length).toBeGreaterThan(10);
    await setPlanItemDone(db, plan[0]!.id, true);
    const again = await ensurePlan(db, NOW);
    expect(again[0]?.done).toBe(true);
    db.close();
  });
});
