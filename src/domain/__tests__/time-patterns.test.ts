import { describe, expect, it } from '@jest/globals';

import { summarizeTimePatterns } from '../time-patterns';
import type { Meeting } from '../types';

function meeting(id: string, occurredAt: string, impactScore: number): Meeting {
  return {
    id,
    title: id,
    occurredAt,
    durationMinutes: 30,
    meetingType: 'review',
    peopleCount: 2,
    note: '',
    mood: 'neutral',
    impactScore,
    reasonIds: [],
    decisionStatus: null,
    ownershipStatus: null,
    nextStepStatus: null,
    intendedOutcome: null,
    createdAt: occurredAt,
    updatedAt: occurredAt,
  };
}

describe('time patterns', () => {
  it('withholds averages below the minimum sample', () => {
    const summary = summarizeTimePatterns([
      meeting('1', '2026-10-19T09:00:00.000Z', 2),
      meeting('2', '2026-10-19T10:00:00.000Z', 4),
    ]);
    expect(summary.weekdays.find((item) => item.id === 'mon')?.average).toBeNull();
  });

  it('calculates weekday averages after three logs', () => {
    const summary = summarizeTimePatterns([
      meeting('1', '2026-10-19T09:00:00.000Z', 2),
      meeting('2', '2026-10-19T10:00:00.000Z', 4),
      meeting('3', '2026-10-19T11:00:00.000Z', 0),
    ]);
    expect(summary.weekdays.find((item) => item.id === 'mon')).toMatchObject({ count: 3, average: 2 });
  });
});
