import type { SQLiteDatabase } from 'expo-sqlite';

const DATABASE_VERSION = 3;

export async function migrateDatabase(db: SQLiteDatabase) {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = row?.user_version ?? 0;

  if (currentVersion < 1) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS meetings (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        occurred_at TEXT NOT NULL,
        duration_minutes INTEGER NOT NULL,
        meeting_type TEXT NOT NULL,
        people_count INTEGER NOT NULL,
        note TEXT NOT NULL DEFAULT '',
        mood TEXT NOT NULL,
        impact_score REAL NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS meeting_reasons (
        meeting_id TEXT NOT NULL,
        reason_id TEXT NOT NULL,
        PRIMARY KEY (meeting_id, reason_id),
        FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_meetings_occurred_at ON meetings(occurred_at);
    `);
  }

  if (currentVersion < 2) {
    const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(meetings)');
    const names = new Set(columns.map((column) => column.name));
    if (!names.has('decision_status')) await db.execAsync('ALTER TABLE meetings ADD COLUMN decision_status TEXT;');
    if (!names.has('ownership_status')) await db.execAsync('ALTER TABLE meetings ADD COLUMN ownership_status TEXT;');
    if (!names.has('next_step_status')) await db.execAsync('ALTER TABLE meetings ADD COLUMN next_step_status TEXT;');
  }

  if (currentVersion < 3) {
    const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(meetings)');
    const names = new Set(columns.map((column) => column.name));
    if (!names.has('intended_outcome')) await db.execAsync('ALTER TABLE meetings ADD COLUMN intended_outcome TEXT;');
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS quick_pulses (
        id TEXT PRIMARY KEY NOT NULL,
        occurred_at TEXT NOT NULL,
        mood TEXT NOT NULL,
        reason_id TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_quick_pulses_occurred_at ON quick_pulses(occurred_at);
    `);
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}
