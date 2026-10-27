import * as SQLite from 'expo-sqlite';
import { DATABASE_NAME } from './init';
import type { Db } from './types';

/** Abre la base de datos real del dispositivo con expo-sqlite. */
export async function openAppDatabase(name: string = DATABASE_NAME): Promise<Db> {
  const db = await SQLite.openDatabaseAsync(name);
  await db.execAsync('PRAGMA journal_mode = WAL');
  return {
    execAsync: (sql) => db.execAsync(sql),
    runAsync: (sql, params = []) => db.runAsync(sql, params),
    getFirstAsync: (sql, params = []) => db.getFirstAsync(sql, params),
    getAllAsync: (sql, params = []) => db.getAllAsync(sql, params),
    withTransactionAsync: (task) => db.withTransactionAsync(task),
  };
}
