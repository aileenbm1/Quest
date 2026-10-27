export const MAX_EXAM_MINUTES = 90;
export const MIN_EXAM_MINUTES = 5;

export function clampExamMinutes(minutes: number): number {
  if (!Number.isFinite(minutes)) return MAX_EXAM_MINUTES;
  return Math.min(MAX_EXAM_MINUTES, Math.max(MIN_EXAM_MINUTES, Math.round(minutes)));
}

/** Segundos restantes de un examen. Nunca devuelve números negativos. */
export function remainingSeconds(startedAtIso: string, durationSeconds: number, nowMs: number): number {
  const start = Date.parse(startedAtIso);
  if (Number.isNaN(start)) return 0;
  const end = start + durationSeconds * 1000;
  return Math.max(0, Math.ceil((end - nowMs) / 1000));
}

export function isExpired(startedAtIso: string, durationSeconds: number, nowMs: number): boolean {
  return remainingSeconds(startedAtIso, durationSeconds, nowMs) === 0;
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}
