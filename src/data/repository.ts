import type { SQLiteDatabase } from 'expo-sqlite';

import { calculateImpactScore } from '@/domain/scoring';
import type { Meeting, MeetingInput, MeetingType, Mood, OutcomeStatus, QuickPulse } from '@/domain/types';

type MeetingRow = {
  id: string;
  title: string;
  occurred_at: string;
  duration_minutes: number;
  meeting_type: string;
  people_count: number;
  note: string;
  mood: string;
  impact_score: number;
  decision_status: string | null;
  ownership_status: string | null;
  next_step_status: string | null;
  intended_outcome: string | null;
  created_at: string;
  updated_at: string;
  reason_ids: string | null;
};

const SELECT_MEETINGS = `
  SELECT m.*, GROUP_CONCAT(mr.reason_id) AS reason_ids
  FROM meetings m
  LEFT JOIN meeting_reasons mr ON mr.meeting_id = m.id
`;

function makeId() {
  return `meeting_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function meetingFromInput(input: MeetingInput): Meeting {
  const now = new Date().toISOString();
  return {
    ...input,
    decisionStatus: input.decisionStatus ?? null,
    ownershipStatus: input.ownershipStatus ?? null,
    nextStepStatus: input.nextStepStatus ?? null,
    intendedOutcome: input.intendedOutcome?.trim() || null,
    id: makeId(),
    impactScore: calculateImpactScore(input.mood, input.durationMinutes, input.reasonIds),
    createdAt: now,
    updatedAt: now,
  };
}

async function insertMeetingRecord(db: SQLiteDatabase, meeting: Meeting): Promise<void> {
  await db.runAsync(
    `INSERT INTO meetings
      (id, title, occurred_at, duration_minutes, meeting_type, people_count, note, mood, impact_score,
       decision_status, ownership_status, next_step_status, intended_outcome, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    meeting.id,
    meeting.title,
    meeting.occurredAt,
    meeting.durationMinutes,
    meeting.meetingType,
    meeting.peopleCount,
    meeting.note,
    meeting.mood,
    meeting.impactScore,
    meeting.decisionStatus,
    meeting.ownershipStatus,
    meeting.nextStepStatus,
    meeting.intendedOutcome,
    meeting.createdAt,
    meeting.updatedAt,
  );
  for (const reasonId of meeting.reasonIds) {
    await db.runAsync('INSERT INTO meeting_reasons (meeting_id, reason_id) VALUES (?, ?)', meeting.id, reasonId);
  }
}

