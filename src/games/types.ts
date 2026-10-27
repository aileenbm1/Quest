export const GAME_IDS = ['numero', 'laberinto', 'ritmo', 'cazabugs'] as const;
export type GameId = (typeof GAME_IDS)[number];

export interface GameInfo {
  id: GameId;
  title: string;
  tagline: string;
  /** Habilidad que entrena, en palabras para el estudiante. */
  trains: string;
  icon: 'calculator' | 'git-branch' | 'musical-notes' | 'bug';
  color: string;
}

export const GAMES: GameInfo[] = [
  {
    id: 'laberinto',
    title: 'Bit en el laberinto',
    tagline: 'Programa a Bit con flechas para que llegue a la meta.',
    trains: 'Algoritmos, ciclos y cuadrículas',
    icon: 'git-branch',
    color: '#7C3AED',
  },
  {
    id: 'ritmo',
    title: 'Ritmo de colores',
    tagline: 'Descubre el patrón del ritmo y continúalo.',
    trains: 'Patrones y secuencias',
    icon: 'musical-notes',
    color: '#0E7490',
  },
  {
    id: 'cazabugs',
    title: 'Cazabugs',
    tagline: 'Encuentra la instrucción con error antes de que se acabe el tiempo.',
    trains: 'Depuración de instrucciones',
    icon: 'bug',
    color: '#B91C1C',
  },
  {
    id: 'numero',
    title: 'Llega al número',
    tagline: 'Combina números con operaciones hasta llegar a la meta.',
    trains: 'Matemáticas y cálculo mental',
    icon: 'calculator',
    color: '#15803D',
  },
];

export const gameInfo = (id: GameId): GameInfo => GAMES.find((g) => g.id === id)!;
export const isGameId = (value: unknown): value is GameId => GAME_IDS.includes(value as GameId);

/** Resultado de una partida (varias rondas cortas). */
export interface GameOutcome {
  /** Rondas resueltas. */
  score: number;
  /** Rondas jugadas. */
  maxScore: number;
  /** Nivel con el que terminó (la siguiente partida empieza ahí). */
  level: number;
  timeMs: number;
}

export interface GameProps {
  startLevel: number;
  onFinish: (outcome: GameOutcome) => void;
  /** Nivel más alto que el jugador ya alcanzó (0 si nunca ha jugado). */
  bestLevel?: number;
  /** Semilla fija: con ella el juego es idéntico para todos (reto del día). */
  seed?: number;
  /** Rondas de la partida; por defecto, las normales del juego. */
  rounds?: number;
}

export const ROUNDS_PER_GAME = 5;
/** Rondas por partida: los laberintos son más largos, así que se juegan 3. */
export const roundsFor = (game: GameId): number => (game === 'laberinto' ? 3 : ROUNDS_PER_GAME);
