import type { Question } from '@/core/types';
import { LESSONS } from './lessons';
import { MODULES } from './modules';
import { importOfficialQuestion, type OfficialQuestionInput } from './official/importer';
import officialRaw from './official/official-questions.json';
import { ALGORITMOS } from './questions/algoritmos';
import { DEPURACION } from './questions/depuracion';
import { LOGICA } from './questions/logica';
import { MATEMATICAS } from './questions/matematicas';
import { MIXTOS } from './questions/mixtos';
import { PATRONES } from './questions/patrones';

/** Se incrementa cada vez que cambia el contenido empaquetado. */
export const CONTENT_VERSION = 2;

export const ORIGINAL_QUESTIONS: Question[] = [
  ...PATRONES,
  ...LOGICA,
  ...ALGORITMOS,
  ...MATEMATICAS,
  ...DEPURACION,
  ...MIXTOS,
];

export const OFFICIAL_QUESTIONS: Question[] = (officialRaw as OfficialQuestionInput[]).map((q) =>
  importOfficialQuestion(
    q,
    MODULES.map((m) => m.id),
  ),
);

export const ALL_QUESTIONS: Question[] = [...ORIGINAL_QUESTIONS, ...OFFICIAL_QUESTIONS];

export { LESSONS, MODULES };
