export type Command = 'adelante' | 'izq' | 'der' | 'x2' | 'x3';
export type Dir = 'N' | 'E' | 'S' | 'W';

export const COMMAND_LABELS: Record<Command, string> = {
  adelante: 'Avanzar',
  izq: 'Girar izquierda',
  der: 'Girar derecha',
  x2: 'Repetir 2 veces',
  x3: 'Repetir 3 veces',
};

export interface MazeLevel {
  id: number;
  title: string;
  /** '#' pared, '.' piso, 'S' inicio de Bit, 'G' meta. */
  grid: string[];
  startDir: Dir;
  /** Máximo de bloques que se pueden usar. */
  maxCommands: number;
  /** Solución de referencia (la usan las pruebas para comprobar que el nivel se puede resolver). */
  solution: Command[];
  tip: string;
}

export const MAZE_LEVELS: MazeLevel[] = [
  {
    id: 1,
    title: 'Primer paso',
    grid: ['S...G'],
    startDir: 'E',
    maxCommands: 4,
    solution: ['adelante', 'adelante', 'adelante', 'adelante'],
    tip: 'Bit ejecuta tus bloques en orden, de izquierda a derecha.',
  },
  {
    id: 2,
    title: 'Una esquina',
    grid: ['S...', '###.', '###G'],
    startDir: 'E',
    maxCommands: 6,
    solution: ['adelante', 'adelante', 'adelante', 'der', 'adelante', 'adelante'],
    tip: 'Girar no mueve a Bit: solo cambia hacia dónde mira.',
  },
  {
    id: 3,
    title: 'Zigzag',
    grid: ['S..##', '##.##', '##...', '####G'],
    startDir: 'E',
    maxCommands: 10,
    solution: ['adelante', 'adelante', 'der', 'adelante', 'adelante', 'izq', 'adelante', 'adelante', 'der', 'adelante'],
    tip: 'Piensa en el camino por partes: tramo recto, giro, tramo recto…',
  },
  {
    id: 4,
    title: 'Repite y avanza',
    grid: ['S......', '######.', '######G'],
    startDir: 'E',
    maxCommands: 6,
    solution: ['x2', 'x3', 'adelante', 'der', 'x2', 'adelante'],
    tip: '«Repetir» repite el bloque que va justo después. Si pones dos «Repetir» seguidos, ¡se multiplican!',
  },
  {
    id: 5,
    title: 'Rodea el muro',
    grid: ['S.#.G', '..#..', '.....'],
    startDir: 'E',
    maxCommands: 10,
    solution: ['der', 'x2', 'adelante', 'izq', 'x2', 'x2', 'adelante', 'izq', 'x2', 'adelante'],
    tip: 'Si el camino directo está bloqueado, busca otro y cuenta los pasos.',
  },
  {
    id: 6,
    title: 'La letra U',
    grid: ['S......', '######.', 'G......'],
    startDir: 'E',
    maxCommands: 10,
    solution: ['x2', 'x3', 'adelante', 'der', 'x2', 'adelante', 'der', 'x2', 'x3', 'adelante'],
    tip: 'Con pocos bloques, los «Repetir» son tus mejores amigos.',
  },
  {
    id: 7,
    title: 'Serpiente',
    grid: ['S....', '####.', '.....', '.####', 'G....'],
    startDir: 'E',
    maxCommands: 13,
    solution: ['x2', 'x2', 'adelante', 'der', 'x2', 'adelante', 'der', 'x2', 'x2', 'adelante', 'izq', 'x2', 'adelante'],
    tip: '¡Último reto! Planea la ruta completa antes de poner el primer bloque.',
  },
];

/** Los 7 niveles escritos a mano enseñan las ideas; del 8 al 10 (y las repeticiones) son laberintos nuevos. */
export const MAX_MAZE_LEVEL = 10;
const MAX_STEPS = 200;

const DELTA: Record<Dir, [number, number]> = { N: [-1, 0], E: [0, 1], S: [1, 0], W: [0, -1] };
const RIGHT: Record<Dir, Dir> = { N: 'E', E: 'S', S: 'W', W: 'N' };
const LEFT: Record<Dir, Dir> = { N: 'W', W: 'S', S: 'E', E: 'N' };

export interface Pose {
  row: number;
  col: number;
  dir: Dir;
}

export function findCell(grid: string[], ch: string): { row: number; col: number } | null {
  for (let row = 0; row < grid.length; row++) {
    const col = grid[row]!.indexOf(ch);
    if (col >= 0) return { row, col };
  }
  return null;
}

type Primitive = 'adelante' | 'izq' | 'der';

/** Convierte los bloques (con «Repetir») en pasos simples. */
export function expandProgram(program: Command[]): Primitive[] {
  const parse = (i: number): { steps: Primitive[]; next: number } => {
    const token = program[i];
    if (token === undefined) return { steps: [], next: i };
    if (token === 'x2' || token === 'x3') {
      const times = token === 'x2' ? 2 : 3;
      const inner = parse(i + 1);
      const steps: Primitive[] = [];
      for (let k = 0; k < times && steps.length <= MAX_STEPS; k++) steps.push(...inner.steps);
      return { steps, next: inner.next };
    }
    return { steps: [token], next: i + 1 };
  };
  const out: Primitive[] = [];
  let i = 0;
  while (i < program.length) {
    const { steps, next } = parse(i);
    out.push(...steps);
    i = Math.max(next, i + 1);
    if (out.length > MAX_STEPS) break;
  }
  return out.slice(0, MAX_STEPS);
}

export type Outcome = 'meta' | 'choque' | 'sin_llegar';

