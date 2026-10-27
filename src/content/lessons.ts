import type { Lesson } from '@/core/types';

export const LESSONS: Lesson[] = [
  // ── Módulo 1: Detectives de patrones ──────────────────────────────
  {
    id: 'l-pat-1',
    moduleId: 'm1-patrones',
    position: 1,
    title: 'Secuencias numéricas',
    level: 1,
    intro:
      'Una secuencia es una lista de números que siguen una regla. Tu misión es descubrir la regla para saber qué número sigue.',
    keyIdea:
      'Calcula la diferencia entre cada número y el anterior. Si la diferencia no es constante, prueba si se multiplica o si las diferencias forman su propio patrón.',
    exampleProblem: '¿Qué número sigue? 4, 7, 10, 13, …',
    exampleSolution: [
      'Restamos vecinos: 7 − 4 = 3, 10 − 7 = 3, 13 − 10 = 3.',
      'La regla es «sumar 3».',
      'El siguiente es 13 + 3 = 16.',
    ],
    tips: [
      'Escribe las diferencias debajo de la secuencia.',
      'Comprueba tu regla con TODOS los números, no solo con los dos primeros.',
    ],
  },
  {
    id: 'l-pat-2',
    moduleId: 'm1-patrones',
    position: 2,
    title: 'Patrones que se repiten',
    level: 2,
    intro:
      'Algunos patrones se repiten en ciclos: figuras, letras, días de la semana. Si conoces el tamaño del ciclo, puedes saber qué hay en cualquier posición sin escribirlo todo.',
    keyIdea:
      'Si un ciclo tiene k elementos, la posición n tiene el mismo elemento que la posición «residuo de n entre k». Si el residuo es 0, es el último del ciclo.',
    exampleProblem: 'El patrón ★ ● ★ ● … tiene ciclo de 2. ¿Qué figura está en la posición 9?',
    exampleSolution: [
      'El ciclo es «★ ●», de tamaño 2.',
      '9 entre 2 da cociente 4 y residuo 1.',
      'Residuo 1 → primer elemento del ciclo: ★.',
    ],
    tips: ['Cuenta con cuidado el tamaño del ciclo.', 'Si el residuo es 0, corresponde al último elemento del ciclo.'],
  },
  {
    id: 'l-pat-3',
    moduleId: 'm1-patrones',
    position: 3,
    title: 'Patrones que crecen',
    level: 3,
    intro:
      'En algunos patrones cada figura agrega algo a la anterior: palillos, puntos o cuadros. Encontrar cuánto crece en cada paso te permite llegar a figuras muy lejanas.',
    keyIdea:
      'Haz una tabla: número de figura y cantidad. Si siempre crece lo mismo, la cantidad es «inicio + crecimiento × (pasos)».',
    exampleProblem: 'Figura 1: 5 bloques; figura 2: 8; figura 3: 11. ¿Cuántos bloques tiene la figura 10?',
    exampleSolution: [
      'Crece 3 bloques en cada figura.',
      'De la figura 1 a la 10 hay 9 pasos.',
      '5 + 3 × 9 = 32 bloques.',
    ],
    tips: ['Cuenta los pasos: de la figura 1 a la n hay n − 1 pasos.', 'Revisa tu fórmula con una figura que ya conoces.'],
  },

  // ── Módulo 2: Lógica y estrategias ────────────────────────────────
  {
    id: 'l-log-1',
    moduleId: 'm2-logica',
    position: 1,
    title: 'Verdadero, falso y condiciones',
    level: 1,
    intro:
      'En lógica, una afirmación es verdadera o falsa. Las palabras «y», «o» y «si… entonces» cambian cuándo una frase es verdadera.',
    keyIdea:
      '«A y B» es verdadera solo si ambas lo son. «A o B» es verdadera si al menos una lo es. «Si A entonces B» NO dice que B solo pase cuando ocurre A.',
    exampleProblem: '«Si un número termina en 0, es múltiplo de 5». El 25 es múltiplo de 5. ¿Termina en 0?',
    exampleSolution: [
      'La regla solo dice qué pasa cuando un número termina en 0.',
      'No dice que todos los múltiplos de 5 terminen en 0.',
      'De hecho 25 termina en 5: la conclusión «termina en 0» es falsa.',
    ],
    tips: ['Busca un contraejemplo: un solo caso que rompa la afirmación basta para que sea falsa.'],
  },
  {
    id: 'l-log-2',
    moduleId: 'm2-logica',
    position: 2,
    title: 'Ordenar y asignar con pistas',
    level: 2,
    intro:
      'Muchos acertijos dan pistas sobre personas, lugares u objetos. Organizar la información en una tabla evita confusiones.',
    keyIdea:
      'Empieza por la pista más segura (la que fija algo directamente) y descarta opciones con una tabla de ✓ y ✗.',
    exampleProblem: 'Iris, Joel y Karla eligen rojo, verde y azul, uno cada quien. Iris no elige rojo ni verde. Joel no elige rojo. ¿Qué color elige Karla?',
    exampleSolution: [
      'Iris no elige rojo ni verde → Iris elige azul.',
      'Joel no elige rojo y el azul ya está tomado → Joel elige verde.',
      'A Karla le queda el rojo.',
    ],
    tips: ['Dibuja una tabla con nombres en filas y opciones en columnas.', 'Cada vez que fijes algo, táchalo en toda su fila y columna.'],
  },
  {
    id: 'l-log-3',
    moduleId: 'm2-logica',
    position: 3,
    title: 'Estrategias: el peor caso',
    level: 3,
    intro:
      'Algunos problemas preguntan cuántos intentos «aseguran» algo. Para contestar, imagina que la suerte está en tu contra.',
    keyIdea:
      'Para garantizar un resultado, piensa en el peor caso posible y cuenta un paso más del que necesitaría la mala suerte.',
    exampleProblem: 'En una bolsa hay canicas de 3 colores. ¿Cuántas debes sacar sin ver para asegurar 2 del mismo color?',
    exampleSolution: [
      'Peor caso: sacas una de cada color (3 canicas, todas distintas).',
      'La siguiente canica tiene que repetir algún color.',
      'Respuesta: 3 + 1 = 4 canicas.',
    ],
    tips: ['Pregúntate: «¿qué es lo peor que podría pasar?».', 'Comprueba que con un intento menos NO siempre se logra.'],
  },

  // ── Módulo 3: Algoritmos sin código ───────────────────────────────
  {
    id: 'l-alg-1',
    moduleId: 'm3-algoritmos',
    position: 1,
    title: 'Instrucciones paso a paso',
    level: 1,
    intro:
      'Un algoritmo es una lista de instrucciones claras y ordenadas. Una computadora las sigue exactamente, sin adivinar lo que quisiste decir.',
    keyIdea:
      'En los algoritmos usamos «x ← 5» para decir «guarda 5 en la caja llamada x». Si después escribimos «x ← x + 1», tomamos lo que hay en x, le sumamos 1 y lo guardamos de nuevo en x.',
    exampleProblem: 'x ← 2; x ← x + 3; x ← x × x. ¿Cuánto vale x al final?',
    exampleSolution: ['Después del paso 1, x = 2.', 'Paso 2: x = 2 + 3 = 5.', 'Paso 3: x = 5 × 5 = 25.'],
    tips: ['Sigue los pasos en orden, uno por uno.', 'Anota el valor de cada variable después de cada paso.'],
  },
  {
    id: 'l-alg-2',
    moduleId: 'm3-algoritmos',
    position: 2,
    title: 'Condiciones: si… entonces',
    level: 2,
    intro:
      'Las condiciones permiten que un algoritmo tome decisiones: hace una cosa si algo es verdadero y otra si es falso.',
    keyIdea:
      'Revisa la condición con cuidado. «Mayor que 10» (> 10) no incluye al 10; «mayor o igual que 10» (≥ 10) sí lo incluye.',
    exampleProblem: 'Si n > 10 entonces mostrar «grande», si no mostrar «pequeño». ¿Qué se muestra con n = 10?',
    exampleSolution: ['¿10 > 10? No, 10 es igual, no mayor.', 'La condición es falsa.', 'Se muestra «pequeño».'],
    tips: ['Fíjate en los casos frontera, como el número exacto del límite.'],
  },
  {
    id: 'l-alg-3',
    moduleId: 'm3-algoritmos',
    position: 3,
    title: 'Repeticiones (ciclos)',
    level: 3,
    intro:
      'Un ciclo repite instrucciones varias veces. Puede repetir un número fijo de veces («repite 5 veces») o mientras una condición sea verdadera («mientras n > 1»).',
    keyIdea:
      'Usa una tabla con una fila por vuelta del ciclo y una columna por variable. Así no pierdes la cuenta.',
    exampleProblem: 's ← 0; para i desde 1 hasta 3: s ← s + 2 × i. ¿Cuánto vale s?',
    exampleSolution: ['Vuelta i = 1: s = 0 + 2 = 2.', 'Vuelta i = 2: s = 2 + 4 = 6.', 'Vuelta i = 3: s = 6 + 6 = 12.'],
    tips: ['Cuenta cuántas veces se repite el ciclo antes de empezar.', 'En un ciclo dentro de otro, el de adentro se repite completo en cada vuelta del de afuera.'],
  },

  // ── Módulo 4: Matemáticas para pensar ─────────────────────────────
  {
    id: 'l-mat-1',
    moduleId: 'm4-matematicas',
    position: 1,
    title: 'Problemas de varios pasos',
    level: 2,
    intro:
      'Muchos problemas se resuelven en varios pasos pequeños. Leer con calma y separar los datos evita errores.',
    keyIdea:
      'Subraya qué te preguntan, anota los datos y resuelve una pregunta pequeña a la vez. Al final, verifica que la respuesta tenga sentido.',
    exampleProblem: 'Compras 2 paquetes de 6 galletas y te comes 5. ¿Cuántas quedan?',
    exampleSolution: ['Total de galletas: 2 × 6 = 12.', 'Después de comer 5: 12 − 5 = 7.', 'Quedan 7 galletas.'],
    tips: ['Escribe una oración con tu respuesta para comprobar que contesta la pregunta.'],
  },
  {
    id: 'l-mat-2',
    moduleId: 'm4-matematicas',
    position: 2,
    title: 'Contar sin perder casos',
    level: 3,
    intro:
      'Contar parece fácil, pero cuando hay muchas posibilidades es fácil olvidar o repetir casos. Hay reglas que ayudan.',
    keyIdea:
      'Regla del producto: si una decisión tiene a opciones y otra tiene b, juntas tienen a × b combinaciones. Para no repetir, cuenta en un orden sistemático.',
    exampleProblem: '¿Cuántos números de dos cifras puedes formar con los dígitos 4 y 7, si puedes repetirlos?',
    exampleSolution: ['Primera cifra: 2 opciones (4 o 7).', 'Segunda cifra: 2 opciones.', 'Total: 2 × 2 = 4 (44, 47, 74, 77).'],
    tips: ['Haz una lista ordenada si son pocos casos.', 'Pregúntate si el orden importa y si se puede repetir.'],
  },
  {
    id: 'l-mat-3',
    moduleId: 'm4-matematicas',
    position: 3,
    title: 'Divisibilidad y residuos',
    level: 3,
    intro:
      'Al dividir números enteros obtenemos un cociente y un residuo. Los residuos sirven para estudiar ciclos, días de la semana y últimas cifras.',
    keyIdea:
      'Un número es múltiplo de 3 (o de 9) si la suma de sus cifras lo es. Las últimas cifras de las potencias se repiten en ciclos.',
    exampleProblem: '¿Cuál es el residuo de dividir 47 entre 5?',
    exampleSolution: ['El múltiplo de 5 más cercano por debajo es 45 = 5 × 9.', '47 − 45 = 2.', 'El residuo es 2.'],
    tips: ['El residuo siempre es menor que el divisor.'],
  },

  // ── Módulo 5: Laboratorio de computación ──────────────────────────
  {
    id: 'l-dep-1',
    moduleId: 'm5-laboratorio',
    position: 1,
    title: 'Seguir un programa con una tabla',
    level: 2,
    intro:
      'Seguir un programa (hacer una «prueba de escritorio») significa ejecutarlo a mano, anotando el valor de cada variable.',
    keyIdea:
      'Cuando una variable recibe un nuevo valor, el anterior se pierde. Copiar una variable en otra copia el valor de ese momento, no «la conecta».',
    exampleProblem: 'a ← 3; b ← a; a ← 10. ¿Cuánto vale b?',
    exampleSolution: ['Paso 1: a = 3.', 'Paso 2: b recibe el valor de a en ese momento: b = 3.', 'Paso 3: a cambia a 10, pero b sigue valiendo 3.'],
    tips: ['Haz una columna por variable y escribe una fila por paso.'],
  },
  {
    id: 'l-dep-2',
    moduleId: 'm5-laboratorio',
    position: 2,
    title: 'Encontrar y corregir errores',
    level: 3,
    intro:
      'Un error (en inglés, «bug») hace que un algoritmo dé un resultado distinto al esperado. Depurar es encontrarlo y corregirlo.',
    keyIdea:
      'Prueba el algoritmo con un ejemplo pequeño cuya respuesta ya conoces. Donde el resultado se separa de lo esperado, ahí está el error. Revisa especialmente los límites (< contra ≤) y los valores iniciales.',
    exampleProblem: 'Para sumar 1 + 2 + 3 alguien escribe: s ← 1; para i desde 1 hasta 3: s ← s + i. ¿Qué falla?',
    exampleSolution: ['Probamos: s empieza en 1, luego 2, 4, 7.', 'Esperábamos 6, obtuvimos 7.', 'El valor inicial está mal: debe ser s ← 0.'],
    tips: ['Prueba con el caso más pequeño posible.', 'Revisa el primer y el último paso de cada ciclo.'],
  },
  {
    id: 'l-dep-3',
    moduleId: 'm5-laboratorio',
    position: 3,
    title: 'Números binarios',
    level: 2,
    intro:
      'Las computadoras guardan todo con dos símbolos: 0 y 1. En binario, cada posición vale el doble que la de su derecha: 1, 2, 4, 8, 16…',
    keyIdea:
      'Para pasar de binario a decimal, suma los valores de las posiciones donde hay un 1. Para pasar de decimal a binario, busca qué potencias de 2 suman tu número.',
    exampleProblem: '¿Cuánto vale el binario 101 en decimal?',
    exampleSolution: ['Posiciones de derecha a izquierda: 1, 2, 4.', 'Hay 1 en las posiciones que valen 4 y 1.', '4 + 1 = 5.'],
    tips: ['Escribe los valores 8, 4, 2, 1 encima de las cifras.'],
  },

  // ── Módulo 6: Simulador de olimpiada ──────────────────────────────
  {
    id: 'l-mix-1',
    moduleId: 'm6-simulador',
    position: 1,
    title: 'Estrategia para un examen',
    level: 4,
    intro:
      'En un examen con tiempo límite, administrar el tiempo es tan importante como saber resolver. Esta lección te da un plan sencillo.',
    keyIdea:
      'Primera vuelta: contesta lo que sabes rápido. Segunda vuelta: regresa a las difíciles. Nunca dejes una pregunta de opción múltiple en blanco si no se restan puntos (consulta las reglas oficiales de tu examen).',
    exampleProblem: 'Tienes 90 minutos y 30 preguntas. ¿Cuánto tiempo puedes dedicar en promedio a cada una?',
    exampleSolution: ['90 ÷ 30 = 3 minutos por pregunta.', 'Si una te toma más de 5 minutos, márcala y sigue.', 'Deja 10 minutos al final para revisar.'],
    tips: ['Lee la pregunta completa antes de responder.', 'Revisa que contestaste lo que se pregunta (por ejemplo, «el mayor» y no «el menor»).'],
  },
  {
    id: 'l-mix-2',
    moduleId: 'm6-simulador',
    position: 2,
    title: 'Problemas abiertos',
    level: 4,
    intro:
      'En una pregunta abierta escribes tu respuesta en lugar de elegirla. A veces también debes explicar tu procedimiento.',
    keyIdea:
      'Una buena respuesta abierta es precisa: contesta exactamente lo que se pide, con el formato indicado, y si se pide explicación, muestra pasos que otra persona pueda seguir.',
    exampleProblem: 'Explica cómo saber si 1 234 es múltiplo de 3.',
    exampleSolution: ['Sumo sus cifras: 1 + 2 + 3 + 4 = 10.', '10 no es múltiplo de 3.', 'Conclusión: 1 234 no es múltiplo de 3.'],
    tips: ['Numera tus pasos.', 'Termina con una oración que dé la respuesta final.'],
  },
];
