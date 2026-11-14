import type { SQLiteDatabase } from 'expo-sqlite';

import { calculateImpactScore } from '@/domain/scoring';
import type { Mood, ReasonId } from '@/domain/types';

const DATABASE_VERSION = 2;

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
    // v2 caps how far reasons can move a score, so stored scores are recalculated once.
    const rows = await db.getAllAsync<{ id: string; mood: string; duration_minutes: number; reason_ids: string | null }>(
      `SELECT m.id, m.mood, m.duration_minutes, GROUP_CONCAT(mr.reason_id) AS reason_ids
       FROM meetings m LEFT JOIN meeting_reasons mr ON mr.meeting_id = m.id GROUP BY m.id`,
    );
    await db.withTransactionAsync(async () => {
      for (const row of rows) {
        const reasonIds = row.reason_ids ? (row.reason_ids.split(',') as ReasonId[]) : [];
        const score = calculateImpactScore(row.mood as Mood, row.duration_minutes, reasonIds);
        await db.runAsync('UPDATE meetings SET impact_score = ? WHERE id = ?', score, row.id);
      }
    });
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}
