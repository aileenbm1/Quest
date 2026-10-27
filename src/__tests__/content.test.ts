import { ALL_QUESTIONS, LESSONS, MODULES, ORIGINAL_QUESTIONS } from '@/content';
import { importOfficialQuestion, ImportError, type OfficialQuestionInput } from '@/content/official/importer';
import { canonicalResponse, gradeAnswer } from '@/core/grading';
import type { Question } from '@/core/types';

const byId = (id: string) => ALL_QUESTIONS.find((q) => q.id === id)!;

describe('banco de contenido', () => {
  it('tiene entre 60 y 100 ejercicios originales con la distribución de diseño', () => {
    expect(ORIGINAL_QUESTIONS.length).toBeGreaterThanOrEqual(60);
    expect(ORIGINAL_QUESTIONS.length).toBeLessThanOrEqual(100);
    const count = (c: Question['category']) => ORIGINAL_QUESTIONS.filter((q) => q.category === c).length;
    expect(count('patrones')).toBe(15);
    expect(count('logica')).toBe(15);
    expect(count('algoritmos')).toBe(15);
    expect(count('matematicas')).toBe(15);
    expect(count('depuracion')).toBe(10);
    expect(count('mixtos')).toBe(10);
  });

  it('no repite identificadores', () => {
    const ids = ALL_QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(LESSONS.map((l) => l.id)).size).toBe(LESSONS.length);
  });

  it('cubre los 10 tipos de pregunta', () => {
    expect(new Set(ALL_QUESTIONS.map((q) => q.type)).size).toBe(10);
  });

  it.each(ALL_QUESTIONS.map((q) => [q.id, q] as const))('%s tiene todos los campos y es coherente', (_id, q) => {
    expect(q.prompt.trim()).not.toBe('');
    expect(q.explanation.trim()).not.toBe('');
    expect(q.hints.length).toBeGreaterThan(0);
    expect(q.estimatedSeconds).toBeGreaterThan(0);
    expect(q.source).toBeTruthy();
    expect(MODULES.some((m) => m.id === q.moduleId)).toBe(true);
    if (q.lessonId) {
      const lesson = LESSONS.find((l) => l.id === q.lessonId);
      expect(lesson?.moduleId).toBe(q.moduleId);
    }
    if (q.origin === 'original') expect(q.source).toMatch(/original/i);

    const spec = q.answer;
    if (spec.kind === 'choice') expect(q.options?.some((o) => o.key === spec.correct)).toBe(true);
    if (spec.kind === 'order') expect([...spec.order].sort()).toEqual(q.options?.map((o) => o.key).sort());
    if (q.type === 'abierta') expect(spec.kind).toBe('reference');

    // La respuesta canónica debe pasar su propia validación.
    const canonical = canonicalResponse(spec);
    if (canonical !== null && q.verification === 'verificada') {
      expect(gradeAnswer(q, canonical)).toBe('correcta');
    }
  });

  it('el diagnóstico incluye dos preguntas de cada categoría', () => {
    const diag = ALL_QUESTIONS.filter((q) => q.inDiagnostic);
    expect(diag.length).toBe(12);
    for (const m of MODULES) expect(diag.filter((q) => q.category === m.category).length).toBe(2);
  });
});

