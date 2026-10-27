import { toLocalDay } from '@/core/dates';
import { clampSessionMinutes, generatePlan, type PlanItem, type PlanKind, type PlanPhase } from '@/core/plan';
import { getSetting, setSetting } from './settings';
import type { Db } from './types';

export interface StoredPlanItem extends PlanItem {
  id: number;
  done: boolean;
}

export async function getPlan(db: Db): Promise<StoredPlanItem[]> {
  const rows = await db.getAllAsync<{
    id: number;
    day: string;
    position: number;
    kind: string;
    title: string;
    minutes: number;
    phase: string;
    done: number;
  }>('SELECT * FROM training_plan ORDER BY day, position');
  return rows.map((r) => ({
    id: r.id,
    day: r.day,
    position: r.position,
    kind: r.kind as PlanKind,
    title: r.title,
    minutes: r.minutes,
    phase: r.phase as PlanPhase,
    done: r.done === 1,
  }));
}

export async function getSessionMinutes(db: Db): Promise<number> {
  return clampSessionMinutes(Number((await getSetting(db, 'session_minutes')) ?? 30));
}

/** Regenera el plan desde hoy. Conserva las tareas ya marcadas como hechas. */
export async function regeneratePlan(db: Db, now: Date = new Date(), sessionMinutes?: number): Promise<StoredPlanItem[]> {
  const minutes = clampSessionMinutes(sessionMinutes ?? (await getSessionMinutes(db)));
  await setSetting(db, 'session_minutes', String(minutes));
  const diag = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM exam_sessions WHERE kind = 'diagnostico' AND status != 'en_curso'`,
  );
  const today = toLocalDay(now);
  const items = generatePlan(today, { sessionMinutes: minutes, diagnosticDone: (diag?.n ?? 0) > 0 });
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM training_plan WHERE done = 0 OR day >= ?', [today]);
    for (const item of items) {
      await db.runAsync(
        `INSERT INTO training_plan (day, position, kind, title, minutes, phase, done) VALUES (?, ?, ?, ?, ?, ?, 0)
         ON CONFLICT(day, position) DO NOTHING`,
        [item.day, item.position, item.kind, item.title, item.minutes, item.phase],
      );
    }
  });
  return getPlan(db);
}

export async function ensurePlan(db: Db, now: Date = new Date()): Promise<StoredPlanItem[]> {
  const plan = await getPlan(db);
  return plan.length > 0 ? plan : regeneratePlan(db, now);
}

export async function setPlanItemDone(db: Db, id: number, done: boolean): Promise<void> {
  await db.runAsync('UPDATE training_plan SET done = ? WHERE id = ?', [done ? 1 : 0, id]);
}

export async function setPlanItemMinutes(db: Db, id: number, minutes: number): Promise<void> {
  await db.runAsync('UPDATE training_plan SET minutes = ? WHERE id = ?', [Math.max(0, Math.min(90, Math.round(minutes))), id]);
}

export async function deletePlanItem(db: Db, id: number): Promise<void> {
  await db.runAsync('DELETE FROM training_plan WHERE id = ?', [id]);
}
