import { generateNumberRound, runSteps, TEXT_ROUNDS, buildRound } from '@/games/cazabugs';
import { expandProgram, forwardTokens, generateMaze, levelByNumber, MAX_MAZE_LEVEL, MAZE_LEVELS, mazeForRound, runProgram, findCell } from '@/games/laberinto';
import { applyOp, generatePuzzle, solve } from '@/games/numero';
import { generateRhythm, isCorrectTap, minimalPeriod } from '@/games/ritmo';
import { capDailyXp, MAX_GAME_XP_PER_DAY, MAX_XP_PER_GAME, xpForGame } from '@/games/rewards';
import { mulberry32 } from '@/games/rng';
import { dailySeed, dailyXp, DAILY_MAX_SCORE, formatDuration, pickDailyQuestion, shareMessage } from '@/games/daily';
import { ALL_QUESTIONS } from '@/content';

describe('Llega al número', () => {
  it('aplica operaciones solo cuando dan enteros positivos', () => {
    expect(applyOp(3, '+', 4)).toBe(7);
    expect(applyOp(3, '−', 4)).toBeNull();
    expect(applyOp(3, '−', 3)).toBeNull();
    expect(applyOp(6, '÷', 4)).toBeNull();
    expect(applyOp(8, '÷', 4)).toBe(2);
    expect(applyOp(5, '÷', 0)).toBeNull();
  });

  it('resuelve un caso conocido', () => {
    const steps = solve([2, 3, 4], 20);
    expect(steps).not.toBeNull();
    expect(steps![steps!.length - 1]!.result).toBe(20);
  });

  it('siempre genera acertijos con solución, en todos los niveles', () => {
    for (let level = 1; level <= 5; level++) {
      for (let seed = 1; seed <= 25; seed++) {
        const p = generatePuzzle(level, mulberry32(seed * 31 + level));
        expect(p.numbers).toHaveLength([3, 3, 4, 4, 5][level - 1]!);
        expect(p.numbers).not.toContain(p.target);
        expect(solve(p.numbers, p.target)).not.toBeNull();
      }
    }
  });

  it('es repetible con la misma semilla', () => {
    expect(generatePuzzle(3, mulberry32(7))).toEqual(generatePuzzle(3, mulberry32(7)));
  });
});

describe('Bit en el laberinto', () => {
  it.each(MAZE_LEVELS.map((l) => [l.id, l] as const))('el nivel %i se puede resolver dentro del límite de bloques', (_id, level) => {
    expect(level.solution.length).toBeLessThanOrEqual(level.maxCommands);
    expect(runProgram(level, level.solution).outcome).toBe('meta');
    expect(findCell(level.grid, 'S')).not.toBeNull();
    expect(findCell(level.grid, 'G')).not.toBeNull();
  });

  it('«Repetir» repite el bloque siguiente y se pueden anidar', () => {
    expect(expandProgram(['x2', 'adelante'])).toEqual(['adelante', 'adelante']);
    expect(expandProgram(['x2', 'x3', 'adelante'])).toHaveLength(6);
    expect(expandProgram(['x2'])).toEqual([]);
    expect(expandProgram(['izq', 'x3', 'der'])).toEqual(['izq', 'der', 'der', 'der']);
  });

  it('choca con las paredes y con el borde', () => {
    const level = levelByNumber(2);
    expect(runProgram(level, ['izq', 'adelante']).outcome).toBe('choque');
    expect(runProgram(level, ['der', 'adelante']).outcome).toBe('choque');
  });

  it('un programa corto no llega y uno vacío no se mueve', () => {
    const level = levelByNumber(1);
    expect(runProgram(level, ['adelante', 'adelante']).outcome).toBe('sin_llegar');
    expect(runProgram(level, []).poses).toHaveLength(1);
  });

  it('los niveles con «Repetir» no caben sin usarlo', () => {
    for (const level of MAZE_LEVELS.filter((l) => l.solution.some((c) => c === 'x2' || c === 'x3'))) {
      // Sin usar «Repetir» harían falta más bloques de los permitidos.
      expect(expandProgram(level.solution).length).toBeGreaterThan(level.maxCommands);
    }
  });
});

