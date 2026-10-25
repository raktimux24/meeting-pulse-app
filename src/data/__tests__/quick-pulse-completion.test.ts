import { describe, expect, it, jest } from '@jest/globals';
import type { SQLiteDatabase } from 'expo-sqlite';

import { completeQuickPulseMeeting } from '../repository';

const input = {
  title: 'Design review',
  occurredAt: '2026-10-25T12:00:00.000Z',
  durationMinutes: 30,
  meetingType: 'review',
  peopleCount: 4,
  note: '',
  mood: 'clear' as const,
  reasonIds: ['clear-outcome'],
};

describe('Quick Pulse completion', () => {
  it('inserts the reflection and removes its draft in one transaction', async () => {
    const runAsync = jest.fn(async () => ({ changes: 1 }));
    const withTransactionAsync = jest.fn(async (work: () => Promise<void>) => work());
    const database = {
      runAsync,
      getFirstAsync: jest.fn(async () => ({ id: 'pulse-1' })),
      withTransactionAsync,
    } as unknown as SQLiteDatabase;

    const meeting = await completeQuickPulseMeeting(database, 'pulse-1', input);

    expect(meeting.title).toBe('Design review');
    expect(runAsync).toHaveBeenCalledWith('DELETE FROM quick_pulses WHERE id = ?', 'pulse-1');
    expect(withTransactionAsync).toHaveBeenCalledTimes(1);
  });

  it('does not insert a meeting when the draft is already gone', async () => {
    const runAsync = jest.fn();
    const database = {
      runAsync,
      getFirstAsync: jest.fn(async () => null),
      withTransactionAsync: jest.fn(async (work: () => Promise<void>) => work()),
    } as unknown as SQLiteDatabase;

    await expect(completeQuickPulseMeeting(database, 'missing', input)).rejects.toThrow('Quick Pulse not found');
    expect(runAsync).not.toHaveBeenCalled();
  });
});
