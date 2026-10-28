import { ALL_QUESTIONS } from '@/content';
import { VARIANT_MAKERS } from '@/content/variants';
import { canonicalResponse, gradeAnswer } from '@/core/grading';
import type { Question } from '@/core/types';
import { materializeQuestion, shuffleOptions } from '@/core/variants';
import { seededRandom } from '@/core/exam';

const byId = (id: string) => ALL_QUESTIONS.find((q) => q.id === id)!;
const nums = (s: string) => (s.match(/\d+/g) ?? []).map(Number);
const SEEDS = Array.from({ length: 300 }, (_, i) => 1 + i * 7919);

/**
 * Para cada variante, la respuesta se vuelve a calcular aquí por otro camino (simulando o
 * contando), leyendo los números del enunciado que ve el estudiante.
 */
const SOLVERS: Record<string, (q: Question) => string> = {
  'pat-01': (q) => {
    const s = nums(q.prompt);
    return String(s[3]! + (s[1]! - s[0]!));
  },
  'pat-06': (q) => {
    const s = nums(q.prompt);
    return String(s[3]! * (s[1]! / s[0]!));
  },
  'pat-08': (q) => {
    const n = nums(q.prompt).at(-1)!;
    // Simula: el primer cuadrado usa 4 palillos y cada uno nuevo comparte uno.
    let sticks = 4;
    for (let k = 2; k <= n; k++) sticks += 3;
    return String(sticks);
  },
  'pat-09': (q) => {
    const pos = nums(q.prompt).at(-1)!;
    return 'OLIMPIADA'.repeat(20)[pos - 1]!;
  },
  'pat-12': (q) => {
    const days = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
    let i = days.findIndex((d) => q.prompt.startsWith(`Hoy es ${d}.`));
    for (let k = 0; k < nums(q.prompt)[0]!; k++) i = (i + 1) % 7;
    return days[i]!;
  },
  'log-13': (q) => {
    let teams = nums(q.prompt)[0]!;
    let games = 0;
    while (teams > 1) {
      const played = Math.floor(teams / 2);
      games += played;
      teams -= played;
    }
    return String(games);
  },
  'log-15': (q) => {
    const [depth, up, down] = nums(q.prompt) as [number, number, number];
    let h = 0;
    for (let day = 1; ; day++) {
      h += up;
      if (h >= depth) return String(day);
      h -= down;
    }
  },
  'alg-02': (q) => {
    const [a, b, c] = q.data!.code!.map((l) => nums(l).at(-1)!);
    let x = a!;
    x += b!;
    x *= c!;
    return String(x);
  },
  'alg-03': (q) => {
    const code = q.data!.code!;
    const x0 = nums(code[0]!).at(-1)!;
    const y = x0 + nums(code[1]!).at(-1)!;
    const x1 = nums(code[2]!).at(-1)!;
    return String(y + x1);
  },
  'alg-05': (q) => {
    const n = nums(q.data!.code![1]!).at(-1)!;
    let s = 0;
    for (let i = 1; i <= n; i++) s += i;
    return String(s);
  },
  'alg-09': (q) => {
    const n = nums(q.data!.code![1]!).at(-1)!;
    let x = 1;
    for (let k = 0; k < n; k++) x *= 2;
    return String(x);
  },
  'alg-14': (q) => {
    const n = nums(q.data!.code![0]!).at(-1)!;
    let stars = 0;
    for (let i = 1; i <= n; i++) for (let j = 1; j <= i; j++) stars++;
    return String(stars);
  },
  'mat-01': (q) => {
    const [bags, each, given] = nums(q.prompt) as [number, number, number];
    return String(bags * each - given);
  },
  'mat-04': (q) => {
    const n = nums(q.prompt)[0]!;
    let count = 0;
    for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) count++;
    return String(count);
  },
  'mat-05': (q) => {
    const [book, notebook, nb, nn] = nums(q.prompt) as [number, number, number, number];
    return String(book * nb + notebook * nn);
  },
  'mat-06': (q) => {
    const [n, d] = nums(q.prompt) as [number, number];
    let r = n;
    while (r >= d) r -= d;
    return String(r);
  },
  'mat-09': (q) => {
    const [a, b] = nums(q.prompt) as [number, number];
    let combos = 0;
    for (let i = 0; i < a; i++) for (let j = 0; j < b; j++) combos++;
    return String(combos);
  },
  'mat-10': (q) => {
    const [k, cost, m] = nums(q.prompt) as [number, number, number];
    return String((cost / k) * m);
  },
  'dep-03': (q) => String(parseInt(q.prompt.match(/binario ([01]+)/)![1]!, 2)),
  'dep-09': (q) => {
    const n = nums(q.prompt)[0]!;
    // Cuenta todas las cadenas de n focos.
    let count = 0;
    for (let mask = 0; mask < 1 << n; mask++) count++;
    return String(count);
  },
  'mix-01': (q) => {
    const [juices, , cookiePrice] = nums(q.prompt) as [number, number, number];
    const cookies = /un paquete/.test(q.prompt.split('.')[0]!) ? 1 : nums(q.prompt)[1]!;
    const price = /un paquete/.test(q.prompt.split('.')[0]!) ? nums(q.prompt)[1]! : cookiePrice;
    return String((cookies * price) / juices);
  },
  'mix-05': (q) => {
    const [total, a, b, none] = nums(q.prompt) as [number, number, number, number];
    // Busca cuántos juegan ambos probando todos los valores posibles.
    for (let both = 0; both <= Math.min(a, b); both++) {
      if (a - both + (b - both) + both + none === total) return String(both);
    }
    return 'sin solución';
  },
  'mix-10': (q) => {
    const target = nums(q.prompt).at(-1)!;
    let count = 0;
    for (let x = 1; x <= 6; x++) for (let y = 1; y <= 6; y++) if (x + y === target) count++;
    return String(count);
  },
};

