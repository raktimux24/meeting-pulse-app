import { describe, expect, it } from '@jest/globals';

import { generateOutcomeInsights } from '../outcomes';
import type { Meeting } from '../types';

function meeting(index: number, overrides: Partial<Meeting> = {}): Meeting {
  return {
    id: `meeting-${index}`,
    title: `Meeting ${index}`,
    occurredAt: new Date(2026, 9, 20, 9 + index).toISOString(),
    durationMinutes: 30,
    meetingType: 'planning',
    peopleCount: 4,
    note: '',
    mood: 'neutral',
    impactScore: 0,
    reasonIds: [],
    decisionStatus: null,
    ownershipStatus: null,
    nextStepStatus: null,
    intendedOutcome: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('outcome insights', () => {
  it('waits for three answered meetings', () => {
    expect(generateOutcomeInsights([
      meeting(1, { decisionStatus: 'no' }),
      meeting(2, { decisionStatus: 'no' }),
    ])).toEqual([]);
  });

  it('surfaces repeated decision, ownership, and next-step gaps', () => {
    const meetings = [1, 2, 3, 4].map((index) => meeting(index, {
      decisionStatus: index === 4 ? 'yes' : 'no',
      ownershipStatus: index === 4 ? 'yes' : 'no',
      nextStepStatus: index === 4 ? 'yes' : 'no',
    }));
    expect(generateOutcomeInsights(meetings).map((item) => item.id)).toEqual([
      'outcome-decision',
      'outcome-ownership',
      'outcome-next-step',
    ]);
  });

  it('does not treat not-needed as a negative answer', () => {
    const meetings = [1, 2, 3].map((index) => meeting(index, { decisionStatus: 'not-needed' }));
    expect(generateOutcomeInsights(meetings)).toEqual([]);
  });
});
