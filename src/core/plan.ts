import { addDays, daysBetween } from './dates';

/** Primera etapa según la convocatoria 2026–2027 (12 al 14 de noviembre de 2026). */
export const FIRST_STAGE_START = '2026-11-12';
export const FIRST_STAGE_END = '2026-11-14';
/** Otras fechas de la convocatoria 2026–2027. */
export const REGISTRATION_DEADLINE = '2026-11-11';
export const SECOND_STAGE_DAY = '2026-11-21';
export const TRAINING_START = '2026-11-28';
export const TRAINING_END = '2027-01-17';

export type PlanKind =
  | 'diagnostico'
  | 'leccion'
  | 'reto'
  | 'repaso'
  | 'simulacro_corto'
  | 'simulacro_completo'
  | 'repaso_ligero'
  | 'evento'
  | 'avanzado';

export type PlanPhase = 'primera_etapa' | 'avanzada';

export interface PlanItem {
  day: string;
  position: number;
  kind: PlanKind;
  title: string;
  minutes: number;
  phase: PlanPhase;
}

export const PLAN_KIND_LABELS: Record<PlanKind, string> = {
  diagnostico: 'Diagnóstico',
  leccion: 'Lección del día',
  reto: 'Reto recomendado',
  repaso: 'Repaso de errores',
  simulacro_corto: 'Simulacro parcial',
  simulacro_completo: 'Simulacro completo',
  repaso_ligero: 'Repaso ligero',
  evento: 'Evento',
  avanzado: 'Ruta avanzada',
};

const MODULE_ROTATION = [
  'Detectives de patrones',
  'Lógica y estrategias',
  'Algoritmos sin código',
  'Matemáticas para pensar',
  'Laboratorio de computación',
];

const ADVANCED_TOPICS = [
  'Lógica avanzada: problemas con varias condiciones',
  'Problemas abiertos: explica tu procedimiento por escrito',
  'Práctica con computadora: escribe tus primeros algoritmos en papel y luego en un editor',
  'Seguimiento de ciclos anidados y tablas de valores',
  'Problemas de conteo con casos',
  'Práctica con computadora: depura un programa paso a paso',
];

export function clampSessionMinutes(minutes: number): number {
  if (!Number.isFinite(minutes)) return 30;
  return Math.min(45, Math.max(30, Math.round(minutes)));
}

/**
 * Genera un plan sugerido desde `startDay`. Es una recomendación editable:
 * no impide practicar a otro ritmo ni garantiza resultados.
 */
export function generatePlan(
  startDay: string,
  options: { sessionMinutes?: number; diagnosticDone?: boolean; advancedWeeks?: number } = {},
): PlanItem[] {
  const minutes = clampSessionMinutes(options.sessionMinutes ?? 30);
  const items: PlanItem[] = [];
  const push = (day: string, kind: PlanKind, title: string, mins: number, phase: PlanPhase) => {
    const position = items.filter((i) => i.day === day).length;
    items.push({ day, position, kind, title, minutes: mins, phase });
  };

  const daysToStage = daysBetween(startDay, FIRST_STAGE_START);
  if (daysToStage > 0) {
    let rotation = 0;
    for (let offset = 0; offset < daysToStage; offset++) {
      const day = addDays(startDay, offset);
      const remaining = daysToStage - offset; // días que faltan para la etapa
      if (offset === 0 && !options.diagnosticDone) {
        push(day, 'diagnostico', 'Haz el diagnóstico inicial (unos 15 minutos)', 15, 'primera_etapa');
      }
      if (remaining === 1) {
        push(day, 'repaso_ligero', 'Repaso ligero: lee tus errores frecuentes y descansa bien', 20, 'primera_etapa');
        continue;
      }
      if (remaining === 3 && daysToStage >= 4) {
        push(day, 'simulacro_completo', 'Simulacro completo de hasta 90 minutos', 90, 'primera_etapa');
        continue;
      }
      const moduleName = MODULE_ROTATION[rotation % MODULE_ROTATION.length]!;
      rotation += 1;
      push(day, 'leccion', `Lección: ${moduleName}`, Math.round(minutes / 2), 'primera_etapa');
      if (offset % 4 === 3) {
        push(day, 'simulacro_corto', 'Simulacro parcial (20 minutos)', 20, 'primera_etapa');
      } else {
        push(day, 'reto', 'Reto recomendado', Math.round(minutes / 4), 'primera_etapa');
      }
      if (offset % 2 === 1) {
        push(day, 'repaso', 'Repaso de errores programados', Math.round(minutes / 4), 'primera_etapa');
      }
    }
  }

  if (daysBetween(startDay, REGISTRATION_DEADLINE) >= 0) {
    push(
      REGISTRATION_DEADLINE,
      'evento',
      'Último día para que tu escuela se registre en la OIEG. Pregunta a tu maestra o maestro si ya lo hizo',
      0,
      'primera_etapa',
    );
  }

  const stageEnd = daysBetween(startDay, FIRST_STAGE_END);
  if (stageEnd >= 0) {
    for (let d = Math.max(0, daysToStage); d <= stageEnd; d++) {
      push(addDays(startDay, d), 'evento', 'Primera etapa de la OIEG: consulta tu horario en la convocatoria oficial', 0, 'primera_etapa');
    }
  }

  // Ruta avanzada después de la primera etapa: tres sesiones por semana.
  const advancedStart = stageEnd >= 0 ? addDays(FIRST_STAGE_END, 2) : startDay;
  const weeks = options.advancedWeeks ?? 4;
  let topic = 0;
  for (let w = 0; w < weeks; w++) {
    for (const dayOffset of [0, 2, 4]) {
      const day = addDays(advancedStart, w * 7 + dayOffset);
      const title = ADVANCED_TOPICS[topic % ADVANCED_TOPICS.length]!;
      // Antes de la segunda etapa solo se califica la respuesta final, así que se practica eso.
      const beforeSecond = daysBetween(day, SECOND_STAGE_DAY) > 0 && daysBetween(startDay, day) >= 0;
      push(day, 'avanzado', beforeSecond ? `Rumbo a la segunda etapa (respuestas abiertas): ${title}` : title, minutes, 'avanzada');
      topic += 1;
    }
  }

  if (daysBetween(startDay, SECOND_STAGE_DAY) >= 0) {
    push(
      SECOND_STAGE_DAY,
      'evento',
      'Segunda etapa de la OIEG: sábado de 9:00 a 11:00, en línea, preguntas abiertas (solo se califica la respuesta)',
      0,
      'avanzada',
    );
  }
  if (daysBetween(startDay, TRAINING_START) >= 0) {
    push(
      TRAINING_START,
      'evento',
      'Inicio de las capacitaciones en línea de la tercera etapa (Microsoft Teams, hasta el 17 de enero de 2027)',
      0,
      'avanzada',
    );
  }
  return items;
}
