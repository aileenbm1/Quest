import { addDays } from './dates';
import { LEVEL_NAMES, type GradeResult } from './types';

/** Experiencia mínima para cada nivel de la progresión pedagógica. */
export const LEVEL_THRESHOLDS = [0, 150, 400, 800, 1400] as const;

export function xpForAttempt(result: GradeResult, difficulty: number): number {
  if (result === 'correcta') return 10 + 2 * difficulty;
  if (result === 'incorrecta' || result === 'no_verificable') return 2; // premiar el intento
  return 0;
}

export interface LevelInfo {
  level: number;
  name: string;
  xp: number;
  currentThreshold: number;
  nextThreshold: number | null;
  /** 0..1 dentro del nivel actual. */
  progress: number;
}

export function levelForXp(xp: number): LevelInfo {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]!) level = i + 1;
  }
  const currentThreshold = LEVEL_THRESHOLDS[level - 1]!;
  const nextThreshold = level < LEVEL_THRESHOLDS.length ? LEVEL_THRESHOLDS[level]! : null;
  const progress =
    nextThreshold === null ? 1 : (xp - currentThreshold) / (nextThreshold - currentThreshold);
  return { level, name: LEVEL_NAMES[level] ?? '', xp, currentThreshold, nextThreshold, progress };
}

/**
 * Racha: días consecutivos con práctica que terminan hoy o ayer
 * (si aún no practicas hoy, la racha de ayer sigue viva).
 */
export function computeStreak(activeDays: string[], today: string): number {
  const days = new Set(activeDays);
  let cursor = days.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export interface RecentAttempt {
  difficulty: number;
  correct: boolean;
}

/**
 * Dificultad recomendada (1–5) a partir de los intentos recientes de una
 * categoría o módulo. Sube cuando hay al menos 3 intentos con 70 % de
 * aciertos en el nivel; baja si el desempeño en el nivel actual cae por
 * debajo de 40 %.
 */
export function recommendedDifficulty(recent: RecentAttempt[]): number {
  const accuracyAt = (d: number) => {
    const list = recent.filter((a) => a.difficulty === d).slice(0, 6);
    if (list.length < 3) return null;
    return list.filter((a) => a.correct).length / list.length;
  };
  let level = 1;
  for (let d = 1; d <= 5; d++) {
    const acc = accuracyAt(d);
    if (acc !== null && acc >= 0.7) level = Math.min(5, d + 1);
    else break;
  }
  const current = accuracyAt(level);
  if (level > 1 && current !== null && current < 0.4) level -= 1;
  return level;
}

/** Intervalos de repaso espaciado (en días) según las veces que se ha fallado. */
export const REVIEW_INTERVALS = [1, 2, 4, 7] as const;

export function reviewIntervalDays(step: number): number {
  return REVIEW_INTERVALS[Math.min(Math.max(step, 0), REVIEW_INTERVALS.length - 1)]!;
}
