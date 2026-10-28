import { LEVEL_NAMES, type Question } from './types';

// Camino de niveles de cada módulo: se empieza en el nivel 0 «Aprender jugando» y cada
// nivel se abre solo cuando se completa el anterior.

export const PATH_LEVELS = [0, 1, 2, 3, 4, 5] as const;

export type PathStatus = 'completado' | 'abierto' | 'bloqueado';

export interface PathStep {
  level: number;
  name: string;
  /** Ejercicios del módulo en este nivel. */
  total: number;
  /** Ejercicios distintos de este nivel resueltos bien al menos una vez. */
  solved: number;
  /** Cuántos hay que resolver bien para completar el nivel. */
  required: number;
  status: PathStatus;
}

/** Nivel del camino al que pertenece un ejercicio. */
export const pathLevel = (q: Pick<Question, 'starter' | 'difficulty'>): number => (q.starter ? 0 : q.difficulty);

/** Para completar un nivel hay que resolver bien al menos el 60 % de sus ejercicios. */
export const requiredToPass = (total: number): number => Math.ceil(total * 0.6);

/**
 * Arma el camino de un módulo. Los niveles sin ejercicios se omiten. El primer nivel sin
 * completar queda abierto y los siguientes, con candado.
 */
export function buildModulePath(questions: Pick<Question, 'id' | 'starter' | 'difficulty'>[], solvedIds: Set<string>): PathStep[] {
  const steps: PathStep[] = [];
  let blocked = false;
  for (const level of PATH_LEVELS) {
    const inLevel = questions.filter((q) => pathLevel(q) === level);
    if (inLevel.length === 0) continue;
    const solved = inLevel.filter((q) => solvedIds.has(q.id)).length;
    const required = requiredToPass(inLevel.length);
    const done = solved >= required;
    const status: PathStatus = blocked ? 'bloqueado' : done ? 'completado' : 'abierto';
    if (!done) blocked = true;
    steps.push({ level, name: LEVEL_NAMES[level] ?? '', total: inLevel.length, solved, required, status });
  }
  return steps;
}

export const isLevelOpen = (path: PathStep[], level: number): boolean =>
  path.some((s) => s.level === level && s.status !== 'bloqueado');
