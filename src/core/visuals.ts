// Dibujos que acompañan al texto de un ejercicio o de una lección. Son datos, no imágenes:
// la app los dibuja con gráficos vectoriales, así funcionan sin internet y se ven nítidos.

export type ShapeName = 'triangle' | 'square' | 'circle' | 'star';

export type FlowNode =
  | { t: 'start' | 'end' | 'step'; text: string }
  /** Pregunta con dos salidas. Sin `no`, la rama «No» continúa con el siguiente bloque. */
  | { t: 'decision'; text: string; si: string; no?: string }
  | { t: 'loop'; text: string; body: FlowNode[] };

export type VisualBody =
  /** Casillas con valores; `?` marca lo que falta. `steps` pone la regla entre casillas (solo en ejemplos resueltos). */
  | { kind: 'tiles'; items: string[]; steps?: string[]; indices?: boolean }
  | { kind: 'shapes'; items: ShapeName[]; ellipsis?: boolean; unknown?: string }
  /** Cuadrados en fila hechos de palillos que comparten lados. */
  | { kind: 'sticks'; figures: number[] }
  /** Puntos formando triángulos (figura k tiene k filas). */
  | { kind: 'dots'; figures: number[] }
  /** Torres de bloques. */
  | { kind: 'towers'; figures: number[] }
  /** Focos: '1' encendido, '0' apagado. */
  | { kind: 'bulbs'; states: string }
  | { kind: 'venn'; left: { label: string; count: number }; right: { label: string; count: number }; outside: number; total: number }
  | { kind: 'clock'; time: string }
  | { kind: 'table'; head: string[]; rows: string[][] }
  | { kind: 'flow'; nodes: FlowNode[] }
  /** Casillas de valor posicional; cada bit es '0', '1' o '?'. */
  | { kind: 'binary'; bits: string; values: number[] }
  | { kind: 'pie'; slices: number }
  | { kind: 'jugs'; capacities: number[] };

export type Visual = VisualBody & {
  /** Descripción para lectores de pantalla. Describe lo que se ve, sin dar la respuesta. */
  alt: string;
  caption?: string;
};
