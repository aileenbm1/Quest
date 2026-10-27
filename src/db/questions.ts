import type { AnswerSpec, Lesson, Module, Question, QuestionData, QuestionOption } from '@/core/types';
import type { Db, SqlValue } from './types';

interface QuestionRow {
  id: string;
  module_id: string;
  lesson_id: string | null;
  category: string;
  difficulty: number;
  type: string;
  prompt: string;
  data_json: string | null;
  answer_json: string;
  explanation: string;
  hints_json: string;
  estimated_seconds: number;
  source: string;
  verification_status: string;
  origin: string;
  in_diagnostic: number;
}

interface OptionRow {
  question_id: string;
  option_key: string;
  label: string;
}

function rowToQuestion(row: QuestionRow, options: QuestionOption[]): Question {
  return {
    id: row.id,
    moduleId: row.module_id,
    lessonId: row.lesson_id,
    category: row.category as Question['category'],
    difficulty: row.difficulty as Question['difficulty'],
    type: row.type as Question['type'],
    prompt: row.prompt,
    data: row.data_json ? (JSON.parse(row.data_json) as QuestionData) : undefined,
    options: options.length > 0 ? options : undefined,
    answer: JSON.parse(row.answer_json) as AnswerSpec,
    explanation: row.explanation,
    hints: JSON.parse(row.hints_json) as string[],
    estimatedSeconds: row.estimated_seconds,
    source: row.source,
    verification: row.verification_status as Question['verification'],
    origin: row.origin as Question['origin'],
    inDiagnostic: row.in_diagnostic === 1,
  };
}

/** Carga preguntas activas con un filtro WHERE opcional. */
export async function queryQuestions(db: Db, where = '1 = 1', params: SqlValue[] = [], orderBy = 'q.difficulty, q.id'): Promise<Question[]> {
  const rows = await db.getAllAsync<QuestionRow>(
    `SELECT q.* FROM questions q WHERE q.active = 1 AND (${where}) ORDER BY ${orderBy}`,
    params,
  );
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const placeholders = ids.map(() => '?').join(', ');
  const optionRows = await db.getAllAsync<OptionRow>(
    `SELECT question_id, option_key, label FROM question_options WHERE question_id IN (${placeholders}) ORDER BY question_id, position`,
    ids,
  );
  const byQuestion = new Map<string, QuestionOption[]>();
  for (const o of optionRows) {
    const list = byQuestion.get(o.question_id) ?? [];
    list.push({ key: o.option_key, label: o.label });
    byQuestion.set(o.question_id, list);
  }
  return rows.map((r) => rowToQuestion(r, byQuestion.get(r.id) ?? []));
}

export async function getQuestionsByIds(db: Db, ids: string[]): Promise<Question[]> {
  if (ids.length === 0) return [];
  const list = await queryQuestions(db, `q.id IN (${ids.map(() => '?').join(', ')})`, ids);
  const byId = new Map(list.map((q) => [q.id, q]));
  return ids.map((id) => byId.get(id)).filter((q): q is Question => q !== undefined);
}

export async function getAllQuestions(db: Db): Promise<Question[]> {
  return queryQuestions(db);
}

interface ModuleRow {
  id: string;
  position: number;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  color: string;
  category: string;
}

export async function getModules(db: Db): Promise<Module[]> {
  const rows = await db.getAllAsync<ModuleRow>('SELECT * FROM modules ORDER BY position');
  return rows.map((r) => ({ ...r, category: r.category as Module['category'] }));
}

export async function getModule(db: Db, id: string): Promise<Module | null> {
  const row = await db.getFirstAsync<ModuleRow>('SELECT * FROM modules WHERE id = ?', [id]);
  return row ? { ...row, category: row.category as Module['category'] } : null;
}

interface LessonRow {
  id: string;
  module_id: string;
  position: number;
  title: string;
  level: number;
  intro: string;
  key_idea: string;
  example_problem: string;
  example_solution_json: string;
  tips_json: string;
}

function rowToLesson(r: LessonRow): Lesson {
  return {
    id: r.id,
    moduleId: r.module_id,
    position: r.position,
    title: r.title,
    level: r.level as Lesson['level'],
    intro: r.intro,
    keyIdea: r.key_idea,
    exampleProblem: r.example_problem,
    exampleSolution: JSON.parse(r.example_solution_json) as string[],
    tips: JSON.parse(r.tips_json) as string[],
  };
}

export async function getLessons(db: Db, moduleId?: string): Promise<Lesson[]> {
  const rows = moduleId
    ? await db.getAllAsync<LessonRow>('SELECT * FROM lessons WHERE module_id = ? ORDER BY position', [moduleId])
    : await db.getAllAsync<LessonRow>('SELECT * FROM lessons ORDER BY module_id, position');
  return rows.map(rowToLesson);
}

export async function getLesson(db: Db, id: string): Promise<Lesson | null> {
  const row = await db.getFirstAsync<LessonRow>('SELECT * FROM lessons WHERE id = ?', [id]);
  return row ? rowToLesson(row) : null;
}

export interface ContentStatus {
  total: number;
  verified: number;
  pending: number;
  original: number;
  official: number;
  lessons: number;
  modules: number;
}

export async function getContentStatus(db: Db): Promise<ContentStatus> {
  const row = await db.getFirstAsync<{
    total: number;
    verified: number | null;
    pending: number | null;
    original: number | null;
    official: number | null;
  }>(
    `SELECT COUNT(*) AS total,
       SUM(verification_status = 'verificada') AS verified,
       SUM(verification_status = 'pendiente') AS pending,
       SUM(origin = 'original') AS original,
       SUM(origin = 'oficial') AS official
     FROM questions WHERE active = 1`,
  );
  const lessons = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM lessons');
  const modules = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM modules');
  return {
    total: row?.total ?? 0,
    verified: row?.verified ?? 0,
    pending: row?.pending ?? 0,
    original: row?.original ?? 0,
    official: row?.official ?? 0,
    lessons: lessons?.n ?? 0,
    modules: modules?.n ?? 0,
  };
}
