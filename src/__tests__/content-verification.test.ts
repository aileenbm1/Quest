/**
 * Recalcula la respuesta de cada ejercicio con código independiente (simulación, fuerza bruta,
 * búsqueda en grafos) y la compara con la respuesta guardada. Si alguien edita un ejercicio y
 * rompe su respuesta, esta prueba lo detecta.
 */
import { ALL_QUESTIONS } from '@/content';
import type { Question } from '@/core/types';

const byId = new Map<string, Question>(ALL_QUESTIONS.map((q) => [q.id, q]));
const q = (id: string): Question => {
  const found = byId.get(id);
  if (!found) throw new Error(`No existe ${id}`);
  return found;
};
const num = (id: string): number => {
  const a = q(id).answer;
  if (a.kind !== 'number') throw new Error(`${id} no es numérica`);
  return a.value;
};
const seq = (id: string): string[] => {
  const a = q(id).answer;
  if (a.kind !== 'sequence') throw new Error(`${id} no es secuencia`);
  return a.values;
};
const choiceLabel = (id: string): string => {
  const question = q(id);
  const a = question.answer;
  if (a.kind !== 'choice') throw new Error(`${id} no es de opción`);
  return question.options!.find((o) => o.key === a.correct)!.label;
};
const order = (id: string): string[] => {
  const a = q(id).answer;
  if (a.kind !== 'order') throw new Error(`${id} no es de orden`);
  return a.order;
};
const textAnswers = (id: string): string[] => {
  const a = q(id).answer;
  if (a.kind !== 'text') throw new Error(`${id} no es de texto`);
  return a.accepted.map((s) => s.toLowerCase());
};

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items];
  return items.flatMap((x, i) => permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [x, ...rest]));
}

describe('verificación independiente: patrones', () => {
  it('secuencias numéricas', () => {
    expect(num('pat-07')).toBe(8 + 13); // Fibonacci
    expect(seq('pat-04')).toEqual(['36', '49']); // cuadrados
    expect(seq('pat-10')).toEqual(['23']); // diferencias 1,2,3,4,5 → +6
    expect(seq('pat-13')).toEqual(['22', '29']);
    expect(seq('pat-06')).toEqual(['48']);
    const rec = [2];
    while (rec.length < 7) rec.push(rec[rec.length - 1]! * 2 - 1);
    expect(num('pat-14')).toBe(rec[6]);
  });

  it('palillos, puntos y ciclos', () => {
    const sticks = (n: number) => 4 + 3 * (n - 1);
    expect([1, 2, 3].map(sticks)).toEqual([4, 7, 10]); // coincide con los datos del enunciado
    expect(num('pat-08')).toBe(sticks(10));
    const tri = (n: number) => (n * (n + 1)) / 2;
    expect([1, 2, 3, 4].map(tri)).toEqual([1, 3, 6, 10]);
    expect(choiceLabel('pat-11')).toBe(String(tri(7)));
    expect(choiceLabel('pat-05')).toBe('■ (cuadrado)'); // ▲ ■ ● … posición 20
    expect(['▲', '■', '●'][(20 - 1) % 3]).toBe('■');
    expect('OLIMPIADA'.repeat(10)[50 - 1]).toBe('P');
    expect(textAnswers('pat-09')).toContain('p');
    const week = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
    expect(textAnswers('pat-12')).toContain(week[100 % 7]);
    expect(Number('123456789101112131415'[15 - 1])).toBe(num('pat-15'));
  });
});

