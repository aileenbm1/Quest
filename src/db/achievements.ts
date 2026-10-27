import { computeStreak } from '@/core/progression';
import { toLocalDay } from '@/core/dates';
import type { Db } from './types';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: string | null;
}

export async function getAchievements(db: Db): Promise<Achievement[]> {
  const rows = await db.getAllAsync<{
    id: string;
    title: string;
    description: string;
    icon: string;
    unlocked_at: string | null;
  }>('SELECT id, title, description, icon, unlocked_at FROM achievements ORDER BY position');
  return rows.map((r) => ({ id: r.id, title: r.title, description: r.description, icon: r.icon, unlockedAt: r.unlocked_at }));
}

/** Revisa las condiciones de cada insignia y desbloquea las nuevas. */
export async function evaluateAchievements(db: Db, now: Date = new Date()): Promise<Achievement[]> {
  const n = async (sql: string, params: (string | number)[] = []) =>
    (await db.getFirstAsync<{ n: number | null }>(sql, params))?.n ?? 0;

  const attempts = await n('SELECT COUNT(*) AS n FROM attempts');
  const distinctCorrect = await n(`SELECT COUNT(DISTINCT question_id) AS n FROM attempts WHERE result = 'correcta'`);
  const lessons = await n(`SELECT COUNT(*) AS n FROM lesson_progress WHERE status = 'completada'`);
  const diagnostic = await n(`SELECT COUNT(*) AS n FROM exam_sessions WHERE kind = 'diagnostico' AND status != 'en_curso'`);
  const exams = await n(`SELECT COUNT(*) AS n FROM exam_sessions WHERE kind != 'diagnostico' AND status != 'en_curso'`);
  const fullExams = await n(`SELECT COUNT(*) AS n FROM exam_sessions WHERE kind = 'completo' AND status != 'en_curso'`);
  const fixedErrors = await n(
    `SELECT COUNT(*) AS n FROM attempts a WHERE a.result = 'correcta' AND EXISTS (
       SELECT 1 FROM attempts b WHERE b.question_id = a.question_id AND b.id < a.id AND b.result = 'incorrecta')`,
  );
  const masteredModules = await n(
    `SELECT COUNT(*) AS n FROM modules m WHERE
       (SELECT COUNT(*) FROM questions q WHERE q.module_id = m.id AND q.active = 1) > 0 AND
       (SELECT COUNT(DISTINCT a.question_id) FROM attempts a JOIN questions q ON q.id = a.question_id
          WHERE q.module_id = m.id AND a.result = 'correcta') * 100 >=
       80 * (SELECT COUNT(*) FROM questions q WHERE q.module_id = m.id AND q.active = 1)`,
  );
  const days = await db.getAllAsync<{ day: string }>('SELECT DISTINCT day FROM attempts');
  const streak = computeStreak(
    days.map((d) => d.day),
    toLocalDay(now),
  );

  const conditions: Record<string, boolean> = {
    'primer-paso': attempts > 0,
    diagnostico: diagnostic > 0,
    'diez-correctas': distinctCorrect >= 10,
    'treinta-correctas': distinctCorrect >= 30,
    'primera-leccion': lessons >= 1,
    'cinco-lecciones': lessons >= 5,
    'cazador-errores': fixedErrors > 0,
    'primer-simulacro': exams > 0,
    'simulacro-completo': fullExams > 0,
    'racha-3': streak >= 3,
    'racha-7': streak >= 7,
    'modulo-dominado': masteredModules > 0,
  };

  const all = await getAchievements(db);
  const unlocked: Achievement[] = [];
  for (const a of all) {
    if (!a.unlockedAt && conditions[a.id]) {
      await db.runAsync('UPDATE achievements SET unlocked_at = ? WHERE id = ? AND unlocked_at IS NULL', [
        now.toISOString(),
        a.id,
      ]);
      unlocked.push({ ...a, unlockedAt: now.toISOString() });
    }
  }
  return unlocked;
}