describe('Laberintos generados', () => {
  it('siempre se pueden resolver, en todos los niveles y con muchas semillas', () => {
    for (let level = 1; level <= MAX_MAZE_LEVEL; level++) {
      for (let seed = 1; seed <= 40; seed++) {
        const maze = generateMaze(level, mulberry32(seed * 101 + level));
        expect(maze.solution.length).toBeLessThanOrEqual(maze.maxCommands);
        expect(runProgram(maze, maze.solution).outcome).toBe('meta');
        const widths = new Set(maze.grid.map((r) => r.length));
        expect(widths.size).toBe(1);
        expect(maze.grid.join('').split('S')).toHaveLength(2);
        expect(maze.grid.join('').split('G')).toHaveLength(2);
      }
    }
  });

  it('con la misma semilla da el mismo laberinto y con otra, uno distinto', () => {
    expect(generateMaze(6, mulberry32(5))).toEqual(generateMaze(6, mulberry32(5)));
    const grids = new Set(Array.from({ length: 20 }, (_, i) => generateMaze(6, mulberry32(i + 1)).grid.join('/')));
    expect(grids.size).toBeGreaterThan(10);
  });

  it('avanzar usa «Repetir» cuando ahorra bloques', () => {
    expect(forwardTokens(1)).toEqual(['adelante']);
    expect(forwardTokens(6).length).toBeLessThanOrEqual(3);
    expect(expandProgram(forwardTokens(6))).toHaveLength(6);
    for (let n = 1; n <= 8; n++) expect(expandProgram(forwardTokens(n))).toHaveLength(n);
  });

  it('el nivel de enseñanza solo sale la primera vez', () => {
    expect(mazeForRound(3, false, mulberry32(1))).toEqual(levelByNumber(3));
    expect(mazeForRound(3, true, mulberry32(1))).not.toEqual(levelByNumber(3));
    expect(mazeForRound(9, false, mulberry32(1)).title).toBe('Laberinto nuevo');
  });
});

describe('Ritmo de colores', () => {
  it('calcula el ciclo mínimo', () => {
    expect(minimalPeriod([0, 1, 0, 1])).toBe(2);
    expect(minimalPeriod([0, 0, 1])).toBe(3);
    expect(minimalPeriod([2, 2])).toBe(1);
  });

  it('el patrón mostrado y lo esperado siguen el mismo ciclo', () => {
    for (let level = 1; level <= 5; level++) {
      for (let seed = 1; seed <= 25; seed++) {
        const r = generateRhythm(level, mulberry32(seed * 17 + level));
        expect(minimalPeriod(r.cycle)).toBe(r.cycle.length);
        const full = [...r.shown, ...r.expected];
        full.forEach((v, i) => expect(v).toBe(r.cycle[i % r.cycle.length]));
        expect(r.shown.length).toBeGreaterThanOrEqual(r.cycle.length * 2);
      }
    }
  });

  it('valida cada toque', () => {
    expect(isCorrectTap([1, 2], 0, 1)).toBe(true);
    expect(isCorrectTap([1, 2], 1, 1)).toBe(false);
    expect(isCorrectTap([1, 2], 5, 1)).toBe(false);
  });
});

