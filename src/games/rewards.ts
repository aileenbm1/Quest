/** Tope de XP por partida y por día: los juegos acompañan la práctica, no la reemplazan. */
export const MAX_XP_PER_GAME = 20;
export const MAX_GAME_XP_PER_DAY = 60;
/** A partir de esta cantidad de partidas en un día se sugiere descansar. */
export const REST_AFTER_PLAYS = 5;

export function xpForGame(score: number, maxScore: number, level: number): number {
  if (maxScore <= 0) return 0;
  const ratio = Math.min(1, Math.max(0, score / maxScore));
  return Math.min(MAX_XP_PER_GAME, 4 + Math.round(10 * ratio) + Math.min(level, 5));
}

/** Aplica el tope diario al XP calculado para una partida. */
export function capDailyXp(xp: number, alreadyToday: number): number {
  return Math.max(0, Math.min(xp, MAX_GAME_XP_PER_DAY - alreadyToday));
}
