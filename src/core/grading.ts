import type { AnswerSpec, GradeResult, Question } from './types';

/**
 * Normaliza texto para compararlo sin ser demasiado rígidos: ignora
 * mayúsculas, acentos, espacios repetidos y signos de puntuación en los
 * extremos. No cambia el significado de la respuesta.
 */
export function normalizeText(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[\s"'`¿¡,;:!?()]+/, '')
    .replace(/[\s"'`¿¡.,;:!?()]+$/, '')
    .trim();
}

const NUMBER_RE = /^[+-]?(\d+(\.\d+)?|\.\d+)$/;

/**
 * Convierte una respuesta escrita a número. Acepta:
 *  - enteros y decimales con punto o coma ("12", "2.5", "2,5")
 *  - separadores de miles ("1,000", "1 000")
 *  - fracciones ("3/4", "-1/2")
 *  - una unidad al final ("12 metros")
 * Devuelve null si no puede interpretarse de forma inequívoca.
 */
export function parseNumber(raw: string): number | null {
  let s = normalizeText(raw);
  if (s === '') return null;
  // Quitar una unidad final formada solo por letras ("12 metros", "5 cm").
  s = s.replace(/\s*[a-zñ]+\.?$/u, '').trim();
  // Separadores de miles con espacio: "1 000" -> "1000".
  if (/^[+-]?\d{1,3}( \d{3})+$/.test(s)) s = s.replace(/ /g, '');
  // Separadores de miles con coma: "1,000" o "12,345,678".
  if (/^[+-]?\d{1,3}(,\d{3})+$/.test(s)) s = s.replace(/,/g, '');
  // Coma decimal: "2,5".
  if (/^[+-]?\d+,\d+$/.test(s)) s = s.replace(',', '.');
  s = s.replace(/\s+/g, '');

  const fraction = /^([+-]?\d+)\/(\d+)$/.exec(s);
  if (fraction) {
    const den = Number(fraction[2]);
    if (den === 0) return null;
    return Number(fraction[1]) / den;
  }
  if (!NUMBER_RE.test(s)) return null;
  const value = Number(s);
  return Number.isFinite(value) ? value : null;
}

export function splitTokens(raw: string): string[] {
  return normalizeText(raw)
    .split(/[\s,;|]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

function tokensEqual(given: string, expected: string): boolean {
  const a = parseNumber(given);
  const b = parseNumber(expected);
  if (a !== null && b !== null) return Math.abs(a - b) < 1e-9;
  return normalizeText(given) === normalizeText(expected);
}

export function isEmptyResponse(response: string | null | undefined): boolean {
  return response === null || response === undefined || response.trim() === '';
}

/** Califica una respuesta contra la especificación de la pregunta. */
export function gradeAnswer(
  question: Pick<Question, 'answer' | 'verification'>,
  response: string | null | undefined,
): GradeResult {
  if (isEmptyResponse(response)) return 'vacia';
  const given = response as string;
  // Una pregunta sin solución verificada nunca se marca como correcta ni incorrecta.
  if (question.verification !== 'verificada') return 'no_verificable';
  return gradeAgainstSpec(question.answer, given);
}

export function gradeAgainstSpec(spec: AnswerSpec, given: string): GradeResult {
  switch (spec.kind) {
    case 'choice':
      return given.trim() === spec.correct ? 'correcta' : 'incorrecta';
    case 'number': {
      const value = parseNumber(given);
      if (value === null) return 'incorrecta';
      const tolerance = spec.tolerance ?? 1e-9;
      return Math.abs(value - spec.value) <= tolerance ? 'correcta' : 'incorrecta';
    }
    case 'text': {
      const norm = normalizeText(given);
      return spec.accepted.some((a) => normalizeText(a) === norm) ? 'correcta' : 'incorrecta';
    }
    case 'sequence': {
      const tokens = splitTokens(given);
      if (tokens.length !== spec.values.length) return 'incorrecta';
      return tokens.every((t, i) => tokensEqual(t, spec.values[i] ?? ''))
        ? 'correcta'
        : 'incorrecta';
    }
    case 'order': {
      const keys = given.split(',').map((k) => k.trim()).filter(Boolean);
      if (keys.length !== spec.order.length) return 'incorrecta';
      return keys.every((k, i) => k === spec.order[i]) ? 'correcta' : 'incorrecta';
    }
    case 'reference':
      return 'no_verificable';
  }
}

/** Respuesta canónica correcta en el formato que produce la interfaz. */
export function canonicalResponse(spec: AnswerSpec): string | null {
  switch (spec.kind) {
    case 'choice':
      return spec.correct;
    case 'number':
      return String(spec.value);
    case 'text':
      return spec.accepted[0] ?? null;
    case 'sequence':
      return spec.values.join(', ');
    case 'order':
      return spec.order.join(',');
    case 'reference':
      return null;
  }
}

/** Texto legible de la respuesta correcta, para mostrar después de responder. */
export function describeCorrectAnswer(question: Pick<Question, 'answer' | 'options'>): string {
  const spec = question.answer;
  const label = (key: string) => question.options?.find((o) => o.key === key)?.label ?? key;
  switch (spec.kind) {
    case 'choice':
      return label(spec.correct);
    case 'number':
      return String(spec.value);
    case 'text':
      return spec.accepted[0] ?? '';
    case 'sequence':
      return spec.values.join(', ');
    case 'order':
      return spec.order.map((k, i) => `${i + 1}. ${label(k)}`).join('\n');
    case 'reference':
      return spec.solution;
  }
}

export function describeResponse(question: Pick<Question, 'answer' | 'options'>, response: string | null): string {
  if (isEmptyResponse(response)) return 'Sin respuesta';
  const r = response as string;
  const label = (key: string) => question.options?.find((o) => o.key === key)?.label ?? key;
  if (question.answer.kind === 'choice') return label(r);
  if (question.answer.kind === 'order')
    return r
      .split(',')
      .map((k, i) => `${i + 1}. ${label(k.trim())}`)
      .join('\n');
  return r;
}
