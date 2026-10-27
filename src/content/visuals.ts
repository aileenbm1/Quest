import type { Visual } from '@/core/visuals';

/**
 * Dibujos por identificador de ejercicio (p. ej. «pat-05») o de lección («l-pat-1»).
 * El texto del ejercicio no cambia: el dibujo lo acompaña. Ningún dibujo muestra la respuesta.
 */
const numberTiles = (items: string[], alt: string): Visual => ({ kind: 'tiles', items, indices: true, alt });

export const VISUALS: Record<string, Visual> = {
  // ── Patrones ──────────────────────────────────────────────────────
  'pat-01': numberTiles(['2', '4', '6', '8', '?'], 'Secuencia de cinco casillas: 2, 4, 6, 8 y una casilla vacía por completar.'),
  'pat-02': numberTiles(['5', '10', '15', '20', '?'], 'Secuencia de cinco casillas: 5, 10, 15, 20 y una casilla vacía por completar.'),
  'pat-03': numberTiles(['A', 'C', 'E', 'G', '?'], 'Secuencia de letras: A, C, E, G y una casilla vacía por completar.'),
  'pat-04': numberTiles(['1', '4', '9', '16', '25', '?', '?'], 'Secuencia de siete casillas: 1, 4, 9, 16, 25 y dos casillas vacías por completar.'),
  'pat-05': {
    kind: 'shapes',
    items: ['triangle', 'square', 'circle', 'triangle', 'square', 'circle', 'triangle', 'square', 'circle'],
    ellipsis: true,
    unknown: '20',
    alt: 'Figuras que se repiten en este orden: triángulo, cuadrado, círculo, tres veces, y siguen. Al final hay una casilla con la pregunta: qué figura va en la posición 20.',
    caption: 'Rojo = triángulo · Azul = cuadrado · Verde = círculo',
  },
  'pat-06': numberTiles(['3', '6', '12', '24', '?'], 'Secuencia de cinco casillas: 3, 6, 12, 24 y una casilla vacía por completar.'),
  'pat-07': numberTiles(['1', '1', '2', '3', '5', '8', '13', '?'], 'Secuencia de ocho casillas: 1, 1, 2, 3, 5, 8, 13 y una casilla vacía por completar.'),
  'pat-08': {
    kind: 'sticks',
    figures: [1, 2, 3],
    alt: 'Tres figuras hechas con palillos: la primera es un cuadrado, la segunda son dos cuadrados pegados en fila y la tercera son tres cuadrados pegados en fila. Los cuadrados vecinos comparten un palillo.',
  },
  'pat-09': {
    kind: 'tiles',
    items: ['O', 'L', 'I', 'M', 'P', 'I', 'A', 'D', 'A', 'O', 'L', 'I', 'M', 'P', 'I', 'A', 'D', 'A', '…'],
    indices: true,
    alt: 'Las letras de la palabra OLIMPIADA escritas una tras otra, dos veces, con su número de posición debajo. Después hay puntos suspensivos porque sigue repitiéndose.',
  },
  'pat-10': numberTiles(['2', '3', '5', '8', '12', '17', '?'], 'Secuencia de siete casillas: 2, 3, 5, 8, 12, 17 y una casilla vacía por completar.'),
  'pat-11': {
    kind: 'dots',
    figures: [1, 2, 3, 4],
    alt: 'Cuatro figuras hechas con puntos en forma de triángulo: la figura 1 tiene una fila de un punto; la 2, dos filas; la 3, tres filas; la 4, cuatro filas, cada fila con un punto más que la anterior.',
  },
  'pat-12': {
    kind: 'tiles',
    items: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
    alt: 'Los siete días de la semana en orden, de lunes a domingo. Después del domingo vuelve a empezar en lunes.',
    caption: 'Los días se repiten cada 7.',
  },
  'pat-13': numberTiles(['1', '2', '4', '7', '11', '16', '?', '?'], 'Secuencia de ocho casillas: 1, 2, 4, 7, 11, 16 y dos casillas vacías por completar.'),
  'pat-14': numberTiles(['2', '3', '5', '9', '17', '?', '?'], 'Siete casillas numeradas del 1 al 7. Las cinco primeras valen 2, 3, 5, 9 y 17; la sexta y la séptima están vacías.'),

  // ── Lógica ────────────────────────────────────────────────────────
  'log-07': {
    kind: 'table',
    head: ['Caja', 'Lo que sabemos'],
    rows: [
      ['Roja', 'No tiene la manzana'],
      ['Azul', 'Tiene la pera'],
      ['Verde', '?'],
    ],
    alt: 'Tabla de tres cajas. La roja no tiene la manzana, la azul tiene la pera y de la verde no sabemos nada todavía.',
  },
  'log-10': {
    kind: 'table',
    head: ['Persona', 'Lo que sabemos'],
    rows: [
      ['Pedro', 'No tiene perro ni gato'],
      ['Quique', 'No tiene perro'],
      ['Rosa', '?'],
    ],
    alt: 'Tabla de tres personas. Pedro no tiene perro ni gato, Quique no tiene perro y de Rosa no sabemos nada todavía. Las mascotas son perro, gato y pez.',
    caption: 'Mascotas: perro, gato y pez',
  },
  'log-14': {
    kind: 'bulbs',
    states: '00000',
    alt: 'Cinco focos en fila, todos apagados.',
    caption: 'Así empiezan los 5 focos.',
  },

  // ── Algoritmos ────────────────────────────────────────────────────
  'alg-04': {
    kind: 'flow',
    alt: 'Diagrama de flujo: empieza con n igual a 7. Pregunta si n es par. Si es par, n se divide entre 2; si no, n se multiplica por 3 y se suma 1. Luego termina.',
    nodes: [
      { t: 'start', text: 'n ← 7' },
      { t: 'decision', text: '¿n es par?', si: 'n ← n ÷ 2', no: 'n ← 3 × n + 1' },
      { t: 'end', text: 'Fin' },
    ],
  },
  'alg-05': {
    kind: 'flow',
    alt: 'Diagrama de flujo: s empieza en 0. Un ciclo con i desde 1 hasta 5 repite sumar i a s. Luego termina.',
    nodes: [
      { t: 'start', text: 's ← 0' },
      { t: 'loop', text: 'Para i desde 1 hasta 5', body: [{ t: 'step', text: 's ← s + i' }] },
      { t: 'end', text: 'Fin' },
    ],
  },
  'alg-06': {
    kind: 'tiles',
    items: ['↑', '↑', '↑', '→', '→', '→'],
    alt: 'Las instrucciones del robot, en orden: arriba, arriba, arriba, derecha, derecha, derecha.',
    caption: 'Instrucciones del robot, en orden (cada flecha mueve una casilla).',
  },
  'alg-07': {
    kind: 'flow',
    alt: 'Diagrama de flujo con la temperatura t. Si t es mayor que 30, muestra Calor. Si no, pregunta si t es mayor que 15: si lo es, muestra Agradable; si no, muestra Frío.',
    nodes: [
      { t: 'decision', text: '¿t > 30?', si: 'Mostrar «Calor»' },
      { t: 'decision', text: '¿t > 15?', si: 'Mostrar «Agradable»' },
      { t: 'step', text: 'Mostrar «Frío»' },
    ],
  },
  'alg-09': {
    kind: 'flow',
    alt: 'Diagrama de flujo: x empieza en 1. Un ciclo repite 5 veces multiplicar x por 2. Luego termina.',
    nodes: [
      { t: 'start', text: 'x ← 1' },
      { t: 'loop', text: 'Repite 5 veces', body: [{ t: 'step', text: 'x ← x × 2' }] },
      { t: 'end', text: 'Fin' },
    ],
  },
  'alg-10': {
    kind: 'flow',
    alt: 'Diagrama de flujo: n empieza en 20 y c en 0. Mientras n sea mayor que 1, n se divide entre 2 y c aumenta en 1. Luego termina.',
    nodes: [
      { t: 'start', text: 'n ← 20   c ← 0' },
      {
        t: 'loop',
        text: 'Mientras n > 1',
        body: [
          { t: 'step', text: 'n ← n ÷ 2' },
          { t: 'step', text: 'c ← c + 1' },
        ],
      },
      { t: 'end', text: 'Fin' },
    ],
  },
  'alg-14': {
    kind: 'flow',
    alt: 'Diagrama de flujo con dos ciclos, uno dentro del otro. El ciclo de afuera recorre i desde 1 hasta 4. Dentro, el ciclo de j va desde 1 hasta i y en cada vuelta muestra una estrella.',
    nodes: [
      {
        t: 'loop',
        text: 'Para i desde 1 hasta 4',
        body: [{ t: 'loop', text: 'Para j desde 1 hasta i', body: [{ t: 'step', text: 'mostrar «★»' }] }],
      },
    ],
  },
  'alg-15': {
    kind: 'flow',
    alt: 'Diagrama de flujo: n empieza en 11. Mientras n sea mayor o igual que 2, se le resta 2. Después, si n es 0 muestra par y si no muestra impar.',
    nodes: [
      { t: 'start', text: 'n ← 11' },
      { t: 'loop', text: 'Mientras n ≥ 2', body: [{ t: 'step', text: 'n ← n − 2' }] },
      { t: 'decision', text: '¿n = 0?', si: 'mostrar «par»', no: 'mostrar «impar»' },
    ],
  },

  // ── Matemáticas ───────────────────────────────────────────────────
  'mat-08': {
    kind: 'pie',
    slices: 8,
    alt: 'Una pizza redonda cortada en 8 rebanadas iguales.',
    caption: 'La pizza, en 8 rebanadas iguales.',
  },

  // ── Depuración ────────────────────────────────────────────────────
  'dep-03': {
    kind: 'binary',
    bits: '1011',
    values: [8, 4, 2, 1],
    alt: 'Cuatro casillas con el valor de cada posición, de izquierda a derecha: 8, 4, 2 y 1. Las cifras del número binario son 1, 0, 1 y 1.',
  },
  'dep-04': {
    kind: 'binary',
    bits: '????',
    values: [8, 4, 2, 1],
    alt: 'Cuatro casillas vacías con el valor de cada posición, de izquierda a derecha: 8, 4, 2 y 1.',
    caption: 'Cada casilla es un 0 o un 1.',
  },
  'dep-05': {
    kind: 'flow',
    alt: 'Diagrama de flujo: s empieza en 0 e i en 1. Mientras i sea menor que 10, se suma i a s y i aumenta en 1. Al final se muestra s.',
    nodes: [
      { t: 'start', text: 's ← 0   i ← 1' },
      {
        t: 'loop',
        text: 'Mientras i < 10',
        body: [
          { t: 'step', text: 's ← s + i' },
          { t: 'step', text: 'i ← i + 1' },
        ],
      },
      { t: 'end', text: 'mostrar s' },
    ],
  },
  'dep-06': {
    kind: 'flow',
    alt: 'Diagrama de flujo: x empieza en 10. Un ciclo repite 3 veces: restar 3 a x y luego multiplicar x por 2.',
    nodes: [
      { t: 'start', text: 'x ← 10' },
      {
        t: 'loop',
        text: 'Repite 3 veces',
        body: [
          { t: 'step', text: 'x ← x − 3' },
          { t: 'step', text: 'x ← x × 2' },
        ],
      },
      { t: 'end', text: 'Fin' },
    ],
  },
  'dep-07': {
    kind: 'flow',
    alt: 'Diagrama de flujo: se lee n y se calcula r, el residuo de n entre 2. Si r es 1 muestra par; si no, muestra impar.',
    nodes: [
      { t: 'step', text: 'leer n' },
      { t: 'step', text: 'r ← residuo de n entre 2' },
      { t: 'decision', text: '¿r = 1?', si: 'mostrar «par»', no: 'mostrar «impar»' },
    ],
  },
  'dep-09': {
    kind: 'bulbs',
    states: '10110',
    alt: 'Cinco focos en fila como ejemplo de una combinación: encendido, apagado, encendido, encendido, apagado.',
    caption: 'Un ejemplo de combinación posible.',
  },

  // ── Mixtos ────────────────────────────────────────────────────────
  'mix-04': {
    kind: 'flow',
    alt: 'Diagrama de flujo: el número empieza en 1. Se pregunta si el número es impar. Si es impar, se le suma 5; si es par, se divide entre 2.',
    nodes: [
      { t: 'start', text: 'Empieza en 1' },
      { t: 'decision', text: '¿El número es impar?', si: 'Sumar 5', no: 'Dividir entre 2' },
    ],
  },
  'mix-05': {
    kind: 'venn',
    left: { label: 'Fútbol', count: 18 },
    right: { label: 'Básquetbol', count: 15 },
    outside: 5,
    total: 30,
    alt: 'Diagrama de dos círculos que se cruzan dentro de un rectángulo de 30 estudiantes. El círculo de fútbol tiene 18, el de básquetbol 15, fuera de los dos hay 5 y en la parte donde se cruzan hay una pregunta.',
  },
  'mix-07': {
    kind: 'clock',
    time: '8:45',
    alt: 'Un reloj con manecillas que marca las 8:45.',
    caption: 'Hora de salida: 8:45',
  },
  'mix-09': {
    kind: 'jugs',
    capacities: [3, 5],
    alt: 'Dos jarras vacías sin marcas: una de 3 litros y otra de 5 litros.',
  },

  // ── Lecciones (ejemplos resueltos) ────────────────────────────────
  'l-pat-1': {
    kind: 'tiles',
    items: ['4', '7', '10', '13', '?'],
    steps: ['+3', '+3', '+3', '+3'],
    alt: 'Secuencia 4, 7, 10, 13 y una casilla vacía. Entre cada par de casillas hay una flecha con «más 3».',
  },
  'l-pat-2': {
    kind: 'shapes',
    items: ['star', 'circle', 'star', 'circle'],
    ellipsis: true,
    unknown: '9',
    alt: 'Estrella, círculo, estrella, círculo, y sigue repitiéndose. Al final hay una casilla con la pregunta: qué figura va en la posición 9.',
  },
  'l-pat-3': {
    kind: 'towers',
    figures: [5, 8, 11],
    alt: 'Tres torres de bloques: la figura 1 tiene 5 bloques, la figura 2 tiene 8 y la figura 3 tiene 11. Cada torre tiene 3 bloques más que la anterior.',
  },
  'l-log-2': {
    kind: 'table',
    head: ['Persona', 'Lo que sabemos'],
    rows: [
      ['Iris', 'No elige rojo ni verde'],
      ['Joel', 'No elige rojo'],
      ['Karla', '?'],
    ],
    alt: 'Tabla de tres personas y los colores rojo, verde y azul. Iris no elige rojo ni verde, Joel no elige rojo y de Karla no sabemos nada todavía.',
  },
  'l-alg-2': {
    kind: 'flow',
    alt: 'Diagrama de flujo: se pregunta si n es mayor que 10. Si sí, muestra grande; si no, muestra pequeño.',
    nodes: [{ t: 'decision', text: '¿n > 10?', si: 'mostrar «grande»', no: 'mostrar «pequeño»' }],
  },
  'l-alg-3': {
    kind: 'flow',
    alt: 'Diagrama de flujo: s empieza en 0. Un ciclo con i desde 1 hasta 3 suma 2 por i a s.',
    nodes: [
      { t: 'start', text: 's ← 0' },
      { t: 'loop', text: 'Para i desde 1 hasta 3', body: [{ t: 'step', text: 's ← s + 2 × i' }] },
      { t: 'end', text: 'Fin' },
    ],
  },
  'l-dep-3': {
    kind: 'binary',
    bits: '101',
    values: [4, 2, 1],
    alt: 'Tres casillas con el valor de cada posición, de izquierda a derecha: 4, 2 y 1. Las cifras del número binario son 1, 0 y 1.',
  },
};

export const getVisual = (id: string): Visual | undefined => VISUALS[id];
