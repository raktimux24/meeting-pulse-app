import type { SQLiteDatabase } from 'expo-sqlite';

import { calculateImpactScore } from '@/domain/scoring';
import type { Meeting, MeetingInput, MeetingType, Mood, ReasonId } from '@/domain/types';

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
    reasonIds: row.reason_ids ? (row.reason_ids.split(',') as ReasonId[]) : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createMeeting(db: SQLiteDatabase, input: MeetingInput): Promise<Meeting> {
  const now = new Date().toISOString();
  const meeting: Meeting = {
    ...input,
    id: makeId(),
    impactScore: calculateImpactScore(input.mood, input.durationMinutes, input.reasonIds),
    createdAt: now,
    updatedAt: now,
  };

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO meetings
        (id, title, occurred_at, duration_minutes, meeting_type, people_count, note, mood, impact_score, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      meeting.id,
      meeting.title,
      meeting.occurredAt,
      meeting.durationMinutes,
      meeting.meetingType,
      meeting.peopleCount,
      meeting.note,
      meeting.mood,
      meeting.impactScore,
      meeting.createdAt,
      meeting.updatedAt,
    );
    for (const reasonId of meeting.reasonIds) {
      await db.runAsync('INSERT INTO meeting_reasons (meeting_id, reason_id) VALUES (?, ?)', meeting.id, reasonId);
    }
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
    impactScore: calculateImpactScore(input.mood, input.durationMinutes, input.reasonIds),
    updatedAt: new Date().toISOString(),
  };

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE meetings SET
        title = ?, occurred_at = ?, duration_minutes = ?, meeting_type = ?, people_count = ?,
        note = ?, mood = ?, impact_score = ?, updated_at = ? WHERE id = ?`,
      meeting.title,
      meeting.occurredAt,
      meeting.durationMinutes,
      meeting.meetingType,
      meeting.peopleCount,
      meeting.note,
      meeting.mood,
      meeting.impactScore,
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

export async function deleteAllData(db: SQLiteDatabase) {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM meeting_reasons');
    await db.runAsync('DELETE FROM meetings');
  });
}
