import { describe, expect, it, jest } from '@jest/globals';
import type { SQLiteDatabase } from 'expo-sqlite';

import { migrateDatabase } from '../database';

function fakeDatabase(version: number, columns: string[]) {
  const execAsync = jest.fn(async (_sql: string) => undefined);
  const database = {
    execAsync,
    getFirstAsync: jest.fn(async () => ({ user_version: version })),
    getAllAsync: jest.fn(async () => columns.map((name) => ({ name }))),
  } as unknown as SQLiteDatabase;

  return { database, execAsync };
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
      'PRAGMA user_version = 3',
    ]));
  });

  it('adds intended outcomes and Quick Pulses when upgrading a version 2 database', async () => {
    const { database, execAsync } = fakeDatabase(2, ['id', 'decision_status', 'ownership_status', 'next_step_status']);

    await migrateDatabase(database);

    const statements = execAsync.mock.calls.map(([sql]) => sql);
    expect(statements).toContain('ALTER TABLE meetings ADD COLUMN intended_outcome TEXT;');
    expect(statements.some((sql) => sql.includes('CREATE TABLE IF NOT EXISTS quick_pulses'))).toBe(true);
    expect(statements).toContain('PRAGMA user_version = 3');
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