describe('verificación independiente de respuestas', () => {
  it('alg-11: el camino más corto en la cuadrícula mide 8 (BFS)', () => {
    const grid = byId('alg-11').data!.grid!;
    const find = (ch: string) => {
      const r = grid.findIndex((row) => row.includes(ch));
      return [r, grid[r]!.indexOf(ch)] as const;
    };
    const [sr, sc] = find('R');
    const [tr, tc] = find('M');
    const dist = new Map<string, number>([[`${sr},${sc}`, 0]]);
    const queue: [number, number][] = [[sr, sc]];
    while (queue.length) {
      const [r, c] = queue.shift()!;
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nr = r + dr;
        const nc = c + dc;
        const cell = grid[nr]?.[nc];
        if (!cell || cell === '#' || dist.has(`${nr},${nc}`)) continue;
        dist.set(`${nr},${nc}`, dist.get(`${r},${c}`)! + 1);
        queue.push([nr, nc]);
      }
    }
    expect(dist.get(`${tr},${tc}`)).toBe(8);
    expect(byId('alg-11').answer).toEqual({ kind: 'number', value: 8 });
  });

  it('alg-06: el robot termina en B', () => {
    const grid = byId('alg-06').data!.grid!;
    let r = grid.findIndex((row) => row.includes('R'));
    let c = grid[r]!.indexOf('R');
    for (const m of '↑↑↑→→→') {
      if (m === '↑') r -= 1;
      if (m === '→') c += 1;
    }
    expect(grid[r]![c]).toBe('B');
  });

  it('recalcula respuestas numéricas con código', () => {
    const answers: Record<string, number> = {
      'pat-08': 3 * 10 + 1,
      'pat-14': (() => {
        let x = 2;
        for (let i = 1; i < 7; i++) x = 2 * x - 1;
        return x;
      })(),
      'pat-15': Number(Array.from({ length: 20 }, (_, i) => i + 1).join('')[14]),
      'alg-10': (() => {
        let n = 20;
        let c = 0;
        while (n > 1) {
          n = Math.floor(n / 2);
          c++;
        }
        return c;
      })(),
      'alg-12': (() => {
        let a = 0;
        let b = 1;
        for (let i = 0; i < 6; i++) [a, b] = [b, a + b];
        return b;
      })(),
      'alg-13': Array.from({ length: 20 }, (_, i) => i + 1).filter((n) => n % 3 === 0 && n % 2 !== 0).length,
      'mat-07': Array.from({ length: 100 }, (_, i) => i + 1).filter((n) => n % 3 === 0 || n % 5 === 0).length,
      'mat-12': Array.from({ length: 900 }, (_, i) => i + 100).filter((n) => /^[13579]+$/.test(String(n))).length,
      'mat-14': Number((2n ** 20n).toString().slice(-1)),
      'mat-15': (() => {
        let digits = 0;
        let page = 0;
        while (digits < 192) digits += String(++page).length;
        return page;
      })(),
      'mix-03': Array.from({ length: 50 }, (_, i) => String(i + 1)).join('').split('3').length - 1,
      'mix-10': [1, 2, 3, 4, 5, 6].flatMap((a) => [1, 2, 3, 4, 5, 6].map((b) => a + b)).filter((s) => s === 7).length,
      'dep-06': (() => {
        let x = 10;
        for (let i = 0; i < 3; i++) x = (x - 3) * 2;
        return x;
      })(),
      'dep-03': parseInt('1011', 2),
      'mat-06': 100 % 7,
    };
    for (const [id, value] of Object.entries(answers)) {
      expect({ id, answer: byId(id).answer }).toEqual({ id, answer: { kind: 'number', value } });
    }
    expect(byId('dep-04').answer).toMatchObject({ accepted: expect.arrayContaining([(6).toString(2)]) });
    expect(byId('pat-09').answer).toEqual({ kind: 'text', accepted: ['OLIMPIADA'[(50 - 1) % 9]!] });
  });
});

describe('importador de preguntas oficiales', () => {
  const base: OfficialQuestionInput = {
    id: 'ofi-2025-inf-1',
    moduleId: 'm2-logica',
    category: 'logica',
    difficulty: 2,
    type: 'opcion_multiple',
    prompt: 'Texto revisado de la pregunta',
    options: [
      { key: 'a', label: 'Uno' },
      { key: 'b', label: 'Dos' },
    ],
    source: 'https://www.cimat.mx/oieg/2025-2026/',
    examLabel: 'Primer examen 2025, categoría infantil',
    reviewedBy: 'Equipo',
    reviewedAt: '2026-10-27',
    answerVerified: false,
  };

  it('sin solución verificable la deja pendiente y no la califica', () => {
    const q = importOfficialQuestion({ ...base, answer: { kind: 'choice', correct: 'a' } }, ['m2-logica']);
    expect(q.origin).toBe('oficial');
    expect(q.verification).toBe('pendiente');
    expect(gradeAnswer(q, 'a')).toBe('no_verificable');
    const noAnswer = importOfficialQuestion(base, ['m2-logica']);
    expect(noAnswer.answer.kind).toBe('reference');
  });

  it('con solución verificada sí la califica', () => {
    const q = importOfficialQuestion({ ...base, answer: { kind: 'choice', correct: 'b' }, answerVerified: true }, ['m2-logica']);
    expect(q.verification).toBe('verificada');
    expect(gradeAnswer(q, 'b')).toBe('correcta');
  });

  it('rechaza fuentes no oficiales o sin revisión', () => {
    expect(() => importOfficialQuestion({ ...base, source: 'https://ejemplo.com' }, ['m2-logica'])).toThrow(ImportError);
    expect(() => importOfficialQuestion({ ...base, reviewedBy: '' }, ['m2-logica'])).toThrow(ImportError);
    expect(() => importOfficialQuestion({ ...base, id: 'pat-99' }, ['m2-logica'])).toThrow(ImportError);
  });
});
