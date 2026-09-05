import { z } from 'zod';

import { MEETING_TYPES, MOODS, REASON_IDS } from './types';

export const meetingDetailsSchema = z.object({
  title: z.string().trim().min(1, 'Give the meeting a short name').max(80, 'Keep the name under 80 characters'),
  durationMinutes: z.number().int().min(1, 'Duration must be at least 1 minute').max(720, 'Duration must be under 12 hours'),
  meetingType: z.enum(MEETING_TYPES),
  peopleCount: z.number().int().min(1).max(999),
  note: z.string().max(500, 'Keep notes under 500 characters'),
});

export type MeetingDetailsInput = z.infer<typeof meetingDetailsSchema>;

export const exportedMeetingSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1).max(80),
  occurredAt: z.string().min(1),
  durationMinutes: z.number().int().min(1).max(720),
  meetingType: z.enum(MEETING_TYPES),
  peopleCount: z.number().int().min(1).max(999),
  note: z.string().max(500).optional().default(''),
  mood: z.enum(MOODS),
  reasonIds: z.array(z.enum(REASON_IDS)).optional().default([]),
  impactScore: z.number().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const exportPayloadSchema = z.object({
  exportedAt: z.string().optional(),
  weekStartsOn: z.union([z.literal(0), z.literal(1)]).optional(),
  meetings: z.array(z.unknown()),
});
