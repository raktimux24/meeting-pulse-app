import { z } from 'zod';

import { MEETING_TYPE_SLUG } from './meeting-types';
import { MOODS, OUTCOME_STATUSES } from './types';

export const meetingTypeSchema = z
  .string()
  .trim()
  .min(1, 'Choose a meeting type')
  .max(40)
  .regex(MEETING_TYPE_SLUG, 'Choose a meeting type');

export const meetingDetailsSchema = z.object({
  title: z.string().trim().min(1, 'Give the meeting a short name').max(80, 'Keep the name under 80 characters'),
  durationMinutes: z.number().int().min(1, 'Duration must be at least 1 minute').max(720, 'Duration must be under 12 hours'),
  meetingType: meetingTypeSchema,
  peopleCount: z.number().int().min(1).max(999),
  note: z.string().max(500, 'Keep notes under 500 characters'),
});

export type MeetingDetailsInput = z.infer<typeof meetingDetailsSchema>;

export const exportedMeetingSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1).max(80),
  occurredAt: z.string().min(1),
  durationMinutes: z.number().int().min(1).max(720),
  meetingType: meetingTypeSchema,
  peopleCount: z.number().int().min(1).max(999),
  note: z.string().max(500).optional().default(''),
  mood: z.enum(MOODS),
  reasonIds: z.array(z.string().trim().min(1).max(48)).optional().default([]),
  decisionStatus: z.enum(OUTCOME_STATUSES).nullable().optional().default(null),
  ownershipStatus: z.enum(OUTCOME_STATUSES).nullable().optional().default(null),
  nextStepStatus: z.enum(OUTCOME_STATUSES).nullable().optional().default(null),
  intendedOutcome: z.string().trim().max(160).nullable().optional().default(null),
  impactScore: z.number().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const customMeetingTypeSchema = z.object({
  id: meetingTypeSchema,
  label: z.string().trim().min(1).max(32),
});

export const customReasonSchema = z.object({
  id: z.string().startsWith('custom-').max(48),
  label: z.string().trim().min(1).max(32),
  sentiment: z.union([z.literal('positive'), z.literal('negative')]),
  active: z.boolean().optional(),
});

export const quickPulseSchema = z.object({
  id: z.string().optional(),
  occurredAt: z.string().min(1),
  mood: z.enum(MOODS),
  reasonId: z.string().trim().min(1).max(48).nullable().optional().default(null),
  createdAt: z.string().optional(),
});

export const exportPayloadSchema = z.object({
  exportedAt: z.string().optional(),
  weekStartsOn: z.union([z.literal(0), z.literal(1)]).optional(),
  customMeetingTypes: z.array(customMeetingTypeSchema).optional(),
  customReasons: z.array(customReasonSchema).optional(),
  meetingBudget: z.unknown().optional(),
  seriesReviews: z.unknown().optional(),
  quickPulses: z.array(z.unknown()).optional(),
  meetings: z.array(z.unknown()),
});
