import { ALL_QUESTIONS } from '@/content';
import { pickExamQuestions, seededRandom } from '@/core/exam';
import { buildModulePath, isLevelOpen, pathLevel, requiredToPass } from '@/core/path';

const q = (id: string, difficulty: 1 | 2 | 3 | 4 | 5, starter = false) => ({ id, difficulty, starter });

describe('camino de niveles con candados', () => {
  const module = [q('s1', 1, true), q('s2', 1, true), q('s3', 1, true), q('a', 1), q('b', 1), q('c', 2), q('d', 4)];

  it('al empezar solo está abierto el nivel 0', () => {
    const path = buildModulePath(module, new Set());
    expect(path.map((s) => [s.level, s.status])).toEqual([
      [0, 'abierto'],
      [1, 'bloqueado'],
      [2, 'bloqueado'],
      [4, 'bloqueado'], // el nivel 3 no tiene ejercicios: se omite
    ]);
    expect(isLevelOpen(path, 0)).toBe(true);
    expect(isLevelOpen(path, 1)).toBe(false);
  });

  it('completar un nivel (60 % bien resuelto) abre el siguiente, y solo ese', () => {
    expect(requiredToPass(3)).toBe(2);
    expect(requiredToPass(1)).toBe(1);
    const path = buildModulePath(module, new Set(['s1', 's3']));
    expect(path.map((s) => s.status)).toEqual(['completado', 'abierto', 'bloqueado', 'bloqueado']);
    expect(path[0]).toMatchObject({ solved: 2, required: 2, total: 3, name: 'Aprender jugando' });
  });

  it('un nivel avanzado resuelto antes de tiempo (p. ej. en un simulacro) sigue con candado', () => {
    const path = buildModulePath(module, new Set(['c', 'd']));
    expect(path.find((s) => s.level === 4)?.status).toBe('bloqueado');
  });

  it('los ejercicios del nivel 0 pertenecen al nivel 0 aunque su dificultad sea 1', () => {
    expect(pathLevel(q('x', 1, true))).toBe(0);
    expect(pathLevel(q('x', 3))).toBe(3);
  });

  it('todos los módulos empiezan en el nivel 0 con 4 ejercicios', () => {
    for (const moduleId of new Set(ALL_QUESTIONS.map((x) => x.moduleId))) {
      const path = buildModulePath(ALL_QUESTIONS.filter((x) => x.moduleId === moduleId), new Set());
      expect(path[0]).toMatchObject({ level: 0, total: 4, status: 'abierto' });
    }
  });
});

describe('simulacros que cambian en cada intento', () => {
  it('no incluyen ejercicios del nivel 0', () => {
    for (let seed = 1; seed <= 20; seed++) {
      expect(pickExamQuestions(ALL_QUESTIONS, 'completo', seededRandom(seed)).some((x) => x.starter)).toBe(false);
    }
  });

  it('evitan las preguntas del simulacro anterior cuando el banco alcanza', () => {
    const first = pickExamQuestions(ALL_QUESTIONS, 'corto', seededRandom(1));
    const second = pickExamQuestions(ALL_QUESTIONS, 'corto', seededRandom(1), [first.map((x) => x.id)]);
    expect(second).toHaveLength(12);
    expect(second.filter((x) => first.some((f) => f.id === x.id))).toHaveLength(0);
  });

  it('en el completo, dos intentos seguidos no repiten preguntas en ninguna categoría con 10 o más', () => {
    const first = pickExamQuestions(ALL_QUESTIONS, 'completo', seededRandom(2));
    const second = pickExamQuestions(ALL_QUESTIONS, 'completo', seededRandom(3), [first.map((x) => x.id)]);
    expect(second).toHaveLength(30);
    expect(second.filter((x) => first.some((f) => f.id === x.id))).toHaveLength(0);
  });

  it('si el banco no alcanza, repite primero las que salieron hace más tiempo', () => {
    const bank = ALL_QUESTIONS.filter((x) => x.category === 'patrones' && !x.starter).slice(0, 3);
    const recent = [[bank[0]!.id], [bank[1]!.id]]; // bank[0] salió en el último, bank[1] en el penúltimo
    const picked = pickExamQuestions(bank, 'corto', seededRandom(4), recent).map((x) => x.id);
    expect(picked.sort()).toEqual([bank[1]!.id, bank[2]!.id].sort());
  });

  it('el orden de las preguntas cambia entre intentos', () => {
    const orders = new Set(
      Array.from({ length: 10 }, (_, i) => pickExamQuestions(ALL_QUESTIONS, 'corto', seededRandom(100 + i)).map((x) => x.category).join()),
    );
    expect(orders.size).toBeGreaterThan(1);
  });
});
