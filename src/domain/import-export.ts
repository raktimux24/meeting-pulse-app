import { exportedMeetingSchema, exportPayloadSchema } from './validation';
import type { MeetingInput } from './types';

export type ImportPreview = {
  meetings: MeetingInput[];
  weekStartsOn: 0 | 1 | null;
  imported: number;
  skipped: number;
};

export function parseExportPayload(raw: unknown): ImportPreview {
  const payload = exportPayloadSchema.safeParse(raw);
  if (!payload.success) {
    throw new Error('This file is not a Meeting Pulse export.');
  }

  const meetings: MeetingInput[] = [];
  let skipped = 0;

  payload.data.meetings.forEach((item) => {
    const parsed = exportedMeetingSchema.safeParse(item);
    if (!parsed.success) {
      skipped += 1;
      return;
    }
    const occurred = new Date(parsed.data.occurredAt);
    if (Number.isNaN(occurred.getTime())) {
      skipped += 1;
      return;
    }
    meetings.push({
      title: parsed.data.title,
      occurredAt: occurred.toISOString(),
      durationMinutes: parsed.data.durationMinutes,
      meetingType: parsed.data.meetingType,
      peopleCount: parsed.data.peopleCount,
      note: parsed.data.note,
      mood: parsed.data.mood,
      reasonIds: parsed.data.reasonIds,
    });
  });

  return {
    meetings,
    weekStartsOn: payload.data.weekStartsOn ?? null,
    imported: meetings.length,
    skipped,
  };
}

export function parseExportJson(text: string): ImportPreview {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('This file is not valid JSON.');
  }
  return parseExportPayload(raw);
}