describe('Cazabugs', () => {
  it('las rondas numéricas fallan con el error y aciertan al corregirlo', () => {
    for (let level = 1; level <= 5; level++) {
      for (let seed = 1; seed <= 30; seed++) {
        const round = generateNumberRound(level, mulberry32(seed * 13 + level));
        const start = Number(/Empieza en (\d+)/.exec(round.goal)![1]);
        const goal = Number(/llega a (\d+)/.exec(round.goal)![1]);
        const parse = (text: string) => {
          const m = /^(Suma|Resta|Multiplica por) (\d+)$/.exec(text)!;
          return { op: m[1] === 'Suma' ? ('+' as const) : m[1] === 'Resta' ? ('−' as const) : ('×' as const), n: Number(m[2]) };
        };
        const steps = round.lines.map((l) => parse(l.text));
        expect(runSteps(start, steps)).not.toBe(goal);
        const fixed = steps.map((s, i) => (i === round.bug ? parse(round.fix) : s));
        expect(runSteps(start, fixed)).toBe(goal);
        expect(round.actual).toContain(String(runSteps(start, steps)));
      }
    }
  });

  it('las rondas de texto están bien formadas y son únicas', () => {
    const ids = TEXT_ROUNDS.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const r of TEXT_ROUNDS) {
      expect(r.lines.length).toBeGreaterThanOrEqual(3);
      expect(r.bug).toBeGreaterThanOrEqual(0);
      expect(r.bug).toBeLessThan(r.lines.length);
      expect(r.explanation.length).toBeGreaterThan(10);
    }
  });

  it('alterna rondas numéricas y de texto sin repetir texto en la partida', () => {
    const rng = mulberry32(3);
    const used: string[] = [];
    const rounds = [0, 1, 2, 3, 4].map((i) => {
      const r = buildRound(i, 2, rng, used);
      if (r.id.startsWith('txt-')) used.push(r.id);
      return r;
    });
    expect(rounds.filter((r) => r.id.startsWith('txt-'))).toHaveLength(2);
    expect(new Set(used).size).toBe(used.length);
  });
});

describe('Recompensas', () => {
  it('dan XP según el desempeño y respetan los topes', () => {
    expect(xpForGame(0, 5, 1)).toBeLessThan(xpForGame(5, 5, 1));
    expect(xpForGame(5, 5, 5)).toBeLessThanOrEqual(MAX_XP_PER_GAME);
    expect(xpForGame(1, 0, 1)).toBe(0);
    expect(capDailyXp(20, MAX_GAME_XP_PER_DAY - 5)).toBe(5);
    expect(capDailyXp(20, MAX_GAME_XP_PER_DAY)).toBe(0);
    expect(capDailyXp(20, 0)).toBe(20);
  });
});

describe('Reto del día', () => {
  it('la semilla depende solo de la fecha', () => {
    expect(dailySeed('2026-10-27')).toBe(dailySeed('2026-10-27'));
    expect(dailySeed('2026-10-27')).not.toBe(dailySeed('2026-10-28'));
  });

  it('todos reciben la misma pregunta numérica verificada ese día', () => {
    const a = pickDailyQuestion('2026-11-12', ALL_QUESTIONS)!;
    const b = pickDailyQuestion('2026-11-12', [...ALL_QUESTIONS].reverse())!;
    expect(a.id).toBe(b.id);
    expect(a.answer.kind).toBe('number');
    expect(a.verification).toBe('verificada');
    const days = Array.from({ length: 30 }, (_, i) => pickDailyQuestion(`2026-11-${String(i + 1).padStart(2, '0')}`, ALL_QUESTIONS)!.id);
    expect(new Set(days).size).toBeGreaterThan(8);
    expect(pickDailyQuestion('2026-11-12', [])).toBeNull();
  });

  it('el mismo día genera los mismos retos en cada juego', () => {
    const seed = dailySeed('2026-11-12');
    expect(generatePuzzle(3, mulberry32(seed + 3))).toEqual(generatePuzzle(3, mulberry32(seed + 3)));
    expect(generateRhythm(3, mulberry32(seed + 1))).toEqual(generateRhythm(3, mulberry32(seed + 1)));
    expect(generateMaze(3, mulberry32(seed))).toEqual(generateMaze(3, mulberry32(seed)));
  });

  it('calcula XP, tiempo y mensaje para compartir sin datos personales', () => {
    expect(dailyXp(0)).toBe(5);
    expect(dailyXp(DAILY_MAX_SCORE)).toBe(20);
    expect(formatDuration(125_000)).toBe('2:05');
    const msg = shareMessage('2026-11-12', 4, 5, 125_000);
    expect(msg).toContain('12/11/2026');
    expect(msg).toContain('4 de 5');
    expect(msg).toContain('2:05');
  });
});
