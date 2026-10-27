import { expireOverdueExams } from './exams';
import { getSchemaVersion, runMigrations } from './migrations';
import { seedContent, type ContentBundle, BUNDLED_CONTENT } from './seed';
import { StorageError, type Db } from './types';

export const DATABASE_NAME = 'oieg-quest.db';

export interface InitResult {
  schemaVersion: number;
  migrationsApplied: number[];
  contentSeeded: boolean;
  expiredExams: number[];
}

/**
 * Prepara la base de datos. Es idempotente: puede ejecutarse en cada
 * arranque sin duplicar datos ni perder el progreso.
 */
export async function initDatabase(
  db: Db,
  options: { now?: Date; content?: ContentBundle } = {},
): Promise<InitResult> {
  const now = options.now ?? new Date();
  try {
    await db.execAsync('PRAGMA foreign_keys = ON');
    const migrationsApplied = await runMigrations(db, now);
    const contentSeeded = await seedContent(db, options.content ?? BUNDLED_CONTENT);
    const expiredExams = await expireOverdueExams(db, now);
    return { schemaVersion: await getSchemaVersion(db), migrationsApplied, contentSeeded, expiredExams };
  } catch (error) {
    throw new StorageError('No se pudo preparar el almacenamiento local de la app.', error);
  }
}