export interface RunResult {
  /** Posición inicial más una posición por cada paso ejecutado. */
  poses: Pose[];
  outcome: Outcome;
}

export function runProgram(level: MazeLevel, program: Command[]): RunResult {
  const start = findCell(level.grid, 'S')!;
  let pose: Pose = { ...start, dir: level.startDir };
  const poses: Pose[] = [pose];
  for (const step of expandProgram(program)) {
    if (step === 'izq') pose = { ...pose, dir: LEFT[pose.dir] };
    else if (step === 'der') pose = { ...pose, dir: RIGHT[pose.dir] };
    else {
      const [dr, dc] = DELTA[pose.dir];
      const row = pose.row + dr;
      const col = pose.col + dc;
      const cell = level.grid[row]?.[col];
      if (cell === undefined || cell === '#') return { poses, outcome: 'choque' };
      pose = { ...pose, row, col };
    }
    poses.push(pose);
    if (level.grid[pose.row]![pose.col] === 'G') return { poses, outcome: 'meta' };
  }
  return { poses, outcome: 'sin_llegar' };
}

export const levelByNumber = (n: number): MazeLevel =>
  MAZE_LEVELS[Math.min(MAZE_LEVELS.length, Math.max(1, Math.round(n))) - 1]!;

// --- Laberintos generados ---------------------------------------------------

const forwardCache = new Map<number, Command[]>();

/** Bloques para avanzar `m` casillas con una cadena de «Repetir» y un «Avanzar», o null si `m` no es 2^a·3^b. */
function repeatChain(m: number): Command[] | null {
  const chain: Command[] = [];
  let rest = m;
  while (rest % 2 === 0) {
    chain.push('x2');
    rest /= 2;
  }
  while (rest % 3 === 0) {
    chain.push('x3');
    rest /= 3;
  }
  return rest === 1 ? [...chain, 'adelante'] : null;
}

/**
 * Secuencia más corta de bloques para avanzar `n` casillas. «Repetir» solo repite el bloque que
 * va justo después, así que cada tramo es una cadena de «Repetir» seguida de un «Avanzar».
 */
export function forwardTokens(n: number): Command[] {
  const cached = forwardCache.get(n);
  if (cached) return cached;
  let best: Command[] = [];
  if (n > 0) {
    best = Array.from({ length: n }, () => 'adelante' as Command);
    for (let m = 2; m <= n; m++) {
      const chain = repeatChain(m);
      if (!chain) continue;
      const candidate = [...chain, ...forwardTokens(n - m)];
      if (candidate.length < best.length) best = candidate;
    }
  }
  forwardCache.set(n, best);
  return best;
}

const DIRS: Dir[] = ['N', 'E', 'S', 'W'];

/**
 * Crea un laberinto nuevo: traza un camino con giros, rellena el resto con paredes al azar
 * y comprueba ejecutando la solución que Bit de verdad llega a la meta.
 */
export function generateMaze(level: number, rng: () => number): MazeLevel {
  const n = Math.min(MAX_MAZE_LEVEL, Math.max(1, Math.round(level)));
  const segments = 2 + Math.floor(n / 2);
  const size = Math.floor(n / 3);
  const cols = 5 + Math.min(3, size);
  const rows = 4 + Math.min(3, size);
  const int = (min: number, max: number) => min + Math.floor(rng() * (max - min + 1));

  for (let attempt = 0; attempt < 400; attempt++) {
    const start = { row: int(0, rows - 1), col: int(0, cols - 1) };
    let dir = DIRS[int(0, 3)]!;
    const startDir = dir;
    const path = new Set<string>([`${start.row},${start.col}`]);
    let pos = { ...start };
    const solution: Command[] = [];
    let ok = true;
    for (let seg = 0; seg < segments && ok; seg++) {
      if (seg > 0) {
        const turnRight = rng() < 0.5;
        dir = turnRight ? RIGHT[dir] : LEFT[dir];
        solution.push(turnRight ? 'der' : 'izq');
      }
      const [dr, dc] = DELTA[dir];
      let length = 0;
      const max = int(1, 5);
      while (length < max) {
        const next = { row: pos.row + dr, col: pos.col + dc };
        if (next.row < 0 || next.row >= rows || next.col < 0 || next.col >= cols || path.has(`${next.row},${next.col}`)) break;
        pos = next;
        path.add(`${pos.row},${pos.col}`);
        length += 1;
      }
      if (length === 0) ok = false;
      else solution.push(...forwardTokens(length));
    }
    if (!ok) continue;
    const goal = pos;
    const grid = Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => {
        if (r === start.row && c === start.col) return 'S';
        if (r === goal.row && c === goal.col) return 'G';
        return path.has(`${r},${c}`) || rng() < 0.45 ? '.' : '#';
      }).join(''),
    );
    const maze: MazeLevel = {
      id: n,
      title: 'Laberinto nuevo',
      grid,
      startDir,
      maxCommands: solution.length,
      solution,
      tip: 'Este laberinto es nuevo: planea la ruta completa antes de poner el primer bloque.',
    };
    if (runProgram(maze, solution).outcome === 'meta') return maze;
  }
  return levelByNumber(n);
}

/** Niveles 1–7 la primera vez: el laberinto de enseñanza. Si ya se pasaron, o del 8 en adelante, uno nuevo. */
export function mazeForRound(level: number, alreadyPassed: boolean, rng: () => number): MazeLevel {
  const n = Math.min(MAX_MAZE_LEVEL, Math.max(1, Math.round(level)));
  return n <= MAZE_LEVELS.length && !alreadyPassed ? levelByNumber(n) : generateMaze(n, rng);
}
