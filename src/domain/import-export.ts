import { parseCustomMeetingTypes } from './meeting-types';
import { parseCustomReasons } from './custom-reasons';
import { normalizeMeetingBudget } from './budget';
import { parseSeriesReviews } from './series-reviews';
import { exportedMeetingSchema, exportPayloadSchema, quickPulseSchema } from './validation';
import type { CustomMeetingType, CustomReason, MeetingBudgetPrefs, MeetingInput, QuickPulse, SeriesReview } from './types';

export type ImportPreview = {
  meetings: MeetingInput[];
  weekStartsOn: 0 | 1 | null;
  customMeetingTypes: CustomMeetingType[];
  customReasons: CustomReason[];
  meetingBudget: MeetingBudgetPrefs | null;
  quickPulses: Omit<QuickPulse, 'id' | 'createdAt'>[];
  seriesReviews: SeriesReview[];
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
      decisionStatus: parsed.data.decisionStatus,
      ownershipStatus: parsed.data.ownershipStatus,
      nextStepStatus: parsed.data.nextStepStatus,
      intendedOutcome: parsed.data.intendedOutcome,
    });
  });

  const quickPulses = (payload.data.quickPulses ?? []).flatMap((item) => {
    const parsed = quickPulseSchema.safeParse(item);
    if (!parsed.success || Number.isNaN(new Date(parsed.data.occurredAt).getTime())) return [];
    return [{ occurredAt: new Date(parsed.data.occurredAt).toISOString(), mood: parsed.data.mood, reasonId: parsed.data.reasonId }];
  });

  return {
    meetings,
    weekStartsOn: payload.data.weekStartsOn ?? null,
    customMeetingTypes: parseCustomMeetingTypes(JSON.stringify(payload.data.customMeetingTypes ?? [])),
    customReasons: parseCustomReasons(JSON.stringify(payload.data.customReasons ?? [])),
    meetingBudget: payload.data.meetingBudget == null ? null : normalizeMeetingBudget(payload.data.meetingBudget),
    quickPulses,
    seriesReviews: parseSeriesReviews(JSON.stringify(payload.data.seriesReviews ?? [])),
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
