import { toLocalDay } from '@/core/dates';
import { computeStreak } from '@/core/progression';
import { dailyXp } from '@/games/daily';
import { capDailyXp, xpForGame } from '@/games/rewards';
import { GAME_IDS, type GameId, type GameOutcome } from '@/games/types';
import type { Db } from './types';

export interface GameStats {
  game: GameId;
  plays: number;
  /** Mejor puntaje (rondas resueltas) de una partida. */
  bestScore: number;
  /** Nivel con el que empieza la próxima partida. */
  nextLevel: number;
  /** Nivel más alto alcanzado (0 si nunca ha jugado). */
  maxLevel: number;
  /** Mejor tiempo en una partida perfecta; null si aún no hay ninguna. */
  bestTimeMs: number | null;
}

export interface GamesSummary {
  stats: Record<GameId, GameStats>;
  playsToday: number;
  xpToday: number;
}

export interface GameRecordResult {
  xp: number;
  /** Superó su mejor puntaje anterior (la primera partida no cuenta como récord). */
  newBestScore: boolean;
  /** Fue una partida perfecta y más rápida que su mejor tiempo anterior. */
  newBestTime: boolean;
}

/** Guarda una partida y devuelve el XP ganado (con el tope diario aplicado) y si rompió un récord personal. */
export async function recordGameSession(
  db: Db,
  game: GameId,
  outcome: GameOutcome,
  now: Date = new Date(),
): Promise<GameRecordResult> {
  let xp = 0;
  let newBestScore = false;
  let newBestTime = false;
  await db.withTransactionAsync(async () => {
    const day = toLocalDay(now);
    const before = await db.getFirstAsync<{ plays: number; best: number | null; bestTime: number | null }>(
      `SELECT COUNT(*) AS plays, MAX(score) AS best,
         MIN(CASE WHEN score = max_score THEN time_ms END) AS bestTime
       FROM game_sessions WHERE game = ?`,
      [game],
    );
    const perfect = outcome.score >= outcome.maxScore;
    const previousTime = before?.bestTime ?? null;
    newBestScore = (before?.plays ?? 0) > 0 && outcome.score > (before?.best ?? 0);
    newBestTime = perfect && previousTime !== null && outcome.timeMs < previousTime;

    const today = await db.getFirstAsync<{ xp: number | null }>('SELECT SUM(xp) AS xp FROM game_sessions WHERE day = ?', [day]);
    xp = capDailyXp(xpForGame(outcome.score, outcome.maxScore, outcome.level), today?.xp ?? 0);
    await db.runAsync(
      `INSERT INTO game_sessions (game, level, score, max_score, time_ms, xp, created_at, day)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        game,
        Math.min(10, Math.max(1, Math.round(outcome.level))),
        Math.max(0, Math.round(outcome.score)),
        Math.max(1, Math.round(outcome.maxScore)),
        Math.max(0, Math.round(outcome.timeMs)),
        xp,
        now.toISOString(),
        day,
      ],
    );
  });
  return { xp, newBestScore, newBestTime };
}

export async function getGamesSummary(db: Db, now: Date = new Date()): Promise<GamesSummary> {
  const stats = {} as Record<GameId, GameStats>;
  for (const game of GAME_IDS) {
    const agg = await db.getFirstAsync<{ plays: number; best: number | null; maxLevel: number | null; bestTime: number | null }>(
      `SELECT COUNT(*) AS plays, MAX(score) AS best, MAX(level) AS maxLevel,
         MIN(CASE WHEN score = max_score THEN time_ms END) AS bestTime
       FROM game_sessions WHERE game = ?`,
      [game],
    );
    const last = await db.getFirstAsync<{ level: number }>(
      'SELECT level FROM game_sessions WHERE game = ? ORDER BY id DESC LIMIT 1',
      [game],
    );
    stats[game] = {
      game,
      plays: agg?.plays ?? 0,
      bestScore: agg?.best ?? 0,
      nextLevel: last?.level ?? 1,
      maxLevel: agg?.maxLevel ?? 0,
      bestTimeMs: agg?.bestTime ?? null,
    };
  }
  const today = await db.getFirstAsync<{ plays: number; xp: number | null }>(
    'SELECT COUNT(*) AS plays, SUM(xp) AS xp FROM game_sessions WHERE day = ?',
    [toLocalDay(now)],
  );
  return { stats, playsToday: today?.plays ?? 0, xpToday: today?.xp ?? 0 };
}

export interface DailyChallengeRow {
  day: string;
  score: number;
  maxScore: number;
  timeMs: number;
  plays: number;
}

export async function getDailyChallenge(db: Db, day: string): Promise<DailyChallengeRow | null> {
  const row = await db.getFirstAsync<{ day: string; score: number; max_score: number; time_ms: number; plays: number }>(
    'SELECT day, score, max_score, time_ms, plays FROM daily_challenges WHERE day = ?',
    [day],
  );
  return row ? { day: row.day, score: row.score, maxScore: row.max_score, timeMs: row.time_ms, plays: row.plays } : null;
}

/** Días seguidos con el reto del día terminado (termina hoy o ayer). */
export async function getDailyStreak(db: Db, now: Date = new Date()): Promise<number> {
  const days = await db.getAllAsync<{ day: string }>('SELECT day FROM daily_challenges');
  return computeStreak(
    days.map((d) => d.day),
    toLocalDay(now),
  );
}

export interface DailyRecordResult {
  /** XP ganado: solo la primera vez que se termina el reto de ese día. */
  xp: number;
  first: boolean;
  /** Mejoró su resultado del día (más puntos, o los mismos en menos tiempo). */
  improved: boolean;
}

/** Guarda el reto del día. La primera vez da XP; al repetirlo solo se conserva el mejor resultado. */
export async function recordDailyChallenge(
  db: Db,
  day: string,
  result: { score: number; maxScore: number; timeMs: number },
  now: Date = new Date(),
): Promise<DailyRecordResult> {
  const maxScore = Math.max(1, Math.round(result.maxScore));
  const score = Math.max(0, Math.min(Math.round(result.score), maxScore));
  const timeMs = Math.max(0, Math.round(result.timeMs));
  let out: DailyRecordResult = { xp: 0, first: false, improved: false };
  await db.withTransactionAsync(async () => {
    const existing = await getDailyChallenge(db, day);
    if (!existing) {
      const xp = dailyXp(score);
      await db.runAsync(
        `INSERT INTO daily_challenges (day, score, max_score, time_ms, xp, plays, completed_at)
         VALUES (?, ?, ?, ?, ?, 1, ?)`,
        [day, score, maxScore, timeMs, xp, now.toISOString()],
      );
      out = { xp, first: true, improved: false };
      return;
    }
    const improved = score > existing.score || (score === existing.score && timeMs < existing.timeMs);
    if (improved) {
      await db.runAsync('UPDATE daily_challenges SET score = ?, max_score = ?, time_ms = ?, plays = plays + 1 WHERE day = ?', [
        score,
        maxScore,
        timeMs,
        day,
      ]);
    } else {
      await db.runAsync('UPDATE daily_challenges SET plays = plays + 1 WHERE day = ?', [day]);
    }
    out = { xp: 0, first: false, improved };
  });
  return out;
}
