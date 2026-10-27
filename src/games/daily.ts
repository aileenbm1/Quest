import type { Question } from '@/core/types';
import type { GameId } from './types';

/** Juegos del reto del día, en orden. Cada uno se juega una ronda y al final hay una pregunta numérica. */
export const DAILY_GAMES: GameId[] = ['laberinto', 'ritmo', 'cazabugs', 'numero'];
/** Mismo nivel para todos, así el reto del día es comparable entre amigos. */
export const DAILY_LEVEL = 3;
/** Cuatro juegos más la pregunta final. */
export const DAILY_MAX_SCORE = DAILY_GAMES.length + 1;

/** Número estable a partir de la fecha (FNV-1a): el mismo día da el mismo reto en cualquier teléfono. */
export function dailySeed(day: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < day.length; i++) {
    h ^= day.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/**
 * Pregunta final: de respuesta numérica, como en el examen (solo cuenta la respuesta).
 * Se eligen preguntas verificadas de dificultad media y se escoge una según la fecha.
 */
export function pickDailyQuestion(day: string, questions: Question[]): Question | null {
  const eligible = questions
    .filter((q) => q.answer.kind === 'number' && q.verification === 'verificada' && q.difficulty >= 2 && q.difficulty <= 4)
    .sort((a, b) => a.id.localeCompare(b.id));
  if (eligible.length === 0) return null;
  return eligible[dailySeed(day) % eligible.length]!;
}

/** XP del reto del día: se gana una sola vez por día, fuera del tope de XP de los juegos. */
export const dailyXp = (score: number) => Math.min(20, 5 + 3 * Math.max(0, score));

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/** Texto para compartir: solo el resultado, sin nombres ni datos personales. */
export function shareMessage(day: string, score: number, max: number, timeMs: number): string {
  const [y, m, d] = day.split('-');
  return `Reto del día de OIEG Quest (${d}/${m}/${y}): ${score} de ${max} en ${formatDuration(timeMs)}. ¿Puedes superarme?`;
}
