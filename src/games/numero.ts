import { pick, randomInt, type Rng } from './rng';

export type Op = '+' | '−' | '×' | '÷';
export const OPS: Op[] = ['+', '−', '×', '÷'];

export interface Step {
  a: number;
  op: Op;
  b: number;
  result: number;
}

export interface NumberPuzzle {
  level: number;
  numbers: number[];
  target: number;
}

export const MAX_NUMBER_LEVEL = 5;

const LEVELS: Record<number, { count: number; max: number; ops: Op[] }> = {
  1: { count: 3, max: 6, ops: ['+', '−'] },
  2: { count: 3, max: 9, ops: ['+', '−', '×'] },
  3: { count: 4, max: 10, ops: ['+', '−', '×', '÷'] },
  4: { count: 4, max: 12, ops: ['+', '−', '×', '÷'] },
  5: { count: 5, max: 12, ops: ['+', '−', '×', '÷'] },
};

/** Resultado de `a op b`, o null si no es un entero positivo (no se permiten negativos ni decimales). */
export function applyOp(a: number, op: Op, b: number): number | null {
  let r: number;
  switch (op) {
    case '+':
      r = a + b;
      break;
    case '−':
      r = a - b;
      break;
    case '×':
      r = a * b;
      break;
    case '÷':
      if (b === 0 || a % b !== 0) return null;
      r = a / b;
      break;
  }
  return Number.isInteger(r) && r > 0 ? r : null;
}

/** Busca una forma de llegar al objetivo combinando los números (usa cualquier cantidad de ellos). */
export function solve(numbers: number[], target: number): Step[] | null {
  if (numbers.includes(target)) return [];
  for (let i = 0; i < numbers.length; i++) {
    for (let j = 0; j < numbers.length; j++) {
      if (i === j) continue;
      for (const op of OPS) {
        const result = applyOp(numbers[i]!, op, numbers[j]!);
        if (result === null) continue;
        const rest = numbers.filter((_, k) => k !== i && k !== j);
        const next = [...rest, result];
        const tail = solve(next, target);
        if (tail) return [{ a: numbers[i]!, op, b: numbers[j]!, result }, ...tail];
      }
    }
  }
  return null;
}

export function generatePuzzle(level: number, rng: Rng): NumberPuzzle {
  const lv = Math.min(MAX_NUMBER_LEVEL, Math.max(1, Math.round(level)));
  const cfg = LEVELS[lv]!;
  for (let attempt = 0; attempt < 500; attempt++) {
    const numbers = Array.from({ length: cfg.count }, () => randomInt(rng, 1, cfg.max));
    let pool = [...numbers];
    let last: number | null = null;
    for (let s = 0; s < cfg.count - 1; s++) {
      const i = randomInt(rng, 0, pool.length - 1);
      let j = randomInt(rng, 0, pool.length - 2);
      if (j >= i) j += 1;
      const op = pick(rng, cfg.ops);
      const result = applyOp(pool[i]!, op, pool[j]!);
      if (result === null) {
        last = null;
        break;
      }
      pool = [...pool.filter((_, k) => k !== i && k !== j), result];
      last = result;
    }
    if (last === null || last < 2 || last > 150 || numbers.includes(last)) continue;
    const solution = solve(numbers, last);
    if (solution && solution.length >= 2) return { level: lv, numbers, target: last };
  }
  // Respaldo seguro, siempre resoluble: (2 + 3) × 4 = 20.
  return { level: lv, numbers: [2, 3, 4], target: 20 };
}

export const describeStep = (s: Step) => `${s.a} ${s.op} ${s.b} = ${s.result}`;
