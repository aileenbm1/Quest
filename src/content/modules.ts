import type { Module } from '@/core/types';

export const MODULES: Module[] = [
  {
    id: 'm1-patrones',
    position: 1,
    title: 'Detectives de patrones',
    subtitle: 'Secuencias, figuras y repeticiones',
    description:
      'Un patrón es una regla que se repite. Aquí aprenderás a descubrir la regla escondida en números, letras y figuras para predecir lo que sigue.',
    icon: 'search',
    color: '#7C3AED',
    category: 'patrones',
  },
  {
    id: 'm2-logica',
    position: 2,
    title: 'Lógica y estrategias',
    subtitle: 'Deducir, ordenar y pensar en todos los casos',
    description:
      'La lógica te ayuda a sacar conclusiones seguras a partir de pistas. También verás estrategias para problemas donde debes garantizar un resultado.',
    icon: 'bulb',
    color: '#2563EB',
    category: 'logica',
  },
  {
    id: 'm3-algoritmos',
    position: 3,
    title: 'Algoritmos sin código',
    subtitle: 'Instrucciones, condiciones y ciclos',
    description:
      'Un algoritmo es una lista de pasos precisos para resolver un problema. Sin usar computadora, aprenderás a leerlos, seguirlos y escribirlos.',
    icon: 'git-branch',
    color: '#0891B2',
    category: 'algoritmos',
  },
  {
    id: 'm4-matematicas',
    position: 4,
    title: 'Matemáticas para pensar',
    subtitle: 'Conteo, divisibilidad y problemas de varios pasos',
    description:
      'Problemas donde importa más organizar las ideas que hacer cuentas largas: contar sin perder casos, usar residuos y dividir un problema en partes.',
    icon: 'calculator',
    color: '#DB2777',
    category: 'matematicas',
  },
  {
    id: 'm5-laboratorio',
    position: 5,
    title: 'Laboratorio de computación',
    subtitle: 'Seguimiento de programas, errores y binario',
    description:
      'Piensa como una computadora: sigue programas con una tabla de valores, encuentra errores y descubre cómo se guardan los números con ceros y unos.',
    icon: 'hardware-chip',
    color: '#059669',
    category: 'depuracion',
  },
  {
    id: 'm6-simulador',
    position: 6,
    title: 'Simulador de olimpiada',
    subtitle: 'Retos mixtos y estrategia de examen',
    description:
      'Retos que combinan varios temas y consejos para administrar tu tiempo. Cuando te sientas listo, practica con un simulacro cronometrado.',
    icon: 'trophy',
    color: '#D97706',
    category: 'mixtos',
  },
];
