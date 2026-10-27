import { addDays, toLocalDay } from '@/core/dates';
import {
  computeStreak,
  levelForXp,
  recommendedDifficulty,
  reviewIntervalDays,
  REVIEW_INTERVALS,
  xpForAttempt,
  type LevelInfo,
} from '@/core/progression';
import type { ActivityType, CategoryId, GradeResult, Question } from '@/core/types';
import { queryQuestions } from './questions';
import type { Db } from './types';

export interface AttemptInput {
  question: Pick<Question, 'id' | 'difficulty'>;
  activityType: ActivityType;
  activityRef?: string | null;
  response: string | null;
  result: GradeResult;
  timeMs: number;
}

/**
 * Guarda un intento y actualiza la cola de repaso:
 * - Un error programa la pregunta para repasarla mañana.
 * - Un acierto en modo repaso alarga el intervalo; tras varios aciertos sale de la cola.
 */
export async function recordAttempt(db: Db, input: AttemptInput, now: Date = new Date()): Promise<number> {
  let id = 0;
  await db.withTransactionAsync(async () => {
    id = await insertAttempt(db, input, now);
  });
  return id;
}

/** Igual que recordAttempt, pero sin abrir transacción (para usarla dentro de otra). */
export async function insertAttempt(db: Db, input: AttemptInput, now: Date = new Date()): Promise<number> {
  const xp = xpForAttempt(input.result, input.question.difficulty);
  const res = await db.runAsync(
    `INSERT INTO attempts (question_id, activity_type, activity_ref, response, result, time_ms, xp, created_at, day)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.question.id,
      input.activityType,
      input.activityRef ?? null,
      input.response,
      input.result,
      Math.max(0, Math.round(input.timeMs)),
      xp,
      now.toISOString(),
      toLocalDay(now),
    ],
  );
  await updateReviewQueue(db, input.question.id, input.result, input.activityType, now);
  return res.lastInsertRowId;
}

async function updateReviewQueue(db: Db, questionId: string, result: GradeResult, activity: ActivityType, now: Date) {
  const today = toLocalDay(now);
  if (result === 'incorrecta' || result === 'vacia') {
    await db.runAsync(
      `INSERT INTO review_queue (question_id, due_day, step, times_failed, last_failed_at)
       VALUES (?, ?, 0, 1, ?)
       ON CONFLICT(question_id) DO UPDATE SET due_day = excluded.due_day, step = 0,
         times_failed = review_queue.times_failed + 1, last_failed_at = excluded.last_failed_at`,
      [questionId, addDays(today, reviewIntervalDays(0)), now.toISOString()],
    );
    return;
  }
  if (result === 'correcta' && activity === 'repaso') {
    const row = await db.getFirstAsync<{ step: number }>('SELECT step FROM review_queue WHERE question_id = ?', [questionId]);
    if (!row) return;
    const next = row.step + 1;
    if (next >= REVIEW_INTERVALS.length - 1) {
      await db.runAsync('DELETE FROM review_queue WHERE question_id = ?', [questionId]);
    } else {
      await db.runAsync('UPDATE review_queue SET step = ?, due_day = ? WHERE question_id = ?', [
        next,
        addDays(today, reviewIntervalDays(next)),
        questionId,
      ]);
    }
  }
}

export async function getDueReviewQuestions(db: Db, now: Date = new Date(), limit = 10): Promise<Question[]> {
  return queryQuestions(
    db,
    'q.id IN (SELECT question_id FROM review_queue WHERE due_day <= ?)',
    [toLocalDay(now)],
    'q.difficulty, q.id',
  ).then((list) => list.slice(0, limit));
}

export async function countDueReviews(db: Db, now: Date = new Date()): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM review_queue WHERE due_day <= ?', [
    toLocalDay(now),
  ]);
  return row?.n ?? 0;
}

/** Preguntas cuyo último intento fue incorrecto o vacío (para «repetir fallados»). */
export async function getFailedQuestions(db: Db, moduleId?: string): Promise<Question[]> {
  const where = `q.id IN (
      SELECT a.question_id FROM attempts a
      WHERE a.id = (SELECT MAX(a2.id) FROM attempts a2 WHERE a2.question_id = a.question_id)
        AND a.result IN ('incorrecta', 'vacia')
    )${moduleId ? ' AND q.module_id = ?' : ''}`;
  return queryQuestions(db, where, moduleId ? [moduleId] : []);
}

export async function markLessonProgress(
  db: Db,
  lessonId: string,
  correct: number,
  total: number,
  now: Date = new Date(),
): Promise<void> {
  // La lección se completa al terminar su práctica, sin importar la calificación.
  await db.runAsync(
    `INSERT INTO lesson_progress (lesson_id, status, best_correct, best_total, completed_at, updated_at)
     VALUES (?, 'completada', ?, ?, ?, ?)
     ON CONFLICT(lesson_id) DO UPDATE SET status = 'completada',
       best_correct = MAX(lesson_progress.best_correct, excluded.best_correct),
       best_total = excluded.best_total,
       completed_at = COALESCE(lesson_progress.completed_at, excluded.completed_at),
       updated_at = excluded.updated_at`,
    [lessonId, correct, total, now.toISOString(), now.toISOString()],
  );
}

export async function getLessonProgressMap(db: Db): Promise<Map<string, { status: string; bestCorrect: number; bestTotal: number }>> {
  const rows = await db.getAllAsync<{ lesson_id: string; status: string; best_correct: number; best_total: number }>(
    'SELECT lesson_id, status, best_correct, best_total FROM lesson_progress',
  );
  return new Map(rows.map((r) => [r.lesson_id, { status: r.status, bestCorrect: r.best_correct, bestTotal: r.best_total }]));
}

export interface ModuleProgress {
  moduleId: string;
  totalQuestions: number;
  solved: number;
  attempts: number;
  correctAttempts: number;
  accuracy: number;
  lessonsTotal: number;
  lessonsDone: number;
  /** 0..1: ejercicios distintos resueltos correctamente. */
  progress: number;
}

export async function getModuleProgress(db: Db): Promise<ModuleProgress[]> {
  const rows = await db.getAllAsync<{
    module_id: string;
    total_questions: number;
    solved: number;
    attempts: number;
    correct_attempts: number;
    lessons_total: number;
    lessons_done: number;
  }>(
    `SELECT m.id AS module_id,
       (SELECT COUNT(*) FROM questions q WHERE q.module_id = m.id AND q.active = 1) AS total_questions,
       (SELECT COUNT(DISTINCT a.question_id) FROM attempts a JOIN questions q ON q.id = a.question_id
          WHERE q.module_id = m.id AND a.result = 'correcta') AS solved,
       (SELECT COUNT(*) FROM attempts a JOIN questions q ON q.id = a.question_id
          WHERE q.module_id = m.id AND a.result IN ('correcta', 'incorrecta', 'vacia')) AS attempts,
       (SELECT COUNT(*) FROM attempts a JOIN questions q ON q.id = a.question_id
          WHERE q.module_id = m.id AND a.result = 'correcta') AS correct_attempts,
       (SELECT COUNT(*) FROM lessons l WHERE l.module_id = m.id) AS lessons_total,
       (SELECT COUNT(*) FROM lesson_progress lp JOIN lessons l ON l.id = lp.lesson_id
          WHERE l.module_id = m.id AND lp.status = 'completada') AS lessons_done
     FROM modules m ORDER BY m.position`,
  );
  return rows.map((r) => ({
    moduleId: r.module_id,
    totalQuestions: r.total_questions,
    solved: r.solved,
    attempts: r.attempts,
    correctAttempts: r.correct_attempts,
    accuracy: r.attempts === 0 ? 0 : Math.round((r.correct_attempts / r.attempts) * 100),
    lessonsTotal: r.lessons_total,
    lessonsDone: r.lessons_done,
    progress: r.total_questions === 0 ? 0 : r.solved / r.total_questions,
  }));
}

export interface Overview {
  xp: number;
  level: LevelInfo;
  streak: number;
  totalAttempts: number;
  correctAttempts: number;
  accuracy: number;
  solvedQuestions: number;
  totalQuestions: number;
  globalProgress: number;
  lessonsDone: number;
  practicedToday: boolean;
}

export async function getOverview(db: Db, now: Date = new Date()): Promise<Overview> {
  const totals = await db.getFirstAsync<{ xp: number | null; total: number; correct: number | null }>(
    `SELECT SUM(xp) AS xp,
       SUM(result IN ('correcta', 'incorrecta', 'vacia')) AS total,
       SUM(result = 'correcta') AS correct
     FROM attempts`,
  );
  const solved = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(DISTINCT question_id) AS n FROM attempts WHERE result = 'correcta'`,
  );
  const questions = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM questions WHERE active = 1');
  const lessons = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM lesson_progress WHERE status = 'completada'`,
  );
  const days = await db.getAllAsync<{ day: string }>('SELECT DISTINCT day FROM attempts');
  const today = toLocalDay(now);
  const xp = totals?.xp ?? 0;
  const total = totals?.total ?? 0;
  const correct = totals?.correct ?? 0;
  const totalQuestions = questions?.n ?? 0;
  const solvedQuestions = solved?.n ?? 0;
  return {
    xp,
    level: levelForXp(xp),
    streak: computeStreak(
      days.map((d) => d.day),
      today,
    ),
    totalAttempts: total,
    correctAttempts: correct,
    accuracy: total === 0 ? 0 : Math.round((correct / total) * 100),
    solvedQuestions,
    totalQuestions,
    globalProgress: totalQuestions === 0 ? 0 : solvedQuestions / totalQuestions,
    lessonsDone: lessons?.n ?? 0,
    practicedToday: days.some((d) => d.day === today),
  };
}

export interface DailyStat {
  day: string;
  attempts: number;
  correct: number;
}

/** Evolución por sesión de práctica (un día = una sesión). */
export async function getDailyStats(db: Db, limit = 14): Promise<DailyStat[]> {
  const rows = await db.getAllAsync<{ day: string; attempts: number; correct: number }>(
    `SELECT day, COUNT(*) AS attempts, SUM(result = 'correcta') AS correct
     FROM attempts WHERE result IN ('correcta', 'incorrecta', 'vacia')
     GROUP BY day ORDER BY day DESC LIMIT ?`,
    [limit],
  );
  return rows.reverse();
}

export interface CategoryStat {
  category: CategoryId;
  attempts: number;
  correct: number;
  accuracy: number;
}

export async function getCategoryStats(db: Db): Promise<CategoryStat[]> {
  const rows = await db.getAllAsync<{ category: string; attempts: number; correct: number }>(
    `SELECT q.category AS category, COUNT(*) AS attempts, SUM(a.result = 'correcta') AS correct
     FROM attempts a JOIN questions q ON q.id = a.question_id
     WHERE a.result IN ('correcta', 'incorrecta', 'vacia')
     GROUP BY q.category`,
  );
  return rows.map((r) => ({
    category: r.category as CategoryId,
    attempts: r.attempts,
    correct: r.correct,
    accuracy: r.attempts === 0 ? 0 : Math.round((r.correct / r.attempts) * 100),
  }));
}

/** Temas que necesitan refuerzo: al menos 3 intentos y menos de 60 % de aciertos. */
export async function getWeakCategories(db: Db): Promise<CategoryStat[]> {
  const stats = await getCategoryStats(db);
  return stats.filter((s) => s.attempts >= 3 && s.accuracy < 60).sort((a, b) => a.accuracy - b.accuracy);
}

export interface FrequentError {
  questionId: string;
  prompt: string;
  category: CategoryId;
  errors: number;
}

export async function getFrequentErrors(db: Db, limit = 5): Promise<FrequentError[]> {
  const rows = await db.getAllAsync<{ question_id: string; prompt: string; category: string; errors: number }>(
    `SELECT a.question_id, q.prompt, q.category, COUNT(*) AS errors
     FROM attempts a JOIN questions q ON q.id = a.question_id
     WHERE a.result IN ('incorrecta', 'vacia')
     GROUP BY a.question_id ORDER BY errors DESC, a.question_id LIMIT ?`,
    [limit],
  );
  return rows.map((r) => ({ questionId: r.question_id, prompt: r.prompt, category: r.category as CategoryId, errors: r.errors }));
}

async function recentByCategory(db: Db, category: CategoryId) {
  const rows = await db.getAllAsync<{ difficulty: number; result: string }>(
    `SELECT q.difficulty, a.result FROM attempts a JOIN questions q ON q.id = a.question_id
     WHERE q.category = ? AND a.result IN ('correcta', 'incorrecta', 'vacia')
     ORDER BY a.id DESC LIMIT 30`,
    [category],
  );
  return rows.map((r) => ({ difficulty: r.difficulty, correct: r.result === 'correcta' }));
}

export async function getRecommendedDifficulty(db: Db, category: CategoryId): Promise<number> {
  return recommendedDifficulty(await recentByCategory(db, category));
}

export interface Recommendation {
  category: CategoryId;
  moduleId: string;
  difficulty: number;
  questions: Question[];
}

/**
 * Reto recomendado: elige la categoría más débil (o la menos practicada),
 * calcula la dificultad adecuada y prioriza ejercicios aún no resueltos.
 */
export async function getRecommendedChallenge(db: Db, size = 5): Promise<Recommendation | null> {
  const stats = await getCategoryStats(db);
  const modules = await db.getAllAsync<{ id: string; category: string }>('SELECT id, category FROM modules ORDER BY position');
  if (modules.length === 0) return null;
  const scored = modules.map((m) => {
    const s = stats.find((x) => x.category === m.category);
    // Sin intentos = prioridad alta; luego menor precisión.
    const score = s ? (s.attempts < 3 ? -1 : s.accuracy) : -2;
    return { module: m, score };
  });
  scored.sort((a, b) => a.score - b.score);
  const target = scored[0]!.module;
  const category = target.category as CategoryId;
  const difficulty = await getRecommendedDifficulty(db, category);
  const pool = await queryQuestions(
    db,
    'q.category = ? AND q.answer_json NOT LIKE \'%"reference"%\'',
    [category],
    `(SELECT COUNT(*) FROM attempts a WHERE a.question_id = q.id AND a.result = 'correcta'), ABS(q.difficulty - ${difficulty}), q.difficulty, q.id`,
  );
  return { category, moduleId: target.id, difficulty, questions: pool.slice(0, size) };
}

/** Borra todo el progreso local, conservando el contenido y las preferencias. */
export async function resetProgress(db: Db): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM exam_answers');
    await db.runAsync('DELETE FROM exam_sessions');
    await db.runAsync('DELETE FROM attempts');
    await db.runAsync('DELETE FROM lesson_progress');
    await db.runAsync('DELETE FROM review_queue');
    await db.runAsync('DELETE FROM training_plan');
    await db.runAsync('UPDATE achievements SET unlocked_at = NULL');
    await db.runAsync(`DELETE FROM app_settings WHERE key IN ('last_activity')`);
  });
}
