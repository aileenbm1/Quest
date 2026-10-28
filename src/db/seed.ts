import { ACHIEVEMENTS } from '@/content/achievements';
import { ALL_QUESTIONS, CONTENT_VERSION, LESSONS, MODULES } from '@/content';
import type { Lesson, Module, Question } from '@/core/types';
import { getSetting, setSetting } from './settings';
import type { Db } from './types';

export interface ContentBundle {
  version: number;
  modules: Module[];
  lessons: Lesson[];
  questions: Question[];
}

export const BUNDLED_CONTENT: ContentBundle = {
  version: CONTENT_VERSION,
  modules: MODULES,
  lessons: LESSONS,
  questions: ALL_QUESTIONS,
};

/**
 * Inserta o actualiza el contenido empaquetado. Usa UPSERT por id, así que
 * ejecutarlo varias veces nunca duplica preguntas, y conserva el progreso
 * del estudiante. Las preguntas retiradas se desactivan (no se borran)
 * para no romper el historial de intentos.
 */
export async function seedContent(
  db: Db,
  bundle: ContentBundle = BUNDLED_CONTENT,
  options: { force?: boolean } = {},
): Promise<boolean> {
  const current = await getSetting(db, 'content_version');
  if (!options.force && current === String(bundle.version)) return false;

  await db.withTransactionAsync(async () => {
    for (const m of bundle.modules) {
      await db.runAsync(
        `INSERT INTO modules (id, position, title, subtitle, description, icon, color, category)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET position = excluded.position, title = excluded.title,
           subtitle = excluded.subtitle, description = excluded.description, icon = excluded.icon,
           color = excluded.color, category = excluded.category`,
        [m.id, m.position, m.title, m.subtitle, m.description, m.icon, m.color, m.category],
      );
    }
    for (const l of bundle.lessons) {
      await db.runAsync(
        `INSERT INTO lessons (id, module_id, position, title, level, intro, key_idea, example_problem, example_solution_json, tips_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET module_id = excluded.module_id, position = excluded.position,
           title = excluded.title, level = excluded.level, intro = excluded.intro, key_idea = excluded.key_idea,
           example_problem = excluded.example_problem, example_solution_json = excluded.example_solution_json,
           tips_json = excluded.tips_json`,
        [
          l.id,
          l.moduleId,
          l.position,
          l.title,
          l.level,
          l.intro,
          l.keyIdea,
          l.exampleProblem,
          JSON.stringify(l.exampleSolution),
          JSON.stringify(l.tips),
        ],
      );
    }
    await db.runAsync('UPDATE questions SET active = 0');
    for (const q of bundle.questions) {
      await db.runAsync(
        `INSERT INTO questions (id, module_id, lesson_id, category, difficulty, type, prompt, data_json, answer_json,
           explanation, hints_json, estimated_seconds, source, verification_status, origin, in_diagnostic, starter, active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
         ON CONFLICT(id) DO UPDATE SET module_id = excluded.module_id, lesson_id = excluded.lesson_id,
           category = excluded.category, difficulty = excluded.difficulty, type = excluded.type,
           prompt = excluded.prompt, data_json = excluded.data_json, answer_json = excluded.answer_json,
           explanation = excluded.explanation, hints_json = excluded.hints_json,
           estimated_seconds = excluded.estimated_seconds, source = excluded.source,
           verification_status = excluded.verification_status, origin = excluded.origin,
           in_diagnostic = excluded.in_diagnostic, starter = excluded.starter, active = 1`,
        [
          q.id,
          q.moduleId,
          q.lessonId,
          q.category,
          q.difficulty,
          q.type,
          q.prompt,
          q.data ? JSON.stringify(q.data) : null,
          JSON.stringify(q.answer),
          q.explanation,
          JSON.stringify(q.hints),
          q.estimatedSeconds,
          q.source,
          q.verification,
          q.origin,
          q.inDiagnostic ? 1 : 0,
          q.starter ? 1 : 0,
        ],
      );
      await db.runAsync('DELETE FROM question_options WHERE question_id = ?', [q.id]);
      for (const [position, option] of (q.options ?? []).entries()) {
        await db.runAsync(
          'INSERT INTO question_options (question_id, option_key, label, position) VALUES (?, ?, ?, ?)',
          [q.id, option.key, option.label, position],
        );
      }
    }
    for (const [position, a] of ACHIEVEMENTS.entries()) {
      await db.runAsync(
        `INSERT INTO achievements (id, title, description, icon, position) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET title = excluded.title, description = excluded.description,
           icon = excluded.icon, position = excluded.position`,
        [a.id, a.title, a.description, a.icon, position],
      );
    }
    await setSetting(db, 'content_version', String(bundle.version));
  });
  return true;
}
