import { describe, expect, it } from '@jest/globals';

import { parseExportJson, parseExportPayload } from '../import-export';
import { meetingDetailsSchema } from '../validation';

describe('meeting details validation', () => {
  it('requires a short meeting name', () => {
    const result = meetingDetailsSchema.safeParse({
      title: '  ',
      durationMinutes: 30,
      meetingType: 'review',
      peopleCount: 3,
      note: '',
    });
    expect(result.success).toBe(false);
  });

  it('accepts a complete details payload', () => {
    const result = meetingDetailsSchema.safeParse({
      title: 'Design review',
      durationMinutes: 45,
      meetingType: 'review',
      peopleCount: 4,
      note: 'Keep the decision visible.',
    });
    expect(result.success).toBe(true);
  });
});

describe('export import', () => {
  const validMeeting = {
    title: 'Standup',
    occurredAt: '2026-07-07T14:00:00.000Z',
    durationMinutes: 15,
    meetingType: 'standup',
    peopleCount: 6,
    note: '',
    mood: 'neutral',
    reasonIds: [],
  };

  it('rejects invalid JSON', () => {
    expect(() => parseExportJson('{')).toThrow('This file is not valid JSON.');
  });

  it('rejects a non-export payload', () => {
    expect(() => parseExportPayload({ hello: true })).toThrow('This file is not a Meeting Pulse export.');
  });

  it('imports valid meetings and skips broken rows', () => {
    const preview = parseExportPayload({
      weekStartsOn: 1,
      meetings: [validMeeting, { title: '', mood: 'clear' }, { ...validMeeting, occurredAt: 'not-a-date' }],
    });
    expect(preview.imported).toBe(1);
    expect(preview.skipped).toBe(2);
    expect(preview.meetings[0]?.title).toBe('Standup');
    expect(preview.customMeetingTypes).toEqual([]);
    expect(preview.meetingBudget).toBeNull();
    expect(preview.meetings[0]).toMatchObject({
      decisionStatus: null,
      ownershipStatus: null,
      nextStepStatus: null,
    });
  });

  it('imports outcome checks and normalizes private budget preferences', () => {
    const preview = parseExportPayload({
      meetings: [{
        ...validMeeting,
        decisionStatus: 'yes',
        ownershipStatus: 'no',
        nextStepStatus: 'not-needed',
      }],
      meetingBudget: {
        enabled: true,
        weeklyMinutes: 480,
        maxCostMeetings: 3,
        maxBlockMinutes: 90,
        preferredBufferMinutes: 15,
      },
    });

    expect(preview.meetings[0]).toMatchObject({
      decisionStatus: 'yes',
      ownershipStatus: 'no',
      nextStepStatus: 'not-needed',
    });
    expect(preview.meetingBudget).toEqual({
      enabled: true,
      weeklyMinutes: 480,
      maxCostMeetings: 3,
      maxBlockMinutes: 90,
      preferredBufferMinutes: 15,
    });
  });

  it('imports intended outcomes, custom reasons, and pending Quick Pulses', () => {
    const preview = parseExportPayload({
      meetings: [{ ...validMeeting, intendedOutcome: 'Choose one direction', reasonIds: ['custom-good-context'] }],
      customReasons: [{ id: 'custom-good-context', label: 'Good context', sentiment: 'positive' }],
      quickPulses: [{ occurredAt: '2026-10-25T09:00:00.000Z', mood: 'clear', reasonId: 'custom-good-context' }],
    });

    expect(preview.meetings[0]?.intendedOutcome).toBe('Choose one direction');
    expect(preview.meetings[0]?.reasonIds).toEqual(['custom-good-context']);
    expect(preview.customReasons).toHaveLength(1);
    expect(preview.quickPulses).toEqual([{ occurredAt: '2026-10-25T09:00:00.000Z', mood: 'clear', reasonId: 'custom-good-context' }]);
  });

  it('accepts a custom meeting type and imported type catalog', () => {
    const preview = parseExportPayload({
      customMeetingTypes: [{ id: 'design-crit', label: 'Design critique' }],
      meetings: [{ ...validMeeting, meetingType: 'design-crit' }],
    });
    expect(preview.imported).toBe(1);
    expect(preview.meetings[0]?.meetingType).toBe('design-crit');
    expect(preview.customMeetingTypes).toEqual([{ id: 'design-crit', label: 'Design critique' }]);
  });
});
