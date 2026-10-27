import { pick, randomInt, type Rng } from './rng';

export interface Line {
  text: string;
  indent?: number;
}

export interface BugRound {
  id: string;
  level: number;
  /** Lo que el programa debería lograr. */
  goal: string;
  lines: Line[];
  /** Resultado que produce el programa con el error (solo en rondas numéricas). */
  actual?: string;
  /** Posición de la línea con el error. */
  bug: number;
  /** Cómo debería decir esa línea. */
  fix: string;
  explanation: string;
}

export const MAX_BUG_LEVEL = 5;

type NumOp = '+' | '−' | '×';
export interface NumStep {
  op: NumOp;
  n: number;
}

const stepText = (s: NumStep) => (s.op === '+' ? `Suma ${s.n}` : s.op === '−' ? `Resta ${s.n}` : `Multiplica por ${s.n}`);

/** Ejecuta la receta numérica; devuelve null si algún paso da un número negativo. */
export function runSteps(start: number, steps: NumStep[]): number | null {
  let value = start;
  for (const s of steps) {
    value = s.op === '+' ? value + s.n : s.op === '−' ? value - s.n : value * s.n;
    if (value < 0) return null;
  }
  return value;
}

const randomStep = (rng: Rng, level: number): NumStep => {
  const op = pick(rng, level <= 1 ? (['+', '−'] as NumOp[]) : (['+', '−', '×'] as NumOp[]));
  return { op, n: op === '×' ? randomInt(rng, 2, 3) : randomInt(rng, 1, level >= 4 ? 9 : 6) };
};

/** Genera una receta de números con un error; todo se calcula, así que siempre es verificable. */
export function generateNumberRound(level: number, rng: Rng, serial = 0): BugRound {
  const lv = Math.min(MAX_BUG_LEVEL, Math.max(1, Math.round(level)));
  const count = [3, 3, 4, 5, 6][lv - 1]!;
  for (let attempt = 0; attempt < 500; attempt++) {
    const start = randomInt(rng, 1, 9);
    const good = Array.from({ length: count }, () => randomStep(rng, lv));
    const goal = runSteps(start, good);
    if (goal === null || goal > 200) continue;
    const bug = randomInt(rng, 0, count - 1);
    const wrong = randomStep(rng, lv);
    if (wrong.op === good[bug]!.op && wrong.n === good[bug]!.n) continue;
    const broken = good.map((s, i) => (i === bug ? wrong : s));
    const actual = runSteps(start, broken);
    if (actual === null || actual === goal) continue;
    return {
      id: `num-${serial}`,
      level: lv,
      goal: `Empieza en ${start} y llega a ${goal}.`,
      lines: broken.map((s) => ({ text: stepText(s) })),
      actual: `Con este programa llegas a ${actual}.`,
      bug,
      fix: stepText(good[bug]!),
      explanation: `La línea ${bug + 1} dice «${stepText(wrong)}», pero debía decir «${stepText(good[bug]!)}». Así sí se llega a ${goal}.`,
    };
  }
  // Respaldo: 2 → suma 3 → ×2 = 10; con «Suma 4» daría 12.
  return {
    id: `num-${serial}`,
    level: lv,
    goal: 'Empieza en 2 y llega a 10.',
    lines: [{ text: 'Suma 4' }, { text: 'Multiplica por 2' }],
    actual: 'Con este programa llegas a 12.',
    bug: 0,
    fix: 'Suma 3',
    explanation: 'La línea 1 dice «Suma 4», pero debía decir «Suma 3». Así sí se llega a 10.',
  };
}

