# OIEG Quest

**Entrena tu mente. Supera el reto.**

Aplicación Android (React Native + Expo) para que estudiantes de alrededor de 12 años se preparen para la **Olimpiada de Informática del Estado de Guanajuato (OIEG) 2026–2027**, categoría infantil. Funciona sin internet, guarda todo el progreso en SQLite dentro del dispositivo y no recolecta datos personales.

> OIEG Quest es una herramienta independiente de práctica. **No está avalada** por el CIMAT, la Universidad de Guanajuato ni la OIEG. Todos los ejercicios incluidos son **originales** y están marcados como tales.

---

## Funcionalidades

| Área | Qué hace |
| --- | --- |
| Bienvenida | Nombre, lema, explicación, alias opcional (sin correo, teléfono, CURP ni nombre completo), botón «Comenzar a entrenar» y acceso a configuración. |
| Inicio | Saludo con alias, nivel pedagógico (1 Reconocer … 5 Retos cronometrados), XP, racha, progreso global, reto recomendado, repaso pendiente, plan de hoy, «Continuar» la última actividad o el simulacro en curso y acceso al simulador. Todo sale de SQLite. |
| Diagnóstico | 12 preguntas originales (2 por categoría), sin límite de tiempo. Resultado por categoría y temas recomendados, con un mensaje que aclara que no etiqueta ni predice resultados. |
| Academia | 6 módulos (Detectives de patrones, Lógica y estrategias, Algoritmos sin código, Matemáticas para pensar, Laboratorio de computación, Simulador de olimpiada), 18 lecciones con idea clave, ejemplo resuelto y consejos, práctica con dificultad adaptativa y «Repetir ejercicios fallados». |
| Ejercicios | 10 tipos: opción múltiple, verdadero/falso, numérica, texto normalizado, secuencias, ordenamiento de instrucciones, seguimiento de algoritmos, cuadrículas y movimientos, detección de errores y respuesta abierta. Pistas progresivas, verificación, explicación, idea clave + otro ejemplo tras un error, registro del intento y repaso programado. |
| Simulador | Simulacro corto (12 preguntas) o completo (30), duración configurable hasta 90 min, temporizador visible, contestadas/pendientes, navegación entre preguntas, guardado automático, confirmación antes de terminar, envío automático al agotarse el tiempo (incluso si la app estaba cerrada), resultados, revisión, explicaciones y temas recomendados. Criterio de puntuación transparente y explícitamente no oficial. |
| Progreso | Resultados por módulo, ejercicios respondidos, % de aciertos, evolución por sesión (gráfica por día), temas a reforzar, errores frecuentes, lecciones completadas, historial de simulacros e insignias. Sin rankings ni comparaciones. |
| Plan | Plan editable desde hoy hasta la primera etapa (12–14 nov 2026): diagnóstico, lecciones diarias, retos, repaso de errores, simulacros parciales, simulacro de 90 min, repaso ligero y luego ruta avanzada. Sesiones de 30–45 min ajustables. |
| Ajustes | Alias, tema (sistema/claro/oscuro), privacidad y cómo borrar los datos, reinicio del progreso con confirmación, estado del contenido local, versión de la base de datos, fuentes oficiales y aviso de independencia. |

Mascota: **Bit**, un robot explorador original dibujado con SVG (también es el icono y el splash).

## Arquitectura

```
expo-router (src/app)  →  pantallas, sin lógica de negocio
        │
components/ + theme/   →  UI reutilizable, tema claro/oscuro, mascota
        │
db/  (repositorios)    →  SQL sobre una interfaz Db mínima
        │                 · expoDb.ts: expo-sqlite en Android
        │                 · test-utils/nodeDb.ts: node:sqlite en pruebas
core/ (TypeScript puro) →  calificación, puntuación, temporizador, niveles,
                           racha, dificultad adaptativa, plan, selección de examen
content/               →  banco empaquetado (módulos, lecciones, 80 ejercicios,
                           insignias, fuentes, importador de preguntas oficiales)
```

- **Offline-first:** el contenido viaja dentro del bundle y se inserta en SQLite al primer arranque. No hay backend, cuentas, anuncios ni analítica.
- **Inicialización idempotente:** `initDatabase` activa claves foráneas, aplica migraciones versionadas pendientes (tabla `schema_migrations` + `PRAGMA user_version`), siembra el contenido con UPSERT (solo si cambió `CONTENT_VERSION`) y cierra simulacros vencidos.
- **Transacciones:** migraciones, siembra, registro de intentos, creación y cierre de simulacros, plan y reinicio de progreso.
- **Errores de almacenamiento:** pantalla dedicada con reintento al fallar la apertura; avisos comprensibles en cada pantalla.
- **AsyncStorage** se usa solo para la preferencia de tema.

