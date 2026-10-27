/** @jest-environment node */
import { getDailyChallenge, getDailyStreak, getGamesSummary, recordDailyChallenge, recordGameSession } from '@/db/games';
import { initDatabase } from '@/db/init';
import { getOverview, resetProgress } from '@/db/progress';
import { MAX_GAME_XP_PER_DAY } from '@/games/rewards';
import { openNodeDb, type TestDb } from '../../test-utils/nodeDb';

const NOW = new Date('2026-10-27T15:00:00');

async function freshDb(): Promise<TestDb> {
  const db = openNodeDb();
  await initDatabase(db, { now: NOW });
  return db;
}

describe('minijuegos en SQLite', () => {
  it('guarda la partida, sube el nivel inicial y suma XP y racha', async () => {
    const db = await freshDb();
    const before = await getOverview(db, NOW);
    expect(before.xp).toBe(0);
    expect(before.practicedToday).toBe(false);

    const { xp } = await recordGameSession(db, 'ritmo', { score: 4, maxScore: 5, level: 3, timeMs: 40_000 }, NOW);
    expect(xp).toBeGreaterThan(0);

    const summary = await getGamesSummary(db, NOW);
    expect(summary.stats.ritmo).toEqual({ game: 'ritmo', plays: 1, bestScore: 4, nextLevel: 3, maxLevel: 3, bestTimeMs: null });
    expect(summary.stats.numero.plays).toBe(0);
    expect(summary.stats.numero.nextLevel).toBe(1);
    expect(summary.playsToday).toBe(1);

    const after = await getOverview(db, NOW);
    expect(after.xp).toBe(xp);
    expect(after.practicedToday).toBe(true);
    expect(after.streak).toBe(1);
  });

  it('el mejor puntaje no baja y el nivel sigue la última partida', async () => {
    const db = await freshDb();
    await recordGameSession(db, 'laberinto', { score: 3, maxScore: 3, level: 5, timeMs: 1 }, NOW);
    await recordGameSession(db, 'laberinto', { score: 1, maxScore: 3, level: 4, timeMs: 1 }, NOW);
    const s = (await getGamesSummary(db, NOW)).stats.laberinto;
    expect(s.bestScore).toBe(3);
    expect(s.nextLevel).toBe(4);
    expect(s.plays).toBe(2);
  });

  it('limita el XP de juegos por día', async () => {
    const db = await freshDb();
    let total = 0;
    for (let i = 0; i < 10; i++) {
      total += (await recordGameSession(db, 'cazabugs', { score: 5, maxScore: 5, level: 5, timeMs: 1 }, NOW)).xp;
    }
    expect(total).toBe(MAX_GAME_XP_PER_DAY);
    expect((await getGamesSummary(db, NOW)).xpToday).toBe(MAX_GAME_XP_PER_DAY);
    const tomorrow = new Date('2026-10-28T10:00:00');
    expect((await recordGameSession(db, 'cazabugs', { score: 5, maxScore: 5, level: 5, timeMs: 1 }, tomorrow)).xp).toBeGreaterThan(0);
  });

  it('rechaza datos fuera de rango sin guardar basura', async () => {
    const db = await freshDb();
    await recordGameSession(db, 'numero', { score: 9, maxScore: 5, level: 99, timeMs: -5 }, NOW);
    const row = await db.getFirstAsync<{ level: number; time_ms: number }>('SELECT level, time_ms FROM game_sessions');
    expect(row).toEqual({ level: 10, time_ms: 0 });
  });

  it('reiniciar el progreso borra las partidas', async () => {
    const db = await freshDb();
    await recordGameSession(db, 'ritmo', { score: 2, maxScore: 5, level: 2, timeMs: 1 }, NOW);
    await resetProgress(db);
    expect((await getGamesSummary(db, NOW)).playsToday).toBe(0);
    expect((await getOverview(db, NOW)).xp).toBe(0);
  });

  it('detecta récords: mejor puntaje y mejor tiempo en partidas perfectas', async () => {
    const db = await freshDb();
    const first = await recordGameSession(db, 'numero', { score: 3, maxScore: 5, level: 2, timeMs: 90_000 }, NOW);
    expect(first.newBestScore).toBe(false); // la primera partida no es un récord
    const better = await recordGameSession(db, 'numero', { score: 4, maxScore: 5, level: 3, timeMs: 80_000 }, NOW);
    expect(better.newBestScore).toBe(true);
    expect(better.newBestTime).toBe(false); // no fue perfecta
    const perfect = await recordGameSession(db, 'numero', { score: 5, maxScore: 5, level: 4, timeMs: 70_000 }, NOW);
    expect(perfect.newBestScore).toBe(true);
    expect(perfect.newBestTime).toBe(false); // primera partida perfecta: aún no hay tiempo con qué comparar
    const faster = await recordGameSession(db, 'numero', { score: 5, maxScore: 5, level: 5, timeMs: 60_000 }, NOW);
    expect(faster.newBestScore).toBe(false);
    expect(faster.newBestTime).toBe(true);
    const slower = await recordGameSession(db, 'numero', { score: 5, maxScore: 5, level: 5, timeMs: 65_000 }, NOW);
    expect(slower.newBestTime).toBe(false);
    const s = (await getGamesSummary(db, NOW)).stats.numero;
    expect(s.bestTimeMs).toBe(60_000);
    expect(s.maxLevel).toBe(5);
  });
});

describe('reto del día en SQLite', () => {
  const DAY = '2026-10-27';

  it('la primera vez da XP y suma al total; repetirlo solo mejora el resultado', async () => {
    const db = await freshDb();
    expect(await getDailyChallenge(db, DAY)).toBeNull();
    const first = await recordDailyChallenge(db, DAY, { score: 3, maxScore: 5, timeMs: 200_000 }, NOW);
    expect(first).toMatchObject({ first: true, improved: false });
    expect(first.xp).toBe(14);
    expect((await getOverview(db, NOW)).xp).toBe(14);

    const worse = await recordDailyChallenge(db, DAY, { score: 2, maxScore: 5, timeMs: 100_000 }, NOW);
    expect(worse).toEqual({ xp: 0, first: false, improved: false });
    const better = await recordDailyChallenge(db, DAY, { score: 4, maxScore: 5, timeMs: 300_000 }, NOW);
    expect(better).toEqual({ xp: 0, first: false, improved: true });
    const faster = await recordDailyChallenge(db, DAY, { score: 4, maxScore: 5, timeMs: 250_000 }, NOW);
    expect(faster.improved).toBe(true);

    expect(await getDailyChallenge(db, DAY)).toEqual({ day: DAY, score: 4, maxScore: 5, timeMs: 250_000, plays: 4 });
    expect((await getOverview(db, NOW)).xp).toBe(14); // el XP no se repite
  });

  it('cuenta la racha de días seguidos y la borra al reiniciar', async () => {
    const db = await freshDb();
    await recordDailyChallenge(db, '2026-10-26', { score: 1, maxScore: 5, timeMs: 1 }, new Date('2026-10-26T10:00:00'));
    await recordDailyChallenge(db, DAY, { score: 1, maxScore: 5, timeMs: 1 }, NOW);
    expect(await getDailyStreak(db, NOW)).toBe(2);
    expect((await getOverview(db, NOW)).streak).toBe(2);
    await resetProgress(db);
    expect(await getDailyChallenge(db, DAY)).toBeNull();
    expect(await getDailyStreak(db, NOW)).toBe(0);
  });
});
