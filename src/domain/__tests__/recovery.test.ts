import { describe, expect, it } from '@jest/globals';

import { getMeetingBlocks, summarizeRecovery } from '../recovery';
import type { Meeting } from '../types';

function meeting(id: string, hour: number, minute: number, durationMinutes: number, impactScore = 0): Meeting {
  return {
    id,
    title: id,
    occurredAt: new Date(2026, 9, 20, hour, minute).toISOString(),
    durationMinutes,
    meetingType: 'review',
    peopleCount: 4,
    note: '',
    mood: 'neutral',
    impactScore,
    reasonIds: [],
    decisionStatus: null,
    ownershipStatus: null,
    nextStepStatus: null,
    intendedOutcome: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe('recovery calculations', () => {
  it('builds deterministic blocks from unordered and overlapping meetings', () => {
    const meetings = [
      meeting('third', 10, 30, 30),
      meeting('first', 9, 0, 60),
      meeting('second', 9, 45, 30),
    ];
    const blocks = getMeetingBlocks(meetings);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].meetingIds).toEqual(['first', 'second', 'third']);
    expect(blocks[0].spanMinutes).toBe(120);
  });

  it('compares tight and buffered meetings only with enough samples', () => {
    const meetings = [
      meeting('a', 9, 0, 30),
      meeting('b', 9, 35, 30, -3),
      meeting('c', 10, 10, 30, -2),
      meeting('d', 10, 45, 30, -4),
      meeting('e', 12, 0, 30, 2),
      meeting('f', 13, 0, 30, 3),
      meeting('g', 14, 0, 30, 2),
    ];
    const summary = summarizeRecovery(meetings, 15);
    expect(summary.tightTransitions).toBe(3);
    expect(summary.bufferedTransitions).toBe(3);
    expect(summary.comparisonReady).toBe(true);
    expect(summary.averageDifference).toBeGreaterThanOrEqual(1.5);
  });

  it('does not treat an overnight gap as a comparable transition', () => {
    const first = meeting('first', 23, 30, 30);
    const second = { ...meeting('second', 0, 15, 30), occurredAt: new Date(2026, 9, 21, 0, 15).toISOString() };
    const summary = summarizeRecovery([first, second]);
    expect(summary.tightTransitions).toBe(0);
    expect(summary.bufferedTransitions).toBe(0);
  });
});
