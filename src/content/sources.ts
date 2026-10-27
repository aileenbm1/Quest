/**
 * Referencias a materiales oficiales. La app NO incluye preguntas oficiales
 * por ahora: los exámenes anteriores se publican como formularios y no se
 * pudo verificar su contenido ni sus soluciones desde el entorno de
 * desarrollo. Ver docs/CONTENIDO.md.
 */
export interface OfficialReference {
  title: string;
  url: string;
  note: string;
  reviewed: boolean;
}

export const OFFICIAL_REFERENCES: OfficialReference[] = [
  {
    title: 'Convocatoria OIEG 2026–2027',
    url: 'https://www.cimat.mx/oieg/2026-2027/',
    note: 'Fechas, categorías y formato de la evaluación. Consulta siempre la versión oficial.',
    reviewed: false,
  },
  {
    title: 'Exámenes pasados (edición 2025–2026)',
    url: 'https://www.cimat.mx/oieg/2025-2026/?target=examenes-pasados',
    note: 'Primer y segundo examen 2025 (categorías infantil y mayor), publicados como formularios en línea. Pendiente de revisión manual.',
    reviewed: false,
  },
  {
    title: 'Exámenes pasados (edición 2024–2025)',
    url: 'https://www.cimat.mx/oieg/2024-2025/?target=examenes-pasados',
    note: 'Pendiente de revisión manual.',
    reviewed: false,
  },
];

export const DISCLAIMER =
  'OIEG Quest es una herramienta independiente de práctica. No está avalada por el CIMAT, la Universidad de Guanajuato ni la Olimpiada de Informática del Estado de Guanajuato.';
