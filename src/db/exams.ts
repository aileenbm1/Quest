import { pickExamQuestions, type ExamKind } from '@/core/exam';
import { gradeAnswer } from '@/core/grading';
import { computeScore, type ScoreSummary } from '@/core/scoring';
import { isExpired } from '@/core/timer';
import type { GradeResult, Question } from '@/core/types';
import { insertAttempt } from './progress';
import { getAllQuestions, getQuestionsByIds } from './questions';
import type { Db } from './types';

export type ExamStatus = 'en_curso' | 'finalizado' | 'tiempo_agotado';

export interface ExamSession {
  id: number;
  kind: ExamKind;
  startedAt: string;
  finishedAt: string | null;
  durationSeconds: number | null;
  status: ExamStatus;
  score: number | null;
  maxScore: number | null;
  breakdown: ScoreSummary | null;
}

export interface ExamAnswer {
  position: number;
  questionId: string;
  response: string | null;
  result: GradeResult | null;
  answeredAt: string | null;
}

interface SessionRow {
  id: number;
  kind: string;
  started_at: string;
  finished_at: string | null;
  duration_seconds: number | null;
  status: string;
  score: number | null;
  max_score: number | null;
  breakdown_json: string | null;
}

function rowToSession(r: SessionRow): ExamSession {
  return {
    id: r.id,
    kind: r.kind as ExamKind,
    startedAt: r.started_at,
    finishedAt: r.finished_at,
    durationSeconds: r.duration_seconds,
    status: r.status as ExamStatus,
    score: r.score,
    maxScore: r.max_score,
    breakdown: r.breakdown_json ? (JSON.parse(r.breakdown_json) as ScoreSummary) : null,
  };
}

export async function createExamSession(
  db: Db,
  kind: ExamKind,
  questions: Question[],
  durationSeconds: number | null,
  now: Date = new Date(),
): Promise<number> {
  if (questions.length === 0) throw new Error('No hay preguntas disponibles para el simulacro.');
  let id = 0;
  await db.withTransactionAsync(async () => {
    const res = await db.runAsync(
      `INSERT INTO exam_sessions (kind, started_at, duration_seconds, status) VALUES (?, ?, ?, 'en_curso')`,
      [kind, now.toISOString(), durationSeconds],
    );
    id = res.lastInsertRowId;
    for (const [position, q] of questions.entries()) {
      await db.runAsync('INSERT INTO exam_answers (session_id, position, question_id) VALUES (?, ?, ?)', [
        id,
        position,
        q.id,
      ]);
    }
  });
  return id;
}

/** Crea un simulacro eligiendo preguntas del banco local. */
export async function startExam(
  db: Db,
  kind: ExamKind,
  durationSeconds: number | null,
  now: Date = new Date(),
  random: () => number = Math.random,
): Promise<number> {
  const bank = await getAllQuestions(db);
  return createExamSession(db, kind, pickExamQuestions(bank, kind, random), durationSeconds, now);
}

export async function getExamSession(db: Db, id: number): Promise<ExamSession | null> {
  const row = await db.getFirstAsync<SessionRow>('SELECT * FROM exam_sessions WHERE id = ?', [id]);
  return row ? rowToSession(row) : null;
}

export async function getExamAnswers(db: Db, sessionId: number): Promise<ExamAnswer[]> {
  const rows = await db.getAllAsync<{
    position: number;
    question_id: string;
    response: string | null;
    result: string | null;
    answered_at: string | null;
  }>('SELECT * FROM exam_answers WHERE session_id = ? ORDER BY position', [sessionId]);
  return rows.map((r) => ({
    position: r.position,
    questionId: r.question_id,
    response: r.response,
    result: r.result as GradeResult | null,
    answeredAt: r.answered_at,
  }));
}

export async function getExamWithQuestions(db: Db, sessionId: number) {
  const session = await getExamSession(db, sessionId);
  if (!session) return null;
  const answers = await getExamAnswers(db, sessionId);
  const questions = await getQuestionsByIds(
    db,
    answers.map((a) => a.questionId),
  );
  return { session, answers, questions };
}

/** Guarda (o borra, si viene vacía) la respuesta de una pregunta. Solo mientras el examen sigue en curso. */
export async function saveExamAnswer(
  db: Db,
  sessionId: number,
  position: number,
  response: string | null,
  now: Date = new Date(),
): Promise<boolean> {
  const value = response !== null && response.trim() !== '' ? response : null;
  const res = await db.runAsync(
    `UPDATE exam_answers SET response = ?, answered_at = ?
     WHERE session_id = ? AND position = ?
       AND EXISTS (SELECT 1 FROM exam_sessions s WHERE s.id = ? AND s.status = 'en_curso')`,
    [value, value === null ? null : now.toISOString(), sessionId, position, sessionId],
  );
  return res.changes > 0;
}

