import type { Db, RunResult, SqlValue } from '@/db/types';

/**
 * Adaptador de pruebas: implementa la interfaz Db con el SQLite integrado
 * en Node (node:sqlite), el mismo motor SQL que usa expo-sqlite en Android.
 */
type Statement = {
  run(...params: SqlValue[]): { changes: number | bigint; lastInsertRowid: number | bigint };
  get(...params: SqlValue[]): unknown;
  all(...params: SqlValue[]): unknown[];
};
type DatabaseSync = { exec(sql: string): void; prepare(sql: string): Statement; close(): void };

const sqlite = (process as unknown as { getBuiltinModule(id: string): { DatabaseSync: new (path: string) => DatabaseSync } })
  .getBuiltinModule('node:sqlite');

export interface TestDb extends Db {
  close(): void;
}

export function openNodeDb(path = ':memory:'): TestDb {
  const raw = new sqlite.DatabaseSync(path);
  const plain = <T>(row: unknown): T => (row ? ({ ...(row as object) } as T) : (row as T));
  let depth = 0;
  return {
    async execAsync(sql) {
      raw.exec(sql);
    },
    async runAsync(sql, params = []): Promise<RunResult> {
      const r = raw.prepare(sql).run(...params);
      return { changes: Number(r.changes), lastInsertRowId: Number(r.lastInsertRowid) };
    },
    async getFirstAsync<T>(sql: string, params: SqlValue[] = []) {
      const row = raw.prepare(sql).get(...params);
      return row === undefined ? null : plain<T>(row);
    },
    async getAllAsync<T>(sql: string, params: SqlValue[] = []) {
      return raw.prepare(sql).all(...params).map((r) => plain<T>(r));
    },
    async withTransactionAsync(task) {
      if (depth > 0) throw new Error('Transacción anidada no permitida');
      depth++;
      raw.exec('BEGIN');
      try {
        await task();
        raw.exec('COMMIT');
      } catch (e) {
        raw.exec('ROLLBACK');
        throw e;
      } finally {
        depth--;
      }
    },
    close() {
      raw.close();
    },
  };
}
