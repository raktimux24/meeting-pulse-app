import type { SQLiteDatabase } from 'expo-sqlite';

import { MOOD_CONFIG } from '@/domain/constants';
import { calculateImpactScore } from '@/domain/scoring';
import { INTENDED_OUTCOME_RESULTS, OUTCOME_STATUSES } from '@/domain/types';
import type { IntendedOutcomeResult, Mood, OutcomeStatus } from '@/domain/types';

const DATABASE_VERSION = 5;

type RecalcRow = {
  id: string;
  mood: string;
  duration_minutes: number;
  decision_status?: string | null;
  ownership_status?: string | null;
  next_step_status?: string | null;
  intended_outcome?: string | null;
  intended_outcome_met?: string | null;
  reason_ids: string | null;
};

function asOutcome(value: string | null | undefined): OutcomeStatus | null {
  return value && (OUTCOME_STATUSES as readonly string[]).includes(value) ? (value as OutcomeStatus) : null;
}

function asIntendedResult(value: string | null | undefined): IntendedOutcomeResult | null {
  return value && (INTENDED_OUTCOME_RESULTS as readonly string[]).includes(value) ? (value as IntendedOutcomeResult) : null;
}

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

  if (currentVersion < 5) {
    const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(meetings)');
    const names = new Set(columns.map((column) => column.name));
    if (!names.has('intended_outcome_met')) await db.execAsync('ALTER TABLE meetings ADD COLUMN intended_outcome_met TEXT;');
  }

  if (currentVersion < 5) {
    // v4 capped reasons; v5 adds the outcome answers to the score. Stored scores are recalculated once.
    const rows = await db.getAllAsync<RecalcRow>(
      `SELECT m.id, m.mood, m.duration_minutes, m.decision_status, m.ownership_status, m.next_step_status,
              m.intended_outcome, m.intended_outcome_met, GROUP_CONCAT(mr.reason_id) AS reason_ids
       FROM meetings m LEFT JOIN meeting_reasons mr ON mr.meeting_id = m.id GROUP BY m.id`,
    );
    await db.withTransactionAsync(async () => {
      for (const row of rows) {
        if (!(row.mood in MOOD_CONFIG)) continue;
        const reasonIds = row.reason_ids ? row.reason_ids.split(',') : [];
        const score = calculateImpactScore(row.mood as Mood, row.duration_minutes, reasonIds, {
          decisionStatus: asOutcome(row.decision_status),
          ownershipStatus: asOutcome(row.ownership_status),
          nextStepStatus: asOutcome(row.next_step_status),
          intendedOutcome: row.intended_outcome,
          intendedOutcomeMet: asIntendedResult(row.intended_outcome_met),
        });
        await db.runAsync('UPDATE meetings SET impact_score = ? WHERE id = ?', score, row.id);
      }
    });
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}