/**
 * Califica y cierra el examen. Es idempotente: si ya estaba cerrado,
 * devuelve el resultado guardado sin volver a registrar intentos.
 */
export async function finalizeExam(
  db: Db,
  sessionId: number,
  now: Date = new Date(),
  reason: Exclude<ExamStatus, 'en_curso'> = 'finalizado',
): Promise<ExamSession> {
  const data = await getExamWithQuestions(db, sessionId);
  if (!data) throw new Error('El simulacro no existe.');
  if (data.session.status !== 'en_curso') return data.session;
  const byId = new Map(data.questions.map((q) => [q.id, q]));
  const activity = data.session.kind === 'diagnostico' ? 'diagnostico' : 'simulacro';

  const graded = data.answers
    .map((a) => {
      const q = byId.get(a.questionId);
      return q ? { answer: a, question: q, result: gradeAnswer(q, a.response) } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
  const summary = computeScore(graded.map((g) => ({ category: g.question.category, result: g.result })));

  await db.withTransactionAsync(async () => {
    // Revisar el estado dentro de la transacción evita doble cierre.
    const fresh = await db.getFirstAsync<{ status: string }>('SELECT status FROM exam_sessions WHERE id = ?', [sessionId]);
    if (fresh?.status !== 'en_curso') return;
    for (const g of graded) {
      await db.runAsync('UPDATE exam_answers SET result = ? WHERE session_id = ? AND position = ?', [
        g.result,
        sessionId,
        g.answer.position,
      ]);
      await insertAttempt(
        db,
        {
          question: g.question,
          activityType: activity,
          activityRef: `examen:${sessionId}`,
          response: g.answer.response,
          result: g.result,
          timeMs: 0,
        },
        now,
      );
    }
    await db.runAsync(
      `UPDATE exam_sessions SET status = ?, finished_at = ?, score = ?, max_score = ?, breakdown_json = ? WHERE id = ?`,
      [reason, now.toISOString(), summary.score, summary.maxScore, JSON.stringify(summary), sessionId],
    );
  });
  return (await getExamSession(db, sessionId))!;
}

export async function getActiveExam(db: Db): Promise<ExamSession | null> {
  const row = await db.getFirstAsync<SessionRow>(
    `SELECT * FROM exam_sessions WHERE status = 'en_curso' ORDER BY started_at DESC LIMIT 1`,
  );
  return row ? rowToSession(row) : null;
}

/**
 * Cierra automáticamente los simulacros cuyo tiempo se agotó mientras la
 * app estaba cerrada. Devuelve los ids cerrados.
 */
export async function expireOverdueExams(db: Db, now: Date = new Date()): Promise<number[]> {
  const rows = await db.getAllAsync<SessionRow>(
    `SELECT * FROM exam_sessions WHERE status = 'en_curso' AND duration_seconds IS NOT NULL`,
  );
  const closed: number[] = [];
  for (const r of rows) {
    if (isExpired(r.started_at, r.duration_seconds!, now.getTime())) {
      await finalizeExam(db, r.id, now, 'tiempo_agotado');
      closed.push(r.id);
    }
  }
  return closed;
}

export async function listExamSessions(db: Db, includeDiagnostic = false): Promise<ExamSession[]> {
  const rows = await db.getAllAsync<SessionRow>(
    `SELECT * FROM exam_sessions WHERE status != 'en_curso' ${includeDiagnostic ? '' : "AND kind != 'diagnostico'"}
     ORDER BY started_at DESC`,
  );
  return rows.map(rowToSession);
}

export async function getLatestDiagnostic(db: Db): Promise<ExamSession | null> {
  const row = await db.getFirstAsync<SessionRow>(
    `SELECT * FROM exam_sessions WHERE kind = 'diagnostico' AND status != 'en_curso' ORDER BY started_at DESC LIMIT 1`,
  );
  return row ? rowToSession(row) : null;
}

export async function abandonExam(db: Db, sessionId: number): Promise<void> {
  await db.runAsync(`DELETE FROM exam_sessions WHERE id = ? AND status = 'en_curso'`, [sessionId]);
}
