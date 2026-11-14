import { describe, expect, it, jest } from '@jest/globals';
import type { SQLiteDatabase } from 'expo-sqlite';

import { migrateDatabase } from '../database';

type MeetingRow = { id: string; mood: string; duration_minutes: number; reason_ids: string | null };

function fakeDatabase(version: number, columns: string[], meetings: MeetingRow[] = []) {
  const execAsync = jest.fn(async (_sql: string) => undefined);
  const runAsync = jest.fn(async (..._args: unknown[]) => ({ changes: 1, lastInsertRowId: 0 }));
  const database = {
    execAsync,
    runAsync,
    getFirstAsync: jest.fn(async () => ({ user_version: version })),
    // PRAGMA table_info returns column rows; the v4 step asks for meeting rows.
    getAllAsync: jest.fn(async (sql: string) => (sql.startsWith('PRAGMA') ? columns.map((name) => ({ name })) : meetings)),
    withTransactionAsync: jest.fn(async (task: () => Promise<void>) => task()),
  } as unknown as SQLiteDatabase;

  return { database, execAsync, runAsync };
}

describe('database migration', () => {
  it('adds all outcome columns when upgrading a version 1 database', async () => {
    const { database, execAsync } = fakeDatabase(1, ['id', 'title']);

    await migrateDatabase(database);

    const statements = execAsync.mock.calls.map(([sql]) => sql);
    expect(statements).toEqual(expect.arrayContaining([
      'ALTER TABLE meetings ADD COLUMN decision_status TEXT;',
      'ALTER TABLE meetings ADD COLUMN ownership_status TEXT;',
      'ALTER TABLE meetings ADD COLUMN next_step_status TEXT;',
      'ALTER TABLE meetings ADD COLUMN intended_outcome TEXT;',
      'PRAGMA user_version = 4',
    ]));
  });

  it('adds intended outcomes and Quick Pulses when upgrading a version 2 database', async () => {
    const { database, execAsync } = fakeDatabase(2, ['id', 'decision_status', 'ownership_status', 'next_step_status']);

    await migrateDatabase(database);

    const statements = execAsync.mock.calls.map(([sql]) => sql);
    expect(statements).toContain('ALTER TABLE meetings ADD COLUMN intended_outcome TEXT;');
    expect(statements.some((sql) => sql.includes('CREATE TABLE IF NOT EXISTS quick_pulses'))).toBe(true);
    expect(statements).toContain('PRAGMA user_version = 4');
  });

  it('recalculates stored scores with the reason cap when upgrading to version 4', async () => {
    const { database, runAsync } = fakeDatabase(3, [], [
      // frustrated (-3) x 30 min (1.2) + three positive reasons (+5, capped to +3) = -0.6
      { id: 'a', mood: 'frustrated', duration_minutes: 30, reason_ids: 'clear-outcome,fast-decision,right-people' },
      { id: 'b', mood: 'not-a-mood', duration_minutes: 30, reason_ids: null },
    ]);

    await migrateDatabase(database);

    expect(runAsync).toHaveBeenCalledWith('UPDATE meetings SET impact_score = ? WHERE id = ?', -0.6, 'a');
    expect(runAsync).not.toHaveBeenCalledWith(expect.anything(), expect.anything(), 'b');
  });

  it('does not repeat a column that already exists after a partial migration', async () => {
    const { database, execAsync } = fakeDatabase(1, ['id', 'decision_status']);

    await migrateDatabase(database);

    const statements = execAsync.mock.calls.map(([sql]) => sql);
    expect(statements).not.toContain('ALTER TABLE meetings ADD COLUMN decision_status TEXT;');
    expect(statements).toContain('ALTER TABLE meetings ADD COLUMN ownership_status TEXT;');
    expect(statements).toContain('ALTER TABLE meetings ADD COLUMN next_step_status TEXT;');
  });
});