describe('verificación independiente: lógica', () => {
  it('ordenar personas (carrera y estatura)', () => {
    const valid = permutations(['Gael', 'Diego', 'Elena', 'Fernanda']).filter(
      (p) => p[0] === 'Gael' && p.indexOf('Diego') < p.indexOf('Elena') && p.indexOf('Elena') < p.indexOf('Fernanda'),
    );
    expect(valid).toHaveLength(1);
    expect(choiceLabel('log-04')).toBe(valid[0]![2]);
    const heights = permutations(['Ana', 'Beto', 'Carla']).filter((p) => p.indexOf('Ana') < p.indexOf('Beto') && p.indexOf('Beto') < p.indexOf('Carla'));
    expect(choiceLabel('log-03')).toBe(heights[0]![2]);
  });

  it('asignaciones con pistas tienen una sola solución', () => {
    const boxes = permutations(['Manzana', 'Pera', 'Plátano']).filter((p) => p[1] === 'Pera' && p[0] !== 'Manzana'); // [roja, azul, verde]
    expect(boxes).toHaveLength(1);
    expect(choiceLabel('log-07')).toBe(boxes[0]![2]);
    const pets = permutations(['perro', 'gato', 'pez']).filter((p) => p[0] === 'pez' && p[1] !== 'perro'); // [Pedro, Quique, Rosa]
    expect(pets).toHaveLength(1);
    expect(textAnswers('log-10')).toContain(pets[0]![2]);
  });

  it('veraces y mentirosos (log-12) tiene una sola solución consistente', () => {
    const solutions: string[] = [];
    for (const alba of ['V', 'M'] as const) {
      for (const bruno of ['V', 'M'] as const) {
        const albaOk = (alba === 'V') === (bruno === 'M'); // Alba: «Bruno es Mentiroso»
        const brunoOk = (bruno === 'V') === (alba === bruno); // Bruno: «Alba y yo somos del mismo tipo»
        if (albaOk && brunoOk) solutions.push(`${alba}${bruno}`);
      }
    }
    expect(solutions).toEqual(['VM']);
    expect(choiceLabel('log-12')).toBe('Alba es Veraz y Bruno es Mentiroso');
  });

  it('focos en fila: es imposible encender los 5 (log-14)', () => {
    const seen = new Set<number>([0]);
    const queue = [0];
    while (queue.length) {
      const s = queue.shift()!;
      for (let i = 0; i < 4; i++) {
        const next = s ^ (0b11 << i);
        if (!seen.has(next)) {
          seen.add(next);
          queue.push(next);
        }
      }
    }
    expect(seen.has(0b11111)).toBe(false);
    expect(choiceLabel('log-14')).toBe('Es imposible');
  });

  it('calcetines, torneo, araña y monedas', () => {
    expect(num('log-08')).toBe(2 + 1); // 2 colores: el tercero repite
    expect(num('log-13')).toBe(16 - 1); // cada partido elimina a uno
    let height = 0;
    let day = 0;
    for (;;) {
      day += 1;
      height += 3;
      if (height >= 10) break;
      height -= 2;
    }
    expect(num('log-15')).toBe(day);
    let weighings = 0;
    while (3 ** weighings < 9) weighings += 1; // cada pesada tiene 3 resultados
    expect(num('log-11')).toBe(weighings);
  });
});

