import type { Db } from './types';

export type SettingKey =
  | 'alias'
  | 'onboarded'
  | 'content_version'
  | 'session_minutes'
  | 'last_activity'
  | 'exam_minutes';

export async function getSetting(db: Db, key: SettingKey): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM app_settings WHERE key = ?', [key]);
  return row?.value ?? null;
}

export async function setSetting(db: Db, key: SettingKey, value: string): Promise<void> {
  await db.runAsync(
    'INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, value],
  );
}

export async function deleteSetting(db: Db, key: SettingKey): Promise<void> {
  await db.runAsync('DELETE FROM app_settings WHERE key = ?', [key]);
}

export interface LastActivity {
  label: string;
  pathname: string;
  params?: Record<string, string>;
}

export async function getLastActivity(db: Db): Promise<LastActivity | null> {
  const raw = await getSetting(db, 'last_activity');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LastActivity;
  } catch {
    return null;
  }
}

export async function setLastActivity(db: Db, activity: LastActivity): Promise<void> {
  await setSetting(db, 'last_activity', JSON.stringify(activity));
}