## Árbol de archivos

```
app.json · eas.json · package.json · tsconfig.json · eslint.config.js · jest.setup.ts
assets/                     icono, icono adaptativo, monocromo, splash y favicon (originales)
docs/
  CONTENIDO.md              política de contenido, fuentes y material pendiente
  COMPILAR_APK.md           compilación con EAS Build
src/app/                    rutas de Expo Router
  _layout.tsx               proveedores (tema, SQLite) y Stack
  index.tsx                 Bienvenida
  (tabs)/_layout.tsx        navegación inferior
  (tabs)/inicio.tsx · academia.tsx · simulador.tsx · progreso.tsx · ajustes.tsx
  modulo/[id].tsx · leccion/[id].tsx · practica.tsx · diagnostico.tsx · plan.tsx
  examen/[id].tsx · resultado/[id].tsx
src/components/             ui.tsx, Mascot.tsx, ExamTimer.tsx, question/{QuestionStatement,AnswerInput,Feedback}.tsx
src/core/                   types, grading, scoring, timer, progression, plan, exam, dates
src/content/                modules, lessons, questions/*, achievements, sources, official/{importer.ts, official-questions.json}
src/db/                     types, migrations, seed, init, questions, progress, exams, achievements, plan, practice, settings, expoDb, DatabaseProvider
src/hooks/                  useAsyncData, useExamTimer
src/theme/                  colors, ThemeProvider
src/__tests__/              7 suites de pruebas
test-utils/nodeDb.ts        adaptador SQLite para pruebas
```

## Modelo de datos (SQLite)

| Tabla | Contenido principal |
| --- | --- |
| `schema_migrations` | versión, nombre y fecha de cada migración aplicada |
| `modules` | id, posición, título, descripción, icono, color, categoría |
| `lessons` | id, módulo (FK), nivel 1–5, introducción, idea clave, ejemplo, consejos |
| `questions` | id, módulo/lección (FK), categoría, dificultad 1–5, tipo, enunciado, datos, respuesta (JSON), explicación, pistas, tiempo estimado, fuente, `verification_status` (verificada/pendiente), `origin` (original/oficial), `in_diagnostic`, `active` |
| `question_options` | opciones por pregunta (PK compuesta pregunta+clave) |
| `attempts` | pregunta (FK), tipo de actividad, referencia, respuesta, resultado (correcta/incorrecta/vacía/no verificable), tiempo usado, XP, fecha y día local |
| `lesson_progress` | estado, mejor resultado y fecha de cada lección |
| `exam_sessions` | tipo (corto/completo/diagnóstico), inicio, fin, duración, estado (en curso/finalizado/tiempo agotado), puntuación, máximo y desglose por categoría (JSON) |
| `exam_answers` | respuesta y resultado por posición (PK sesión+posición, única sesión+pregunta, borrado en cascada) |
| `achievements` | insignias y fecha de desbloqueo |
| `app_settings` | alias, onboarding, versión de contenido, minutos por sesión, última actividad |
| `review_queue` | repaso espaciado de errores (1, 2, 4, 7 días) |
| `training_plan` | plan editable (día, tipo, minutos, fase, hecho) |

Hay índices por módulo, lección, categoría, día de intento, estado de examen y fecha de repaso, y restricciones `CHECK` para dificultad, tipos de actividad y resultados. No se guarda ningún dato personal además del alias opcional.

## Contenido incluido

- **80 ejercicios originales verificados** — 15 patrones y secuencias, 15 lógica, 15 algoritmos, 15 matemáticas y conteo, 10 seguimiento y depuración, 10 retos mixtos. Esta distribución es una decisión de diseño, no un temario oficial.
- 3 son preguntas abiertas sin calificación automática (se muestra solución de referencia y se explica la limitación).
- 18 lecciones, 12 insignias, 12 preguntas de diagnóstico.
- **0 preguntas oficiales**: los exámenes anteriores se publican como formularios en línea y no se pudieron revisar desde el entorno de desarrollo. Detalles y procedimiento de importación en [`docs/CONTENIDO.md`](docs/CONTENIDO.md).

