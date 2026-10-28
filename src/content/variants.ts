import { pick, randInt, type VariantMaker } from '@/core/variants';
import type { Visual } from '@/core/visuals';

/**
 * Variantes con otros números para los simulacros. Cada una conserva la idea del ejercicio
 * original y calcula su respuesta con código; `src/__tests__/variants.test.ts` la vuelve a
 * calcular por otro camino con muchas semillas.
 */

const tiles = (items: string[], alt: string): Visual => ({ kind: 'tiles', items, indices: true, alt });
const list = (xs: (number | string)[]) => xs.join(', ');
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

const DAYS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const WORD = 'OLIMPIADA';

export const VARIANT_MAKERS: Record<string, VariantMaker> = {
  // ── Patrones ──────────────────────────────────────────────────────
  'pat-01': (_q, r) => {
    const start = randInt(r, 1, 9);
    const step = randInt(r, 2, 6);
    const seq = range(0, 3).map((i) => start + step * i);
    const next = start + step * 4;
    return {
      prompt: `Completa la secuencia: ${list(seq)}, __`,
      answer: { kind: 'sequence', values: [String(next)] },
      explanation: `Cada número es ${step} más que el anterior: ${seq[3]} + ${step} = ${next}.`,
      hints: ['Resta cada número menos el anterior.', '¿La diferencia es siempre la misma?'],
      visual: tiles([...seq.map(String), '?'], `Secuencia de cinco casillas: ${list(seq)} y una casilla vacía por completar.`),
    };
  },
  'pat-06': (_q, r) => {
    const start = randInt(r, 2, 5);
    const ratio = pick(r, [2, 3]);
    const seq = range(0, 3).map((i) => start * ratio ** i);
    const next = start * ratio ** 4;
    const word = ratio === 2 ? 'el doble' : 'el triple';
    return {
      prompt: `Completa la secuencia: ${list(seq)}, __`,
      answer: { kind: 'sequence', values: [String(next)] },
      explanation: `Cada número es ${word} del anterior: ${seq[3]} × ${ratio} = ${next}.`,
      hints: ['Las diferencias no son iguales. Prueba multiplicar.', `¿Por cuánto se multiplica ${seq[0]} para obtener ${seq[1]}?`],
      visual: tiles([...seq.map(String), '?'], `Secuencia de cinco casillas: ${list(seq)} y una casilla vacía por completar.`),
    };
  },
  'pat-08': (q, r) => {
    const n = randInt(r, 6, 20);
    return {
      prompt: q.prompt.replace(/para \d+ cuadrados en fila/, `para ${n} cuadrados en fila`),
      answer: { kind: 'number', value: 3 * n + 1 },
      explanation: `Cada cuadrado nuevo agrega 3 palillos. Para ${n} cuadrados: 4 + 3 × ${n - 1} = ${3 * n + 1}. Otra forma: 3 × ${n} + 1 = ${3 * n + 1}.`,
      hints: ['¿Cuántos palillos agrega cada cuadrado nuevo?', `Del cuadrado 1 al ${n} hay ${n - 1} cuadrados nuevos.`],
    };
  },
  'pat-09': (_q, r) => {
    const pos = randInt(r, 20, 90);
    const rest = pos % WORD.length;
    const letter = WORD[(pos - 1) % WORD.length]!;
    const why =
      rest === 0
        ? `${pos} entre 9 da ${pos / 9} exacto: la posición ${pos} es la última letra de la palabra, la ${letter}.`
        : `${pos} entre 9 da ${Math.floor(pos / 9)} y sobran ${rest}. La letra número ${rest} de OLIMPIADA es la ${letter}.`;
    return {
      prompt: `Ana escribe la palabra OLIMPIADA una y otra vez, sin espacios: OLIMPIADAOLIMPIADA… ¿Qué letra queda en la posición ${pos}?`,
      answer: { kind: 'text', accepted: [letter] },
      explanation: `OLIMPIADA tiene 9 letras. ${why}`,
      hints: ['Cuenta las letras de OLIMPIADA.', `Calcula el residuo de ${pos} entre 9.`],
    };
  },
  'pat-12': (_q, r) => {
    const today = randInt(r, 0, 6);
    const days = randInt(r, 30, 200);
    const rest = days % 7;
    const target = DAYS[(today + rest) % 7]!;
    return {
      prompt: `Hoy es ${DAYS[today]}. ¿Qué día de la semana será dentro de ${days} días?`,
      answer: { kind: 'text', accepted: [target] },
      explanation: `Los días se repiten cada 7. ${days} entre 7 da ${Math.floor(days / 7)} semanas y sobran ${rest} días. ${rest === 0 ? `Sin días de más, vuelve a ser ${target}.` : `Avanzando ${rest} desde el ${DAYS[today]} llegamos al ${target}.`}`,
      hints: [`Cada 7 días vuelve a ser ${DAYS[today]}.`, `Calcula el residuo de ${days} entre 7 y avanza esos días.`],
    };
  },

  // ── Lógica ────────────────────────────────────────────────────────
  'log-13': (_q, r) => {
    const teams = pick(r, [8, 12, 20, 24, 32, 64]);
    return {
      prompt: `En un torneo de eliminación directa participan ${teams} equipos. En cada partido, el que pierde queda eliminado (no hay empates). ¿Cuántos partidos se juegan hasta tener un campeón?`,
      answer: { kind: 'number', value: teams - 1 },
      explanation: `Cada partido elimina exactamente a un equipo. Para que quede un campeón hay que eliminar ${teams - 1} equipos, así que se juegan ${teams - 1} partidos.`,
    };
  },
  'log-15': (_q, r) => {
    const up = randInt(r, 3, 5);
    const down = randInt(r, 1, up - 1);
    const depth = randInt(r, up + 4, 20);
    // Al empezar el día k está a (k − 1) × (up − down) metros; sale cuando con eso más up llega a depth.
    const net = up - down;
    const day = Math.ceil((depth - up) / net) + 1;
    return {
      prompt: `Una araña está en el fondo de un pozo de ${depth} metros. Cada día sube ${up} metros y cada noche resbala ${down}. ¿En qué día logra salir del pozo?`,
      answer: { kind: 'number', value: day },
      explanation: `Cada día completo (día y noche) avanza ${net} metro${net === 1 ? '' : 's'}. Al terminar la noche ${day - 1} está a ${(day - 1) * net} metros. El día ${day} sube ${up} y llega a ${(day - 1) * net + up}: sale, y ya no resbala.`,
    };
  },

  // ── Algoritmos ────────────────────────────────────────────────────
  'alg-02': (_q, r) => {
    const a = randInt(r, 2, 9);
    const b = randInt(r, 2, 9);
    const c = randInt(r, 2, 4);
    return {
      data: { code: [`1. x ← ${a}`, `2. x ← x + ${b}`, `3. x ← x × ${c}`] },
      answer: { kind: 'number', value: (a + b) * c },
      explanation: `Paso 1: x = ${a}. Paso 2: x = ${a} + ${b} = ${a + b}. Paso 3: x = ${a + b} × ${c} = ${(a + b) * c}.`,
    };
  },
  'alg-03': (_q, r) => {
    const a = randInt(r, 2, 9);
    const b = randInt(r, 1, 6);
    const c = randInt(r, 1, 9);
    return {
      data: { code: [`1. x ← ${a}`, `2. y ← x + ${b}`, `3. x ← ${c}`, '4. y ← y + x'] },
      answer: { kind: 'number', value: a + b + c },
      explanation: `x = ${a}, luego y = ${a} + ${b} = ${a + b}. Después x cambia a ${c} y y = ${a + b} + ${c} = ${a + b + c}.`,
    };
  },
  'alg-05': (_q, r) => {
    const n = randInt(r, 3, 9);
    const terms = range(1, n);
    return {
      data: { code: ['1. s ← 0', `2. Para i desde 1 hasta ${n}:`, '      s ← s + i'] },
      answer: { kind: 'number', value: sum(terms) },
      explanation: `s acumula ${terms.join(' + ')} = ${sum(terms)}.`,
      visual: {
        kind: 'flow',
        alt: `Diagrama de flujo: s empieza en 0. Un ciclo con i desde 1 hasta ${n} repite sumar i a s. Luego termina.`,
        nodes: [
          { t: 'start', text: 's ← 0' },
          { t: 'loop', text: `Para i desde 1 hasta ${n}`, body: [{ t: 'step', text: 's ← s + i' }] },
          { t: 'end', text: 'Fin' },
        ],
      },
    };
  },
  'alg-09': (_q, r) => {
    const n = randInt(r, 2, 8);
    const steps = range(0, n).map((i) => 2 ** i);
    return {
      data: { code: ['1. x ← 1', `2. Repite ${n} veces:`, '      x ← x × 2'] },
      answer: { kind: 'number', value: 2 ** n },
      explanation: `x se duplica ${n} veces: ${steps.join(' → ')}.`,
      visual: {
        kind: 'flow',
        alt: `Diagrama de flujo: x empieza en 1. Un ciclo repite ${n} veces multiplicar x por 2. Luego termina.`,
        nodes: [
          { t: 'start', text: 'x ← 1' },
          { t: 'loop', text: `Repite ${n} veces`, body: [{ t: 'step', text: 'x ← x × 2' }] },
          { t: 'end', text: 'Fin' },
        ],
      },
    };
  },
  'alg-14': (_q, r) => {
    const n = randInt(r, 3, 8);
    const terms = range(1, n);
    return {
      data: { code: [`Para i desde 1 hasta ${n}:`, '   Para j desde 1 hasta i:', '      mostrar «★»'] },
      answer: { kind: 'number', value: sum(terms) },
      explanation: `El ciclo de adentro se repite i veces: ${terms.join(' + ')} = ${sum(terms)} estrellas.`,
      visual: {
        kind: 'flow',
        alt: `Diagrama de flujo con dos ciclos, uno dentro del otro. El ciclo de afuera recorre i desde 1 hasta ${n}. Dentro, el ciclo de j va desde 1 hasta i y en cada vuelta muestra una estrella.`,
        nodes: [
          {
            t: 'loop',
            text: `Para i desde 1 hasta ${n}`,
            body: [{ t: 'loop', text: 'Para j desde 1 hasta i', body: [{ t: 'step', text: 'mostrar «★»' }] }],
          },
        ],
      },
    };
  },

  // ── Matemáticas ───────────────────────────────────────────────────
  'mat-01': (_q, r) => {
    const bags = randInt(r, 3, 6);
    const each = randInt(r, 8, 15);
    const given = randInt(r, 3, 12);
    const total = bags * each;
    return {
      prompt: `Tienes ${bags} bolsas con ${each} canicas cada una y regalas ${given} canicas. ¿Cuántas canicas te quedan?`,
      answer: { kind: 'number', value: total - given },
      explanation: `Total: ${bags} × ${each} = ${total}. Después de regalar ${given}: ${total} − ${given} = ${total - given}.`,
    };
  },
  'mat-04': (_q, r) => {
    const n = randInt(r, 4, 9);
    const terms = range(1, n - 1).reverse();
    return {
      prompt: `${n} amigos se saludan dándose la mano, una vez cada pareja. ¿Cuántos apretones de mano hay en total?`,
      answer: { kind: 'number', value: (n * (n - 1)) / 2 },
      explanation: `El primero saluda a ${n - 1}, el segundo a ${n - 2} nuevos, y así hasta el penúltimo, que saluda a 1: ${terms.join(' + ')} = ${(n * (n - 1)) / 2}.`,
    };
  },
  'mat-05': (_q, r) => {
    const book = randInt(r, 50, 120);
    const notebook = randInt(r, 15, 40);
    const nb = randInt(r, 2, 4);
    const nn = randInt(r, 2, 5);
    const total = nb * book + nn * notebook;
    return {
      prompt: `Un libro cuesta $${book} y un cuaderno $${notebook}. ¿Cuánto pagas por ${nb} libros y ${nn} cuadernos?`,
      answer: { kind: 'number', value: total },
      explanation: `Libros: ${nb} × ${book} = ${nb * book}. Cuadernos: ${nn} × ${notebook} = ${nn * notebook}. Total: ${nb * book} + ${nn * notebook} = ${total} pesos.`,
    };
  },
  'mat-06': (_q, r) => {
    const d = randInt(r, 6, 9);
    const n = randInt(r, 50, 130);
    const q = Math.floor(n / d);
    return {
      prompt: `¿Cuál es el residuo de dividir ${n} entre ${d}?`,
      answer: { kind: 'number', value: n % d },
      explanation: `${d} × ${q} = ${d * q} y ${n} − ${d * q} = ${n % d}. El residuo es ${n % d}.`,
      hints: [`Busca el múltiplo de ${d} más cercano a ${n} sin pasarte.`],
    };
  },
  'mat-09': (_q, r) => {
    const shirts = randInt(r, 2, 6);
    const pants = randInt(r, 2, 6);
    return {
      prompt: `Tienes ${shirts} camisas y ${pants} pantalones. ¿Cuántas combinaciones distintas de una camisa y un pantalón puedes formar?`,
      answer: { kind: 'number', value: shirts * pants },
      explanation: `Cada camisa puede ir con cualquiera de los ${pants} pantalones: ${shirts} × ${pants} = ${shirts * pants}.`,
    };
  },
  'mat-10': (_q, r) => {
    const price = randInt(r, 2, 9);
    const k = randInt(r, 3, 6);
    let m = randInt(r, 7, 12);
    if (m === k) m += 1;
    return {
      prompt: `Si ${k} lápices cuestan $${k * price}, ¿cuánto cuestan ${m} lápices del mismo tipo?`,
      answer: { kind: 'number', value: m * price },
      explanation: `Un lápiz cuesta ${k * price} ÷ ${k} = ${price} pesos. ${m} lápices cuestan ${m} × ${price} = ${m * price}.`,
      hints: ['¿Cuánto cuesta un solo lápiz?'],
    };
  },

  // ── Depuración ────────────────────────────────────────────────────
  'dep-03': (_q, r) => {
    // Cuatro cifras empezando en 1, para que el número tenga de verdad 4 cifras.
    const bits = '1' + range(1, 3).map(() => String(randInt(r, 0, 1))).join('');
    const values = [8, 4, 2, 1];
    const on = values.filter((_, i) => bits[i] === '1');
    return {
      prompt: `¿Cuánto vale el número binario ${bits} en el sistema decimal?`,
      answer: { kind: 'number', value: sum(on) },
      explanation: `Valores de las posiciones (de izquierda a derecha): 8, 4, 2, 1. Hay unos en ${on.join(', ')}: ${on.join(' + ')} = ${sum(on)}.`,
      hints: [`Escribe 8, 4, 2, 1 encima de las cifras ${bits.split('').join(', ')}.`],
      visual: {
        kind: 'binary',
        bits,
        values,
        alt: `Cuatro casillas con el valor de cada posición, de izquierda a derecha: 8, 4, 2 y 1. Las cifras del número binario son ${bits.split('').join(', ')}.`,
      },
    };
  },
  'dep-09': (_q, r) => {
    const n = randInt(r, 3, 8);
    const example = range(1, n).map(() => String(randInt(r, 0, 1))).join('');
    return {
      prompt: `Cada foco puede estar encendido o apagado. ¿Cuántas combinaciones distintas hay con ${n} focos?`,
      answer: { kind: 'number', value: 2 ** n },
      explanation: `Cada foco tiene 2 estados: ${Array(n).fill('2').join(' × ')} = ${2 ** n}. Es lo mismo que contar los números binarios de ${n} cifras.`,
      visual: {
        kind: 'bulbs',
        states: example,
        alt: `${n} focos en fila como ejemplo de una combinación: ${example
          .split('')
          .map((b) => (b === '1' ? 'encendido' : 'apagado'))
          .join(', ')}.`,
        caption: 'Un ejemplo de combinación posible.',
      },
    };
  },

  // ── Mixtos ────────────────────────────────────────────────────────
  'mix-01': (_q, r) => {
    const juices = randInt(r, 2, 5);
    const cookies = randInt(r, 1, juices - 1);
    // Precio del jugo múltiplo de los paquetes, para que el paquete de galletas cueste un entero.
    const juicePrice = cookies * randInt(r, 3, 10);
    const cookiePrice = (juices * juicePrice) / cookies;
    const total = cookies * cookiePrice;
    const packs = cookies === 1 ? 'un paquete' : `${cookies} paquetes`;
    const cost = cookies === 1 ? 'cuesta' : 'cuestan';
    return {
      prompt: `En una tienda, ${juices} cajas de jugo cuestan lo mismo que ${packs} de galletas. Un paquete de galletas cuesta $${cookiePrice}. ¿Cuánto cuesta una caja de jugo?`,
      answer: { kind: 'number', value: juicePrice },
      explanation: `${packs[0]!.toUpperCase()}${packs.slice(1)} de galletas ${cost} ${cookies} × ${cookiePrice} = ${total}. Eso cuestan ${juices} jugos, así que un jugo cuesta ${total} ÷ ${juices} = ${juicePrice}.`,
      hints: [`¿Cuánto ${cost} ${packs} de galletas?`],
    };
  },
  'mix-05': (_q, r) => {
    const both = randInt(r, 3, 9);
    const onlyA = randInt(r, 4, 12);
    const onlyB = randInt(r, 4, 12);
    const none = randInt(r, 1, 6);
    const a = onlyA + both;
    const b = onlyB + both;
    const total = onlyA + onlyB + both + none;
    const some = total - none;
    return {
      prompt: `En un salón hay ${total} estudiantes. ${a} juegan fútbol, ${b} juegan básquetbol y ${none} no juegan ninguno de los dos. ¿Cuántos juegan ambos deportes?`,
      answer: { kind: 'number', value: both },
      explanation: `Juegan al menos un deporte ${total} − ${none} = ${some}. Si sumamos ${a} + ${b} = ${a + b}, los que juegan ambos se contaron dos veces: ${a + b} − ${some} = ${both}.`,
      visual: {
        kind: 'venn',
        left: { label: 'Fútbol', count: a },
        right: { label: 'Básquetbol', count: b },
        outside: none,
        total,
        alt: `Diagrama de dos círculos que se cruzan dentro de un rectángulo de ${total} estudiantes. El círculo de fútbol tiene ${a}, el de básquetbol ${b}, fuera de los dos hay ${none} y en la parte donde se cruzan hay una pregunta.`,
      },
    };
  },
  'mix-10': (q, r) => {
    const target = randInt(r, 3, 11);
    const pairs = range(1, 6)
      .filter((a) => target - a >= 1 && target - a <= 6)
      .map((a) => `(${a},${target - a})`);
    return {
      prompt: `Se lanza un dado normal (caras del 1 al 6) dos veces. ¿En cuántos de los resultados posibles la suma es ${target}?`,
      data: q.data,
      answer: { kind: 'number', value: pairs.length },
      explanation: `Los pares son ${pairs.join(', ')}: ${pairs.length} resultado${pairs.length === 1 ? '' : 's'}.`,
      hints: [`Si el primer dado es ${Math.max(1, target - 6)}, ¿qué debe salir en el segundo?`],
    };
  },
};
