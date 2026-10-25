import { describe, expect, it } from '@jest/globals';

import { DEFAULT_MEETING_BUDGET, normalizeMeetingBudget, priorityBudgetMetric, summarizeBudget } from '../budget';
import type { Meeting } from '../types';

function meeting(id: string, hour: number, durationMinutes: number, impactScore: number): Meeting {
  return {
    id,
    title: id,
    occurredAt: new Date(2026, 9, 20, hour).toISOString(),
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

describe('meeting budget', () => {
  it('falls back safely for invalid settings', () => {
    expect(normalizeMeetingBudget({ enabled: true, weeklyMinutes: -1, preferredBufferMinutes: 12 })).toEqual({
      ...DEFAULT_MEETING_BUDGET,
      enabled: true,
    });
  });

  it('reports near and exceeded guardrails', () => {
    const summary = summarizeBudget([
      meeting('a', 9, 60, -2),
      meeting('b', 10, 60, -1),
      meeting('c', 11, 60, 2),
    ], {
      enabled: true,
      weeklyMinutes: 180,
      maxCostMeetings: 1,
      maxBlockMinutes: 120,
      preferredBufferMinutes: 15,
    });
    expect(summary.metrics.find((item) => item.id === 'meeting-time')?.status).toBe('near');
    expect(summary.metrics.find((item) => item.id === 'cost-meetings')?.status).toBe('over');
    expect(priorityBudgetMetric(summary)?.id).toBe('cost-meetings');
  });

  it('shows no priority when guardrails are disabled', () => {
    expect(priorityBudgetMetric(summarizeBudget([], DEFAULT_MEETING_BUDGET))).toBeNull();
  });
});
