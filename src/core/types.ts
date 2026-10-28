// Tipos de dominio compartidos por el contenido, la base de datos y la interfaz.

import type { Visual } from './visuals';

export type CategoryId =
  | 'patrones'
  | 'logica'
  | 'algoritmos'
  | 'matematicas'
  | 'depuracion'
  | 'mixtos';

export const CATEGORY_LABELS: Record<CategoryId, string> = {
  patrones: 'Patrones y secuencias',
  logica: 'Lógica',
  algoritmos: 'Algoritmos',
  matematicas: 'Matemáticas y conteo',
  depuracion: 'Seguimiento y depuración',
  mixtos: 'Retos mixtos',
};

export const CATEGORY_IDS = Object.keys(CATEGORY_LABELS) as CategoryId[];

/** Forma en que se presenta la pregunta en pantalla. */
export type QuestionType =
  | 'opcion_multiple'
  | 'verdadero_falso'
  | 'numerica'
  | 'texto'
  | 'secuencia'
  | 'ordenamiento'
  | 'seguimiento'
  | 'cuadricula'
  | 'deteccion_error'
  | 'abierta';

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  opcion_multiple: 'Opción múltiple',
  verdadero_falso: 'Verdadero o falso',
  numerica: 'Respuesta numérica',
  texto: 'Respuesta de texto',
  secuencia: 'Secuencias y patrones',
  ordenamiento: 'Ordena las instrucciones',
  seguimiento: 'Sigue el algoritmo',
  cuadricula: 'Cuadrículas y movimientos',
  deteccion_error: 'Encuentra el error',
  abierta: 'Respuesta abierta',
};

/**
 * Cómo se valida la respuesta. Es independiente de la presentación: por
 * ejemplo, una pregunta de cuadrícula puede validarse como número.
 */
export type AnswerSpec =
  | { kind: 'choice'; correct: string }
  | { kind: 'number'; value: number; tolerance?: number }
  | { kind: 'text'; accepted: string[] }
  | { kind: 'sequence'; values: string[] }
  | { kind: 'order'; order: string[] }
  /** Sin validación automática fiable: solo se muestra una solución de referencia. */
  | { kind: 'reference'; solution: string };

export type VerificationStatus = 'verificada' | 'pendiente';
export type ContentOrigin = 'original' | 'oficial';

export interface QuestionOption {
  key: string;
  label: string;
}

export interface QuestionData {
  /** Texto adicional con los datos necesarios (tablas, listas, etc.). */
  text?: string;
  /** Pseudocódigo o pasos numerados, mostrados en fuente monoespaciada. */
  code?: string[];
  /** Cuadrícula: cada cadena es una fila; cada carácter, una celda. */
  grid?: string[];
  /** Leyenda para interpretar la cuadrícula. */
  gridLegend?: string;
  /** Unidad o formato esperado de la respuesta (p. ej. "metros"). */
  answerHint?: string;
}

export interface Question {
  id: string;
  moduleId: string;
  lessonId: string | null;
  category: CategoryId;
  /** 1 = Reconocer … 5 = Retos cronometrados. */
  difficulty: 1 | 2 | 3 | 4 | 5;
  type: QuestionType;
  prompt: string;
  data?: QuestionData;
  /** Opciones (para opción múltiple, verdadero/falso, detección de error y ordenamiento). */
  options?: QuestionOption[];
  answer: AnswerSpec;
  explanation: string;
  hints: string[];
  estimatedSeconds: number;
  source: string;
  verification: VerificationStatus;
  origin: ContentOrigin;
  inDiagnostic?: boolean;
  /** Ejercicio del nivel 0 «Aprender jugando»: muy fácil, para quien empieza desde cero. */
  starter?: boolean;
  /**
   * Dibujo propio de una variante con otros números. Si no está, se usa el dibujo del
   * ejercicio original; `null` significa que la variante no lleva dibujo.
   */
  visual?: Visual | null;
}

export interface Lesson {
  id: string;
  moduleId: string;
  position: number;
  title: string;
  level: 1 | 2 | 3 | 4 | 5;
  intro: string;
  keyIdea: string;
  exampleProblem: string;
  exampleSolution: string[];
  tips: string[];
}

export interface Module {
  id: string;
  position: number;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  color: string;
  category: CategoryId;
}

export type GradeResult = 'correcta' | 'incorrecta' | 'vacia' | 'no_verificable';

export type ActivityType = 'leccion' | 'practica' | 'repaso' | 'reto' | 'diagnostico' | 'simulacro';

export const LEVEL_NAMES: Record<number, string> = {
  0: 'Aprender jugando',
  1: 'Reconocer',
  2: 'Comprender',
  3: 'Aplicar',
  4: 'Varios pasos',
  5: 'Retos cronometrados',
};