Cada respuesta numérica de los ejercicios con cálculo (y el camino mínimo de la cuadrícula, con BFS) se recalcula con código independiente en `src/__tests__/content.test.ts`.

## Pruebas

```bash
npm test            # Jest (jest-expo + React Native Testing Library 14)
npm run typecheck   # TypeScript estricto
npm run lint        # ESLint (eslint-config-expo)
```

Las pruebas de base de datos ejecutan el SQL real sobre `node:sqlite` (Node 22.13 o superior). Las pruebas de navegación montan la app completa con Expo Router y una base de datos real en memoria.

| Suite | Cubre |
| --- | --- |
| `grading.test.ts` | corrección de respuestas, normalización de texto, números/fracciones, respuestas vacías, preguntas sin solución verificada |
| `scoring-timer.test.ts` | cálculo de puntuación, desglose, temporizador y agotamiento |
| `progression-plan.test.ts` | XP, niveles, racha, dificultad adaptativa, plan de preparación |
| `database.test.ts` | inicialización repetida, migraciones, prevención de duplicados, restricciones, persistencia y recuperación tras reiniciar, repaso, finalización del examen, envío automático por tiempo, reinicio de progreso, insignias, plan |
| `content.test.ts` | integridad del banco, distribución, verificación independiente de respuestas, importador de preguntas oficiales |
| `examTimer.test.tsx` | cuenta regresiva y envío automático en la interfaz |
| `navigation.test.tsx` | Bienvenida → Inicio → Academia → Módulo → Lección, las 5 pestañas, pantalla de ejercicio y simulacro completo hasta resultados |

## Ejecutar localmente

Requisitos: Node 22.13+ y npm.

```bash
npm install
npx expo start
```

La app usa módulos nativos (SQLite, SVG), así que en un teléfono se recomienda una **development build** (ver abajo) en lugar de Expo Go. Con un emulador Android y el SDK instalados también funciona `npx expo run:android`.

## Generar la APK

Resumen (detalles en [`docs/COMPILAR_APK.md`](docs/COMPILAR_APK.md)):

```bash
npx eas-cli@latest login
npx eas-cli@latest build:configure          # solo la primera vez (vincula el proyecto)
npx eas-cli@latest build -p android --profile preview      # APK de prueba instalable
npx eas-cli@latest build -p android --profile development  # APK de desarrollo (dev client)
```

Al terminar, EAS muestra un enlace y un código QR para descargar el `.apk`. Para instalarlo: `adb install ruta/al/archivo.apk` o abrir el enlace desde el teléfono. No se necesitan variables de entorno.

**Estado:** la APK todavía no se ha compilado. El entorno donde se desarrolló no tiene cuenta de Expo ni acceso al SDK de Android; sí se verificó que el bundle de Android se genera sin errores (`npx expo export --platform android`) y que `expo prebuild` produce el proyecto nativo con el paquete `mx.oiegquest.app`.

## Privacidad

Sin registro, sin CURP, ubicación ni contactos, sin anuncios, compras, chat ni analítica. Los permisos de ubicación, cámara, micrófono, contactos y almacenamiento externo están bloqueados explícitamente en `app.json`. El progreso se borra desde Ajustes › Reiniciar mi progreso, o en Android desde Ajustes › Aplicaciones › OIEG Quest › Almacenamiento › Borrar datos.

## Limitaciones conocidas

- No se ha compilado ni probado la APK en un dispositivo físico (ver arriba).
- No hay preguntas oficiales: falta revisar manualmente los exámenes 2024–2025 y 2025–2026.
- Las preguntas abiertas no se califican automáticamente.
- El criterio de puntuación del simulador es de práctica; no reproduce la calificación oficial.
- Sin sincronización en la nube (fuera del alcance del MVP).
- El permiso `INTERNET` permanece en el manifiesto porque lo agrega React Native; la app no hace peticiones de red.

## Próximos pasos recomendados

1. Compilar la APK de `preview` con EAS y probarla en 2–3 teléfonos Android de distintos tamaños.
2. Revisar a mano los exámenes pasados de la OIEG e importar solo preguntas con fuente y solución verificadas.
3. Validar el banco de ejercicios con un docente o exolímpico y ampliarlo a ~150 ejercicios.
4. Agregar práctica con computadora (editor de pseudocódigo o bloques) para las fases posteriores.
5. Pruebas end-to-end en dispositivo (por ejemplo, Maestro) y CI con `npm test`.