describe('verificación independiente: algoritmos y depuración', () => {
  it('seguimiento de variables', () => {
    expect(num('alg-02')).toBe((3 + 4) * 2);
    let x = 5;
    let y = x + 2;
    x = 1;
    y = y + x;
    expect(num('alg-03')).toBe(y);
    const n4 = 7 % 2 === 0 ? 7 / 2 : 3 * 7 + 1;
    expect(num('alg-04')).toBe(n4);
    let a = 2;
    let b = 5;
    a = a + b;
    b = a - b;
    a = a - b;
    expect(seq('dep-02')).toEqual([String(a), String(b)]);
    let v = 10;
    for (let i = 0; i < 3; i++) v = (v - 3) * 2;
    expect(num('dep-06')).toBe(v);
  });

  it('ciclos', () => {
    let s = 0;
    for (let i = 1; i <= 5; i++) s += i;
    expect(num('alg-05')).toBe(s);
    let p = 1;
    for (let i = 0; i < 5; i++) p *= 2;
    expect(num('alg-09')).toBe(p);
    let n = 20;
    let c = 0;
    while (n > 1) {
      n = Math.floor(n / 2);
      c += 1;
    }
    expect(num('alg-10')).toBe(c);
    let fa = 0;
    let fb = 1;
    for (let i = 0; i < 6; i++) [fa, fb] = [fb, fa + fb];
    expect(num('alg-12')).toBe(fb);
    let cnt = 0;
    for (let i = 1; i <= 20; i++) if (i % 3 === 0 && i % 2 !== 0) cnt += 1;
    expect(num('alg-13')).toBe(cnt);
    let stars = 0;
    for (let i = 1; i <= 4; i++) for (let j = 1; j <= i; j++) stars += 1;
    expect(num('alg-14')).toBe(stars);
    let m = 11;
    let subtractions = 0;
    while (m >= 2) {
      m -= 2;
      subtractions += 1;
    }
    expect(num('alg-15')).toBe(subtractions);
    expect(m).toBe(1); // termina en 1: «impar», como dice la explicación
  });

  it('errores en algoritmos', () => {
    let wrong = 0;
    for (let i = 1; i < 10; i++) wrong += i;
    let right = 0;
    for (let i = 1; i <= 10; i++) right += i;
    expect([wrong, right]).toEqual([45, 55]); // lo que dice el enunciado de dep-05
    let menor = 0;
    for (const x of [5, 8, 3]) if (x < menor) menor = x;
    expect(num('dep-10')).toBe(menor);
    expect(5 * 3).toBe(15); // área correcta del rectángulo; el error es el paso 3 (usa «+»)
    expect(choiceLabel('dep-01')).toBe('Paso 3');
    expect(choiceLabel('dep-07')).toBe('Paso 3');
  });

  it('binario y combinaciones', () => {
    expect(num('dep-03')).toBe(parseInt('1011', 2));
    expect(textAnswers('dep-04')).toContain((6).toString(2));
    expect(num('dep-09')).toBe(2 ** 5);
  });

  it('cuadrículas: el robot y el camino más corto', () => {
    const grid = q('alg-06').data!.grid!;
    let row = grid.findIndex((r) => r.includes('R'));
    let col = grid[row]!.indexOf('R');
    for (const arrow of '↑↑↑→→→') {
      if (arrow === '↑') row -= 1;
      if (arrow === '→') col += 1;
    }
    expect(choiceLabel('alg-06')).toBe(grid[row]![col]);

    const maze = q('alg-11').data!.grid!;
    const start = maze.map((r, i) => [i, r.indexOf('R')] as const).find(([, c]) => c >= 0)!;
    const dist = new Map<string, number>([[`${start[0]},${start[1]}`, 0]]);
    const queue: [number, number][] = [[start[0], start[1]]];
    let best = -1;
    while (queue.length) {
      const [r, c] = queue.shift()!;
      if (maze[r]![c] === 'M') {
        best = dist.get(`${r},${c}`)!;
        break;
      }
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nr = r + dr;
        const nc = c + dc;
        const key = `${nr},${nc}`;
        if (maze[nr]?.[nc] && maze[nr]![nc] !== '#' && !dist.has(key)) {
          dist.set(key, dist.get(`${r},${c}`)! + 1);
          queue.push([nr, nc]);
        }
      }
    }
    expect(num('alg-11')).toBe(best);
  });

  it('ordenar pasos y condiciones', () => {
    const sandwich = q('alg-01').options!;
    const labelOf = (key: string) => sandwich.find((o) => o.key === key)!.label;
    expect(order('alg-01').map(labelOf)).toEqual([
      'Sacar dos rebanadas de pan',
      'Untar mayonesa en una rebanada',
      'Poner el jamón encima de la mayonesa',
      'Tapar con la otra rebanada de pan',
    ]);
    const t = 15;
    expect(choiceLabel('alg-07')).toBe(t > 30 ? 'Calor' : t > 15 ? 'Agradable' : 'Frío');
  });
});