/** Rondas de instrucciones cotidianas y de lógica de programas (una sola línea con error). */
export const TEXT_ROUNDS: BugRound[] = [
  {
    id: 'txt-cuadrado',
    level: 1,
    goal: 'Dibujar un cuadrado (4 lados iguales).',
    lines: [{ text: 'Repite 3 veces:' }, { text: 'Avanza 10 pasos', indent: 1 }, { text: 'Gira 90° a la derecha', indent: 1 }],
    bug: 0,
    fix: 'Repite 4 veces:',
    explanation: 'Un cuadrado tiene 4 lados, así que el ciclo debe repetirse 4 veces. Con 3 queda abierto.',
  },
  {
    id: 'txt-clima',
    level: 1,
    goal: 'Si llueve, llevar paraguas; si no llueve, llevar gorra.',
    lines: [{ text: 'Mira el cielo' }, { text: 'Si llueve: lleva el paraguas' }, { text: 'Si no llueve: lleva el paraguas' }],
    bug: 2,
    fix: 'Si no llueve: lleva la gorra',
    explanation: 'Las dos condiciones llevaban lo mismo. Cuando no llueve, el programa debe decir que lleves la gorra.',
  },
  {
    id: 'txt-contar',
    level: 2,
    goal: 'Contar hasta 3 y detenerse.',
    lines: [
      { text: 'Empieza en 0' },
      { text: 'Mientras el número sea MAYOR que 3:' },
      { text: 'Suma 1', indent: 1 },
      { text: 'Di el número', indent: 1 },
    ],
    bug: 1,
    fix: 'Mientras el número sea MENOR que 3:',
    explanation: 'Empiezas en 0, que no es mayor que 3, así que el ciclo nunca se ejecuta. Debe ser «menor que 3».',
  },
  {
    id: 'txt-cuenta',
    level: 2,
    goal: 'Contar de 1 a 5 en voz alta.',
    lines: [
      { text: 'Empieza en 1' },
      { text: 'Repite hasta llegar a 5:' },
      { text: 'Di el número', indent: 1 },
      { text: 'Resta 1 al número', indent: 1 },
    ],
    bug: 3,
    fix: 'Suma 1 al número',
    explanation: 'Para ir de 1 hacia 5 el número debe subir. Con «Resta 1» se aleja de la meta y el ciclo no termina.',
  },
  {
    id: 'txt-saltos',
    level: 3,
    goal: 'Dar 3 saltos y aplaudir una sola vez al final.',
    lines: [{ text: 'Repite 3 veces:' }, { text: 'Salta', indent: 1 }, { text: 'Aplaude', indent: 1 }, { text: 'Fin' }],
    bug: 2,
    fix: 'Aplaude (fuera del ciclo, después de repetir)',
    explanation: 'El aplauso está dentro del ciclo, así que se haría 3 veces. Debe ir después, fuera del ciclo.',
  },
  {
    id: 'txt-suma',
    level: 3,
    goal: 'Sumar los números del 1 al 4 (el resultado debe ser 10).',
    lines: [
      { text: 'Total = 0' },
      { text: 'Para cada número del 1 al 4:' },
      { text: 'Total = Total × número', indent: 1 },
      { text: 'Di el total' },
    ],
    bug: 2,
    fix: 'Total = Total + número',
    explanation: 'Para sumar hay que usar «+». Con «×» el total se queda en 0 para siempre.',
  },
  {
    id: 'txt-mayor',
    level: 4,
    goal: 'Encontrar el número más grande de una lista.',
    lines: [
      { text: 'Anota el primer número como «mayor»' },
      { text: 'Revisa cada número de la lista' },
      { text: 'Si el número es MENOR que el «mayor», anótalo como «mayor»', indent: 1 },
      { text: 'Al final, di cuál es el «mayor»' },
    ],
    bug: 2,
    fix: 'Si el número es MAYOR que el «mayor», anótalo como «mayor»',
    explanation: 'Para quedarte con el más grande debes reemplazar cuando encuentres uno mayor, no uno menor.',
  },
  {
    id: 'txt-giro',
    level: 1,
    goal: 'Que el robot dé 2 pasos adelante y luego gire a la derecha.',
    lines: [{ text: 'Avanza' }, { text: 'Avanza' }, { text: 'Gira a la izquierda' }],
    bug: 2,
    fix: 'Gira a la derecha',
    explanation: 'La meta pide girar a la derecha, pero la última línea hace que gire a la izquierda.',
  },
  {
    id: 'txt-semaforo',
    level: 1,
    goal: 'Si el semáforo está en rojo, detenerse; si está en verde, avanzar.',
    lines: [{ text: 'Mira el semáforo' }, { text: 'Si está rojo: avanza' }, { text: 'Si está verde: avanza' }],
    bug: 1,
    fix: 'Si está rojo: detente',
    explanation: 'Con el semáforo en rojo hay que detenerse. La línea 2 dice lo contrario y sería peligroso.',
  },
  {
    id: 'txt-imprimir',
    level: 1,
    goal: 'Decir en voz alta los números 1, 2 y 3.',
    lines: [
      { text: 'Empieza en 1' },
      { text: 'Repite 3 veces:' },
      { text: 'Di el número', indent: 1 },
      { text: 'Suma 2 al número', indent: 1 },
    ],
    bug: 3,
    fix: 'Suma 1 al número',
    explanation: 'Sumando 2 dirías 1, 3 y 5. Para decir 1, 2 y 3 hay que sumar 1 cada vez.',
  },
  {
    id: 'txt-regresiva',
    level: 2,
    goal: 'Contar hacia atrás de 10 a 1.',
    lines: [
      { text: 'Empieza en 10' },
      { text: 'Mientras el número sea mayor que 0:' },
      { text: 'Di el número', indent: 1 },
      { text: 'Suma 1 al número', indent: 1 },
    ],
    bug: 3,
    fix: 'Resta 1 al número',
    explanation: 'Para ir de 10 hacia 1 el número debe bajar. Con «Suma 1» sube y el ciclo nunca termina.',
  },
  {
    id: 'txt-pares',
    level: 2,
    goal: 'Contar cuántos números pares hay del 1 al 7 (son 3: 2, 4 y 6).',
    lines: [
      { text: 'Cuenta = 0' },
      { text: 'Para cada número del 1 al 7:' },
      { text: 'Si el número es impar: suma 1 a Cuenta', indent: 1 },
      { text: 'Di Cuenta' },
    ],
    bug: 2,
    fix: 'Si el número es par: suma 1 a Cuenta',
    explanation: 'La línea 3 cuenta los impares (1, 3, 5 y 7 son 4). Para contar los pares la condición debe ser «es par».',
  },
  {
    id: 'txt-triangulo',
    level: 3,
    goal: 'Dibujar un triángulo con 3 lados iguales.',
    lines: [{ text: 'Repite 3 veces:' }, { text: 'Avanza 10 pasos', indent: 1 }, { text: 'Gira 90° a la derecha', indent: 1 }],
    bug: 2,
    fix: 'Gira 120° a la derecha',
    explanation: 'Con giros de 90° se dibuja un cuadrado. En un triángulo de lados iguales cada giro es de 120°.',
  },
  {
    id: 'txt-suma-pares',
    level: 3,
    goal: 'Sumar solo los números pares del 1 al 6 (2 + 4 + 6 = 12).',
    lines: [
      { text: 'Total = 0' },
      { text: 'Para cada número del 1 al 6:' },
      { text: 'Si el número es par:', indent: 1 },
      { text: 'Total = Total + 1', indent: 2 },
      { text: 'Di el total' },
    ],
    bug: 3,
    fix: 'Total = Total + número',
    explanation: 'Sumar 1 solo cuenta cuántos pares hay (da 3). Para sumar los pares hay que agregar el número mismo.',
  },
  {
    id: 'txt-hola',
    level: 3,
    goal: 'Decir «Hola» exactamente 5 veces.',
    lines: [
      { text: 'Contador = 0' },
      { text: 'Mientras Contador sea menor que 4:' },
      { text: 'Di «Hola»', indent: 1 },
      { text: 'Contador = Contador + 1', indent: 1 },
    ],
    bug: 1,
    fix: 'Mientras Contador sea menor que 5:',
    explanation: 'Con «menor que 4» el contador toma los valores 0, 1, 2 y 3: solo 4 veces. Con «menor que 5» son 5.',
  },
  {
    id: 'txt-promedio',
    level: 3,
    goal: 'Calcular el promedio de 3 calificaciones.',
    lines: [{ text: 'Suma las 3 calificaciones' }, { text: 'Divide el total entre 2' }, { text: 'Di el resultado' }],
    bug: 1,
    fix: 'Divide el total entre 3',
    explanation: 'El promedio se obtiene dividiendo entre la cantidad de datos, y son 3 calificaciones, no 2.',
  },
  {
    id: 'txt-intercambio',
    level: 4,
    goal: 'Intercambiar los valores de A y B.',
    lines: [{ text: 'Guarda el valor de A en Temporal' }, { text: 'A = B' }, { text: 'B = A' }],
    bug: 2,
    fix: 'B = Temporal',
    explanation: 'Después de «A = B», A ya no tiene su valor original, así que «B = A» no cambia nada. El valor viejo está en Temporal.',
  },
  {
    id: 'txt-menor',
    level: 4,
    goal: 'Encontrar el número más pequeño de una lista.',
    lines: [
      { text: 'Anota el primer número como «menor»' },
      { text: 'Revisa cada número de la lista' },
      { text: 'Si el número es MAYOR que el «menor», anótalo como «menor»', indent: 1 },
      { text: 'Al final, di cuál es el «menor»' },
    ],
    bug: 2,
    fix: 'Si el número es MENOR que el «menor», anótalo como «menor»',
    explanation: 'Para quedarte con el más pequeño debes reemplazar cuando encuentres uno menor, no uno mayor.',
  },
  {
    id: 'txt-par-impar',
    level: 4,
    goal: 'Decir si un número es par o impar.',
    lines: [
      { text: 'Divide el número entre 2 y mira el residuo' },
      { text: 'Si el residuo es 1: di «es par»' },
      { text: 'Si no: di «es impar»' },
    ],
    bug: 1,
    fix: 'Si el residuo es 0: di «es par»',
    explanation: 'Un número par se divide exacto entre 2, o sea que el residuo es 0. Con residuo 1 el número es impar.',
  },
];

/** Elige una ronda de texto de nivel parecido que no se haya usado ya en la partida. */
export function pickTextRound(level: number, rng: Rng, used: string[]): BugRound {
  const available = TEXT_ROUNDS.filter((r) => !used.includes(r.id));
  const pool = available.length > 0 ? available : TEXT_ROUNDS;
  const close = pool.filter((r) => Math.abs(r.level - level) <= 1);
  return pick(rng, close.length > 0 ? close : pool);
}

/** Alterna recetas numéricas (rondas 1, 3 y 5) y de texto (rondas 2 y 4). */
export function buildRound(index: number, level: number, rng: Rng, usedTextIds: string[]): BugRound {
  return index % 2 === 1 ? pickTextRound(level, rng, usedTextIds) : generateNumberRound(level, rng, index);
}
