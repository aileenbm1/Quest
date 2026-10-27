import { addDays } from '@/core/dates';
import { FIRST_STAGE_START, generatePlan } from '@/core/plan';
import { computeStreak, levelForXp, recommendedDifficulty, xpForAttempt } from '@/core/progression';

describe('progresión', () => {
  it('asigna experiencia y nivel', () => {
    expect(xpForAttempt('correcta', 3)).toBe(16);
    expect(xpForAttempt('vacia', 3)).toBe(0);
    expect(levelForXp(0).level).toBe(1);
    expect(levelForXp(150).name).toBe('Comprender');
    expect(levelForXp(5000).level).toBe(5);
    expect(levelForXp(5000).progress).toBe(1);
  });

  it('calcula la racha de días seguidos', () => {
    expect(computeStreak(['2026-10-25', '2026-10-26', '2026-10-27'], '2026-10-27')).toBe(3);
    expect(computeStreak(['2026-10-25', '2026-10-26'], '2026-10-27')).toBe(2);
    expect(computeStreak(['2026-10-24'], '2026-10-27')).toBe(0);
    expect(computeStreak(['2026-10-31', '2026-11-01'], '2026-11-01')).toBe(2);
  });

  it('sube la dificultad con buen desempeño y la baja con dificultades', () => {
    expect(recommendedDifficulty([])).toBe(1);
    const good = Array.from({ length: 4 }, () => ({ difficulty: 1, correct: true }));
    expect(recommendedDifficulty(good)).toBe(2);
    const struggling = [
      ...Array.from({ length: 3 }, () => ({ difficulty: 2, correct: false })),
      ...good,
    ];
    expect(recommendedDifficulty(struggling)).toBe(1);
  });
});

describe('plan de preparación', () => {
  it('incluye diagnóstico, simulacro completo y repaso ligero antes de la primera etapa', () => {
    const plan = generatePlan('2026-10-27', { sessionMinutes: 40 });
    const kinds = plan.map((p) => p.kind);
    expect(plan[0]?.kind).toBe('diagnostico');
    expect(kinds).toContain('simulacro_completo');
    expect(kinds).toContain('simulacro_corto');
    expect(kinds).toContain('repaso');
    const light = plan.find((p) => p.kind === 'repaso_ligero');
    expect(light?.day).toBe(addDays(FIRST_STAGE_START, -1));
    expect(plan.filter((p) => p.kind === 'evento').map((p) => p.day).sort()).toEqual([
      '2026-11-11', // cierre de registro de escuelas
      '2026-11-12',
      '2026-11-13',
      '2026-11-14',
      '2026-11-21', // segunda etapa
      '2026-11-28', // inicio de capacitaciones
    ]);
    expect(plan.some((p) => p.phase === 'avanzada')).toBe(true);
  });

  it('después de la primera etapa solo propone la ruta avanzada', () => {
    const plan = generatePlan('2026-12-01');
    expect(plan.every((p) => p.phase === 'avanzada')).toBe(true);
  });

  it('respeta sesiones de 30 a 45 minutos', () => {
    const plan = generatePlan('2026-10-27', { sessionMinutes: 120, advancedWeeks: 1 });
    const adv = plan.filter((p) => p.kind === 'avanzado');
    expect(adv.every((p) => p.minutes === 45)).toBe(true);
  });
});