describe('verificación independiente: matemáticas', () => {
  it('aritmética y divisibilidad', () => {
    expect(num('mat-01')).toBe(3 * 12 - 7);
    expect(choiceLabel('mat-02')).toBe(['124', '117', '131', '146'].find((n) => Number(n) % 9 === 0));
    expect(num('mat-05')).toBe(2 * 85 + 3 * 27);
    expect(num('mat-06')).toBe(100 % 7);
    expect(num('mat-08')).toBe(8 - 8 / 4 - 3);
    expect(num('mat-10')).toBe((18 / 4) * 10);
    let smallest = 0;
    for (let n = 2; ; n++) {
      if (n % 2 === 1 && n % 3 === 1 && n % 4 === 1) {
        smallest = n;
        break;
      }
    }
    expect(num('mat-11')).toBe(smallest);
    expect(num('mat-14')).toBe(Number((2n ** 20n) % 10n));
    expect(num('mix-01')).toBe((2 * 24) / 3);
  });

  it('conteo', () => {
    const twoDigits = [1, 2, 3].flatMap((a) => [1, 2, 3].filter((b) => b !== a).map((b) => a * 10 + b));
    expect(num('mat-03')).toBe(twoDigits.length);
    expect(num('mat-04')).toBe((5 * 4) / 2);
    let multiples = 0;
    for (let i = 1; i <= 100; i++) if (i % 3 === 0 || i % 5 === 0) multiples += 1;
    expect(num('mat-07')).toBe(multiples);
    expect(num('mat-09')).toBe(3 * 4);
    let odd = 0;
    for (let i = 100; i <= 999; i++) if ([...String(i)].every((d) => Number(d) % 2 === 1)) odd += 1;
    expect(num('mat-12')).toBe(odd);
    let strip = 0;
    for (let i = 0; i < 4; i++) for (let j = i; j < 4; j++) strip += 1;
    expect(num('mat-13')).toBe(strip);
    let digits = 0;
    let pages = 0;
    while (digits < 192) {
      pages += 1;
      digits += String(pages).length;
    }
    expect(digits).toBe(192); // el conteo cae exacto
    expect(num('mat-15')).toBe(pages);
  });

  it('retos mixtos', () => {
    const paths = [[1, 1, 1], [1, 0, 0], [1, 0, 0]];
    for (let r = 1; r < 3; r++) for (let c = 1; c < 3; c++) paths[r]![c] = paths[r - 1]![c]! + paths[r]![c - 1]!;
    expect(num('mix-02')).toBe(paths[2]![2]);
    let threes = 0;
    for (let i = 1; i <= 50; i++) threes += [...String(i)].filter((d) => d === '3').length;
    expect(num('mix-03')).toBe(threes);
    const rule = [1];
    while (rule.length < 6) {
      const last = rule[rule.length - 1]!;
      rule.push(last % 2 === 1 ? last + 5 : last / 2);
    }
    expect(seq('mix-04')).toEqual(rule.map(String));
    expect(num('mix-05')).toBe(18 + 15 - (30 - 5));
    const values: Record<string, number> = { a: 2 ** 5, b: 5 ** 2, c: 3 ** 3, d: 4 ** 2 };
    expect(order('mix-06')).toEqual(Object.keys(values).sort((x, y) => values[x]! - values[y]!));
    const minutes = 8 * 60 + 45 + 2 * 60 + 35;
    expect(textAnswers('mix-07')).toContain(`${Math.floor(minutes / 60)}:${minutes % 60}`);
    let squares = 0;
    for (let size = 1; size <= 3; size++) squares += (3 - size + 1) ** 2;
    expect(num('mix-08')).toBe(squares);
    let sevens = 0;
    for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (a + b === 7) sevens += 1;
    expect(num('mix-10')).toBe(sevens);
  });

  it('jarras de 3 y 5 litros: el mínimo es 6 movimientos (mix-09)', () => {
    const key = (a: number, b: number) => `${a},${b}`;
    const dist = new Map<string, number>([[key(0, 0), 0]]);
    const queue: [number, number][] = [[0, 0]];
    let best = -1;
    while (queue.length && best < 0) {
      const [a, b] = queue.shift()!;
      const d = dist.get(key(a, b))!;
      if (a === 4 || b === 4) {
        best = d;
        break;
      }
      const pourAB = Math.min(a, 5 - b);
      const pourBA = Math.min(b, 3 - a);
      const nexts: [number, number][] = [
        [3, b],
        [a, 5],
        [0, b],
        [a, 0],
        [a - pourAB, b + pourAB],
        [a + pourBA, b - pourBA],
      ];
      for (const [na, nb] of nexts) {
        if (!dist.has(key(na, nb))) {
          dist.set(key(na, nb), d + 1);
          queue.push([na, nb]);
        }
      }
    }
    expect(num('mix-09')).toBe(best);
  });
});

describe('estructura del banco', () => {
  it('ningún ejercicio depende de una respuesta que no se puede calificar sola', () => {
    const open = ALL_QUESTIONS.filter((x) => x.answer.kind === 'reference');
    expect(open.map((x) => x.id)).toEqual([]); // en el examen solo se califica la respuesta final
  });

  it('todos los ejercicios de opción tienen una clave correcta que existe', () => {
    for (const question of ALL_QUESTIONS) {
      if (question.answer.kind === 'choice') {
        const correct = question.answer.correct;
        expect(question.options!.map((o) => o.key)).toContain(correct);
      }
    }
  });
});