describe('variantes de los simulacros', () => {
  it('cada variante tiene un verificador independiente y usa un ejercicio que existe', () => {
    expect(Object.keys(SOLVERS).sort()).toEqual(Object.keys(VARIANT_MAKERS).sort());
    for (const id of Object.keys(VARIANT_MAKERS)) expect(byId(id)).toBeDefined();
  });

  it.each(Object.keys(VARIANT_MAKERS))('%s: la respuesta coincide con el cálculo independiente en 300 semillas', (id) => {
    const base = byId(id);
    const seen = new Set<string>();
    for (const seed of SEEDS) {
      const v = materializeQuestion(base, seed, VARIANT_MAKERS);
      const canonical = canonicalResponse(v.answer)!;
      expect(gradeAnswer(v, SOLVERS[id]!(v))).toBe('correcta');
      expect(gradeAnswer(v, canonical)).toBe('correcta');
      const text = [v.prompt, v.explanation, ...v.hints, ...(v.data?.code ?? [])].join(' ');
      expect(text).not.toMatch(/undefined|NaN|Infinity/);
      // La explicación termina mostrando la respuesta.
      expect(v.explanation).toContain(canonical.split(',')[0]!.trim());
      expect(v.id).toBe(base.id);
      seen.add(v.prompt + JSON.stringify(v.data ?? null));
    }
    // De verdad cambia: hay muchas versiones distintas.
    expect(seen.size).toBeGreaterThan(5);
  });

  it('la misma semilla da siempre la misma variante (se puede retomar y calificar después)', () => {
    for (const q of ALL_QUESTIONS) {
      expect(materializeQuestion(q, 42, VARIANT_MAKERS)).toEqual(materializeQuestion(q, 42, VARIANT_MAKERS));
    }
  });

  it('sin semilla se muestra el ejercicio original', () => {
    const q = byId('pat-01');
    expect(materializeQuestion(q, null, VARIANT_MAKERS)).toBe(q);
  });
});

describe('opciones revueltas', () => {
  const correctLabel = (q: Question) =>
    q.answer.kind === 'choice' ? q.options!.find((o) => o.key === (q.answer as { correct: string }).correct)!.label : null;

  it('la respuesta correcta sigue siendo la misma opción, con letras a, b, c… en orden', () => {
    const withOptions = ALL_QUESTIONS.filter((q) => q.options && q.answer.kind === 'choice' && !['verdadero_falso', 'cuadricula', 'deteccion_error'].includes(q.type));
    for (const q of withOptions) {
      for (const seed of SEEDS.slice(0, 40)) {
        const s = shuffleOptions(q, seededRandom(seed));
        expect(correctLabel(s)).toBe(correctLabel(q));
        expect(s.options!.map((o) => o.key)).toEqual(q.options!.map((_, i) => 'abcdefgh'[i]));
        expect(s.options!.map((o) => o.label).sort()).toEqual(q.options!.map((o) => o.label).sort());
      }
    }
  });

  it('la letra de la respuesta correcta cambia entre intentos', () => {
    const q = byId('pat-02');
    const letters = new Set(SEEDS.slice(0, 40).map((seed) => (shuffleOptions(q, seededRandom(seed)).answer as { correct: string }).correct));
    expect(letters.size).toBeGreaterThan(2);
  });

  it('«ordena los pasos» conserva la respuesta y no empieza ya ordenado', () => {
    for (const q of ALL_QUESTIONS.filter((x) => x.answer.kind === 'order')) {
      const labelsInOrder = (x: Question) => (x.answer as { order: string[] }).order.map((k) => x.options!.find((o) => o.key === k)!.label);
      for (const seed of SEEDS.slice(0, 40)) {
        const s = shuffleOptions(q, seededRandom(seed));
        expect(labelsInOrder(s)).toEqual(labelsInOrder(q));
        expect(s.options!.map((o) => o.key)).not.toEqual((s.answer as { order: string[] }).order);
      }
    }
  });

  it('no revuelve verdadero/falso, cuadrículas ni «Paso 1, 2…», y deja «No se puede saber» al final', () => {
    for (const id of ['log-01', 'alg-06', 'dep-01']) {
      const q = byId(id);
      expect(shuffleOptions(q, seededRandom(5))).toBe(q);
    }
    for (const seed of SEEDS.slice(0, 40)) {
      const s = shuffleOptions(byId('log-03'), seededRandom(seed));
      expect(s.options!.at(-1)!.label).toBe('No se puede saber');
    }
  });
});
