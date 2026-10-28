import type { Db } from './types';

export interface Migration {
  version: number;
  name: string;
  statements: string[];
}

/**
 * Migraciones versionadas. Nunca se edita una migración ya publicada:
 * los cambios se agregan como una versión nueva.
 */
export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'esquema_inicial',
    statements: [
      `CREATE TABLE modules (
        id TEXT PRIMARY KEY NOT NULL,
        position INTEGER NOT NULL,
        title TEXT NOT NULL,
        subtitle TEXT NOT NULL,
        description TEXT NOT NULL,
        icon TEXT NOT NULL,
        color TEXT NOT NULL,
        category TEXT NOT NULL
      )`,
      `CREATE TABLE lessons (
        id TEXT PRIMARY KEY NOT NULL,
        module_id TEXT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
        position INTEGER NOT NULL,
        title TEXT NOT NULL,
        level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 5),
        intro TEXT NOT NULL,
        key_idea TEXT NOT NULL,
        example_problem TEXT NOT NULL,
        example_solution_json TEXT NOT NULL,
        tips_json TEXT NOT NULL
      )`,
      `CREATE INDEX idx_lessons_module ON lessons(module_id, position)`,
      `CREATE TABLE questions (
        id TEXT PRIMARY KEY NOT NULL,
        module_id TEXT NOT NULL REFERENCES modules(id),
        lesson_id TEXT REFERENCES lessons(id),
        category TEXT NOT NULL,
        difficulty INTEGER NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
        type TEXT NOT NULL,
        prompt TEXT NOT NULL,
        data_json TEXT,
        answer_json TEXT NOT NULL,
        explanation TEXT NOT NULL,
        hints_json TEXT NOT NULL,
        estimated_seconds INTEGER NOT NULL CHECK (estimated_seconds > 0),
        source TEXT NOT NULL,
        verification_status TEXT NOT NULL CHECK (verification_status IN ('verificada', 'pendiente')),
        origin TEXT NOT NULL CHECK (origin IN ('original', 'oficial')),
        in_diagnostic INTEGER NOT NULL DEFAULT 0,
        active INTEGER NOT NULL DEFAULT 1
      )`,
      `CREATE INDEX idx_questions_module ON questions(module_id, difficulty)`,
      `CREATE INDEX idx_questions_lesson ON questions(lesson_id)`,
      `CREATE INDEX idx_questions_category ON questions(category)`,
      `CREATE TABLE question_options (
        question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
        option_key TEXT NOT NULL,
        label TEXT NOT NULL,
        position INTEGER NOT NULL,
        PRIMARY KEY (question_id, option_key)
      )`,
      `CREATE TABLE attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question_id TEXT NOT NULL REFERENCES questions(id),
        activity_type TEXT NOT NULL CHECK (activity_type IN ('leccion', 'practica', 'repaso', 'reto', 'diagnostico', 'simulacro')),
        activity_ref TEXT,
        response TEXT,
        result TEXT NOT NULL CHECK (result IN ('correcta', 'incorrecta', 'vacia', 'no_verificable')),
        time_ms INTEGER NOT NULL DEFAULT 0 CHECK (time_ms >= 0),
        xp INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        day TEXT NOT NULL
      )`,
      `CREATE INDEX idx_attempts_question ON attempts(question_id, created_at)`,
      `CREATE INDEX idx_attempts_day ON attempts(day)`,
      `CREATE TABLE lesson_progress (
        lesson_id TEXT PRIMARY KEY NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
        status TEXT NOT NULL CHECK (status IN ('en_curso', 'completada')),
        best_correct INTEGER NOT NULL DEFAULT 0,
        best_total INTEGER NOT NULL DEFAULT 0,
        completed_at TEXT,
        updated_at TEXT NOT NULL
      )`,
      `CREATE TABLE exam_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kind TEXT NOT NULL CHECK (kind IN ('corto', 'completo', 'diagnostico')),
        started_at TEXT NOT NULL,
        finished_at TEXT,
        duration_seconds INTEGER CHECK (duration_seconds IS NULL OR duration_seconds > 0),
        status TEXT NOT NULL CHECK (status IN ('en_curso', 'finalizado', 'tiempo_agotado')),
        score INTEGER,
        max_score INTEGER,
        breakdown_json TEXT
      )`,
      `CREATE INDEX idx_exam_sessions_status ON exam_sessions(status, started_at)`,
      `CREATE TABLE exam_answers (
        session_id INTEGER NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
        position INTEGER NOT NULL,
        question_id TEXT NOT NULL REFERENCES questions(id),
        response TEXT,
        result TEXT CHECK (result IS NULL OR result IN ('correcta', 'incorrecta', 'vacia', 'no_verificable')),
        answered_at TEXT,
        PRIMARY KEY (session_id, position),
        UNIQUE (session_id, question_id)
      )`,
      `CREATE TABLE achievements (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        icon TEXT NOT NULL,
        position INTEGER NOT NULL,
        unlocked_at TEXT
      )`,
      `CREATE TABLE app_settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      )`,
    ],
  },
  {
    version: 2,
    name: 'repaso_y_plan',
    statements: [
      `CREATE TABLE review_queue (
        question_id TEXT PRIMARY KEY NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
        due_day TEXT NOT NULL,
        step INTEGER NOT NULL DEFAULT 0,
        times_failed INTEGER NOT NULL DEFAULT 1,
        last_failed_at TEXT NOT NULL
      )`,
      `CREATE INDEX idx_review_due ON review_queue(due_day)`,
      `CREATE TABLE training_plan (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        day TEXT NOT NULL,
        position INTEGER NOT NULL,
        kind TEXT NOT NULL,
        title TEXT NOT NULL,
        minutes INTEGER NOT NULL CHECK (minutes >= 0),
        phase TEXT NOT NULL CHECK (phase IN ('primera_etapa', 'avanzada')),
        done INTEGER NOT NULL DEFAULT 0,
        UNIQUE (day, position)
      )`,
    ],
  },
  {
    version: 3,
    name: 'minijuegos',
    statements: [
      `CREATE TABLE game_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game TEXT NOT NULL CHECK (game IN ('numero', 'laberinto', 'ritmo', 'cazabugs')),
        level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 10),
        score INTEGER NOT NULL CHECK (score >= 0),
        max_score INTEGER NOT NULL CHECK (max_score > 0),
        time_ms INTEGER NOT NULL DEFAULT 0 CHECK (time_ms >= 0),
        xp INTEGER NOT NULL DEFAULT 0 CHECK (xp >= 0),
        created_at TEXT NOT NULL,
        day TEXT NOT NULL
      )`,
      `CREATE INDEX idx_game_sessions_game ON game_sessions(game, id)`,
      `CREATE INDEX idx_game_sessions_day ON game_sessions(day)`,
    ],
  },
  {
    version: 4,
    name: 'reto_del_dia',
    statements: [
      `CREATE TABLE daily_challenges (
        day TEXT PRIMARY KEY NOT NULL,
        score INTEGER NOT NULL CHECK (score >= 0),
        max_score INTEGER NOT NULL CHECK (max_score > 0),
        time_ms INTEGER NOT NULL DEFAULT 0 CHECK (time_ms >= 0),
        xp INTEGER NOT NULL DEFAULT 0 CHECK (xp >= 0),
        plays INTEGER NOT NULL DEFAULT 1 CHECK (plays >= 1),
        completed_at TEXT NOT NULL
      )`,
    ],
  },
  {
    version: 5,
    name: 'camino_y_variantes',
    statements: [
      // Ejercicios del nivel 0 «Aprender jugando».
      `ALTER TABLE questions ADD COLUMN starter INTEGER NOT NULL DEFAULT 0`,
      // Semilla de la variante que vio el estudiante (otros números y opciones revueltas).
      `ALTER TABLE exam_answers ADD COLUMN variant_seed INTEGER`,
    ],
  },
];

export const LATEST_SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1]!.version;

/** Aplica las migraciones pendientes. Es seguro llamarla muchas veces. */
export async function runMigrations(db: Db, now: Date = new Date()): Promise<number[]> {
  await db.execAsync(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    )`,
  );
  const rows = await db.getAllAsync<{ version: number }>('SELECT version FROM schema_migrations');
  const applied = new Set(rows.map((r) => r.version));
  const newlyApplied: number[] = [];
  for (const migration of MIGRATIONS) {
    if (applied.has(migration.version)) continue;
    await db.withTransactionAsync(async () => {
      for (const statement of migration.statements) {
        await db.execAsync(statement);
      }
      await db.runAsync('INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)', [
        migration.version,
        migration.name,
        now.toISOString(),
      ]);
    });
    newlyApplied.push(migration.version);
  }
  await db.execAsync(`PRAGMA user_version = ${LATEST_SCHEMA_VERSION}`);
  return newlyApplied;
}

export async function getSchemaVersion(db: Db): Promise<number> {
  const row = await db.getFirstAsync<{ v: number | null }>('SELECT MAX(version) AS v FROM schema_migrations');
  return row?.v ?? 0;
}