function mapMeeting(row: MeetingRow): Meeting {
  return {
    id: row.id,
    title: row.title,
    occurredAt: row.occurred_at,
    durationMinutes: row.duration_minutes,
    meetingType: row.meeting_type as MeetingType,
    peopleCount: row.people_count,
    note: row.note,
    mood: row.mood as Mood,
    impactScore: row.impact_score,
    reasonIds: row.reason_ids ? row.reason_ids.split(',') : [],
    decisionStatus: row.decision_status as OutcomeStatus | null,
    ownershipStatus: row.ownership_status as OutcomeStatus | null,
    nextStepStatus: row.next_step_status as OutcomeStatus | null,
    intendedOutcome: row.intended_outcome,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createMeeting(db: SQLiteDatabase, input: MeetingInput): Promise<Meeting> {
  const meeting = meetingFromInput(input);

  await db.withTransactionAsync(async () => {
    await insertMeetingRecord(db, meeting);
  });

  return meeting;
}

export async function completeQuickPulseMeeting(db: SQLiteDatabase, pulseId: string, input: MeetingInput): Promise<Meeting> {
  const meeting = meetingFromInput(input);
  await db.withTransactionAsync(async () => {
    const pulse = await db.getFirstAsync<{ id: string }>('SELECT id FROM quick_pulses WHERE id = ?', pulseId);
    if (!pulse) throw new Error('Quick Pulse not found');
    await insertMeetingRecord(db, meeting);
    const deletion = await db.runAsync('DELETE FROM quick_pulses WHERE id = ?', pulseId);
    if (deletion.changes !== 1) throw new Error('Quick Pulse could not be completed');
  });
  return meeting;
}

export async function updateMeeting(
  db: SQLiteDatabase,
  id: string,
  input: MeetingInput,
): Promise<Meeting | null> {
  const existing = await getMeetingById(db, id);
  if (!existing) return null;

  const meeting: Meeting = {
    ...existing,
    ...input,
    decisionStatus: input.decisionStatus ?? null,
    ownershipStatus: input.ownershipStatus ?? null,
    nextStepStatus: input.nextStepStatus ?? null,
    intendedOutcome: input.intendedOutcome?.trim() || null,
    impactScore: calculateImpactScore(input.mood, input.durationMinutes, input.reasonIds),
    updatedAt: new Date().toISOString(),
  };

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE meetings SET
        title = ?, occurred_at = ?, duration_minutes = ?, meeting_type = ?, people_count = ?,
        note = ?, mood = ?, impact_score = ?, decision_status = ?, ownership_status = ?,
        next_step_status = ?, intended_outcome = ?, updated_at = ? WHERE id = ?`,
      meeting.title,
      meeting.occurredAt,
      meeting.durationMinutes,
      meeting.meetingType,
      meeting.peopleCount,
      meeting.note,
      meeting.mood,
      meeting.impactScore,
      meeting.decisionStatus,
      meeting.ownershipStatus,
      meeting.nextStepStatus,
      meeting.intendedOutcome,
      meeting.updatedAt,
      id,
    );
    await db.runAsync('DELETE FROM meeting_reasons WHERE meeting_id = ?', id);
    for (const reasonId of meeting.reasonIds) {
      await db.runAsync('INSERT INTO meeting_reasons (meeting_id, reason_id) VALUES (?, ?)', id, reasonId);
    }
  });

  return meeting;
}

export async function deleteMeeting(db: SQLiteDatabase, id: string) {
  await db.runAsync('DELETE FROM meetings WHERE id = ?', id);
}

export async function getMeetingById(db: SQLiteDatabase, id: string): Promise<Meeting | null> {
  const row = await db.getFirstAsync<MeetingRow>(
    `${SELECT_MEETINGS} WHERE m.id = ? GROUP BY m.id`,
    id,
  );
  return row ? mapMeeting(row) : null;
}

export async function getMeetingsByRange(db: SQLiteDatabase, start: Date, end: Date): Promise<Meeting[]> {
  const rows = await db.getAllAsync<MeetingRow>(
    `${SELECT_MEETINGS} WHERE m.occurred_at >= ? AND m.occurred_at <= ? GROUP BY m.id ORDER BY m.occurred_at DESC`,
    start.toISOString(),
    end.toISOString(),
  );
  return rows.map(mapMeeting);
}

export async function getAllMeetings(db: SQLiteDatabase): Promise<Meeting[]> {
  const rows = await db.getAllAsync<MeetingRow>(`${SELECT_MEETINGS} GROUP BY m.id ORDER BY m.occurred_at DESC`);
  return rows.map(mapMeeting);
}

export async function getSetting(db: SQLiteDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', key);
  return row?.value ?? null;
}

export async function setSetting(db: SQLiteDatabase, key: string, value: string) {
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key,
    value,
  );
}

export async function getAllSettings(db: SQLiteDatabase): Promise<Record<string, string>> {
  const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM settings');
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

export async function restoreMeeting(db: SQLiteDatabase, meeting: Meeting): Promise<Meeting> {
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO meetings
        (id, title, occurred_at, duration_minutes, meeting_type, people_count, note, mood, impact_score,
         decision_status, ownership_status, next_step_status, intended_outcome, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      meeting.id,
      meeting.title,
      meeting.occurredAt,
      meeting.durationMinutes,
      meeting.meetingType,
      meeting.peopleCount,
      meeting.note,
      meeting.mood,
      meeting.impactScore,
      meeting.decisionStatus,
      meeting.ownershipStatus,
      meeting.nextStepStatus,
      meeting.intendedOutcome,
      meeting.createdAt,
      meeting.updatedAt,
    );
    for (const reasonId of meeting.reasonIds) {
      await db.runAsync('INSERT INTO meeting_reasons (meeting_id, reason_id) VALUES (?, ?)', meeting.id, reasonId);
    }
  });
  return meeting;
}

export async function searchMeetings(db: SQLiteDatabase, query: string): Promise<Meeting[]> {
  const trimmed = query.trim();
  if (!trimmed) return getAllMeetings(db);
  const rows = await db.getAllAsync<MeetingRow>(
    `${SELECT_MEETINGS} WHERE m.title LIKE ? GROUP BY m.id ORDER BY m.occurred_at DESC`,
    `%${trimmed}%`,
  );
  return rows.map(mapMeeting);
}

export async function importMeetings(
  db: SQLiteDatabase,
  inputs: MeetingInput[],
  mode: 'merge' | 'replace',
): Promise<number> {
  if (mode === 'replace') {
    await deleteAllData(db);
  }
  for (const input of inputs) {
    await createMeeting(db, input);
  }
  return inputs.length;
}

export async function createQuickPulse(db: SQLiteDatabase, input: Pick<QuickPulse, 'occurredAt' | 'mood' | 'reasonId'>): Promise<QuickPulse> {
  const pulse: QuickPulse = {
    ...input,
    id: `pulse_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    createdAt: new Date().toISOString(),
  };
  await db.runAsync(
    'INSERT INTO quick_pulses (id, occurred_at, mood, reason_id, created_at) VALUES (?, ?, ?, ?, ?)',
    pulse.id,
    pulse.occurredAt,
    pulse.mood,
    pulse.reasonId,
    pulse.createdAt,
  );
  return pulse;
}

export async function getQuickPulseById(db: SQLiteDatabase, id: string): Promise<QuickPulse | null> {
  const row = await db.getFirstAsync<{ id: string; occurred_at: string; mood: string; reason_id: string | null; created_at: string }>(
    'SELECT * FROM quick_pulses WHERE id = ?',
    id,
  );
  return row ? { id: row.id, occurredAt: row.occurred_at, mood: row.mood as Mood, reasonId: row.reason_id, createdAt: row.created_at } : null;
}

export async function getAllQuickPulses(db: SQLiteDatabase): Promise<QuickPulse[]> {
  const rows = await db.getAllAsync<{ id: string; occurred_at: string; mood: string; reason_id: string | null; created_at: string }>(
    'SELECT * FROM quick_pulses ORDER BY occurred_at DESC',
  );
  return rows.map((row) => ({ id: row.id, occurredAt: row.occurred_at, mood: row.mood as Mood, reasonId: row.reason_id, createdAt: row.created_at }));
}

export async function deleteQuickPulse(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM quick_pulses WHERE id = ?', id);
}

export async function deleteAllData(db: SQLiteDatabase, options?: { preferences?: boolean }) {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM meeting_reasons');
    await db.runAsync('DELETE FROM meetings');
    await db.runAsync('DELETE FROM quick_pulses');
    if (options?.preferences) {
      await db.runAsync('DELETE FROM settings');
    }
  });
}
