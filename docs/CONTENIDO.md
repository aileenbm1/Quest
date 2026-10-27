# Contenido de OIEG Quest

## Reglas

1. Ninguna pregunta inventada se presenta como oficial. Todos los ejercicios actuales tienen `origin: 'original'` y la fuente «Ejercicio original de OIEG Quest…».
2. No se incluyen respuestas «oficiales» que no se hayan verificado.
3. Una pregunta sin solución verificable queda en `verification: 'pendiente'`: la app nunca la marca como correcta ni incorrecta; muestra una solución de referencia y explica la limitación.
4. La interfaz distingue con etiquetas: «Ejercicio original de práctica», «Pregunta oficial» y «Pendiente de revisión».
5. La app no afirma estar avalada por CIMAT, la Universidad de Guanajuato ni la OIEG.

## Datos de la convocatoria usados

De la convocatoria 2026–2027 (según la información proporcionada al equipo): categoría infantil (5.º y 6.º de primaria y 1.º de secundaria), primera etapa del 12 al 14 de noviembre de 2026, preguntas de opción múltiple y abiertas, máximo 90 minutos, segunda etapa con preguntas abiertas. La app recomienda confirmar siempre las fechas en el sitio oficial.

## Material oficial revisado y pendiente

| Material | URL | Estado |
| --- | --- | --- |
| Convocatoria 2026–2027 | https://www.cimat.mx/oieg/2026-2027/ | El sitio bloquea el acceso automatizado (robots), no se pudo leer desde el entorno de desarrollo. |
| Exámenes pasados 2025–2026 | https://www.cimat.mx/oieg/2025-2026/?target=examenes-pasados | Se consultó la página índice. Contiene 4 exámenes de 2025 (primer y segundo examen, categorías infantil y mayor) publicados como **Google Forms**. No se indica si hay soluciones publicadas. **Pendiente de revisión manual.** |
| Exámenes pasados 2024–2025 | https://www.cimat.mx/oieg/2024-2025/?target=examenes-pasados | Enlazado desde la página anterior. **Pendiente de revisión manual.** |

La propia página de exámenes recomienda revisarlos todos porque algunos comparten problemas.

## Cómo importar preguntas oficiales revisadas

1. Abre el examen oficial y revisa cada pregunta a mano. No copies documentos completos: incorpora solo las preguntas cuya inclusión sea apropiada y registra su referencia.
2. Agrega cada pregunta a `src/content/official/official-questions.json` con este formato:

```json
{
  "id": "ofi-2025-infantil-1-03",
  "moduleId": "m2-logica",
  "category": "logica",
  "difficulty": 2,
  "type": "opcion_multiple",
  "prompt": "Enunciado revisado…",
  "options": [{ "key": "a", "label": "…" }, { "key": "b", "label": "…" }],
  "answer": { "kind": "choice", "correct": "b" },
  "answerVerified": true,
  "explanation": "Procedimiento…",
  "hints": ["…"],
  "source": "https://www.cimat.mx/oieg/2025-2026/?target=examenes-pasados",
  "examLabel": "Primer examen 2025, categoría infantil, pregunta 3",
  "reviewedBy": "Nombre o iniciales de quien revisó",
  "reviewedAt": "2026-11-01"
}
```

3. Si no existe una solución publicada o verificable, omite `answer` o pon `"answerVerified": false`: la pregunta se importará como **pendiente** y no se calificará.
4. Incrementa `CONTENT_VERSION` en `src/content/index.ts`. Al abrir la app, el contenido se actualiza sin borrar el progreso.
5. Ejecuta `npm test`: el importador (`src/content/official/importer.ts`) rechaza ids sin prefijo `ofi-`, fuentes que no sean de CIMAT/OIEG, módulos o tipos desconocidos y preguntas sin registro de revisión.

## Banco original

| Categoría | Ejercicios | Módulo |
| --- | --- | --- |
| Patrones y secuencias | 15 | Detectives de patrones |
| Lógica | 15 | Lógica y estrategias |
| Algoritmos | 15 | Algoritmos sin código |
| Matemáticas y conteo | 15 | Matemáticas para pensar |
| Seguimiento y depuración | 10 | Laboratorio de computación |
| Retos mixtos | 10 | Simulador de olimpiada |
| **Total** | **80** | |

Cada ejercicio tiene id único, enunciado, categoría, dificultad (1–5), tipo, opciones si aplica, respuesta verificada, explicación, pistas progresivas, tiempo estimado, fuente, estado de verificación y origen. Las respuestas con cálculo se recalculan con código en `src/__tests__/content.test.ts`.
