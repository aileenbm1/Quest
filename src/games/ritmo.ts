import { randomInt, type Rng } from './rng';

export interface Pad {
  id: number;
  label: string;
  color: string;
  /** Forma además del color, para que no dependa solo de distinguir colores. */
  icon: 'ellipse' | 'square' | 'triangle' | 'star';
}

export const PADS: Pad[] = [
  { id: 0, label: 'Rojo', color: '#EF4444', icon: 'ellipse' },
  { id: 1, label: 'Azul', color: '#3B82F6', icon: 'square' },
  { id: 2, label: 'Verde', color: '#22C55E', icon: 'triangle' },
  { id: 3, label: 'Amarillo', color: '#EAB308', icon: 'star' },
];

export interface Rhythm {
  level: number;
  /** Parte del patrón que se muestra. */
  shown: number[];
  /** Lo que sigue y debe tocar el estudiante. */
  expected: number[];
  /** Longitud del ciclo que se repite. */
  cycle: number[];
}

export const MAX_RHYTHM_LEVEL = 5;

const LEVELS: Record<number, { cycle: number; repeats: number; extra: number; ask: number }> = {
  1: { cycle: 2, repeats: 3, extra: 0, ask: 3 },
  2: { cycle: 3, repeats: 2, extra: 0, ask: 3 },
  3: { cycle: 3, repeats: 2, extra: 1, ask: 3 },
  4: { cycle: 4, repeats: 2, extra: 1, ask: 4 },
  5: { cycle: 5, repeats: 2, extra: 1, ask: 4 },
};

/** Longitud del ciclo mínimo que genera la secuencia al repetirse. */
export function minimalPeriod(seq: number[]): number {
  for (let p = 1; p <= seq.length; p++) {
    if (seq.length % p !== 0) continue;
    if (seq.every((v, i) => v === seq[i % p])) return p;
  }
  return seq.length;
}

const at = (cycle: number[], i: number) => cycle[i % cycle.length]!;

export function generateRhythm(level: number, rng: Rng): Rhythm {
  const lv = Math.min(MAX_RHYTHM_LEVEL, Math.max(1, Math.round(level)));
  const cfg = LEVELS[lv]!;
  let cycle: number[] = [];
  do {
    cycle = Array.from({ length: cfg.cycle }, () => randomInt(rng, 0, PADS.length - 1));
    // Que el ciclo no se reduzca a uno más corto, y que haya al menos dos colores distintos.
  } while (minimalPeriod(cycle) !== cfg.cycle || new Set(cycle).size < 2);
  const shownLength = cfg.cycle * cfg.repeats + cfg.extra;
  const shown = Array.from({ length: shownLength }, (_, i) => at(cycle, i));
  const expected = Array.from({ length: cfg.ask }, (_, i) => at(cycle, shownLength + i));
  return { level: lv, shown, expected, cycle };
}

/** Revisa un toque: ¿es el siguiente elemento esperado? */
export function isCorrectTap(expected: number[], position: number, tapped: number): boolean {
  return expected[position] === tapped;
}

export const padName = (id: number) => PADS[id]?.label ?? '?';
export const describeCycle = (cycle: number[]) => cycle.map(padName).join(' → ');
