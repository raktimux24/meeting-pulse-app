import { endOfWeek, startOfWeek } from 'date-fns';
import { beforeEach, describe, expect, it } from '@jest/globals';

import { generateInsights, summarizeWeek } from '../insights';
import type { Meeting } from '../types';

let counter = 0;

function meeting(overrides: Partial<Meeting> = {}): Meeting {
  counter += 1;
  return {
    id: `meeting-${counter}`,
    title: `Meeting ${counter}`,
    occurredAt: new Date(2026, 6, 6, 10 + (counter % 6)).toISOString(),
    durationMinutes: 30,
    meetingType: 'review',
    peopleCount: 4,
    note: '',
    mood: 'neutral',
    impactScore: 0,
    reasonIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('insight generation', () => {
  beforeEach(() => { counter = 0; });

  it('waits for a minimum sample before claiming a pattern', () => {
    expect(generateInsights([meeting(), meeting()])[0].id).toBe('keep-logging');
  });

  it('prioritizes closure and async opportunities', () => {
    const meetings = [1, 2, 3].map(() => meeting({ impactScore: -4, reasonIds: ['no-decision', 'could-have-been-async'] }));
    expect(generateInsights(meetings).map((item) => item.id)).toEqual(expect.arrayContaining(['no-decision', 'async']));
  });

  it('finds a duration drag only with repeated long negative meetings', () => {
    const meetings = [
      meeting({ durationMinutes: 90, impactScore: -5 }),
      meeting({ durationMinutes: 75, impactScore: -3 }),
      meeting({ durationMinutes: 30, impactScore: 2 }),
    ];
    expect(generateInsights(meetings).map((item) => item.id)).toContain('long-meetings');
  });

  it('recognizes when one-on-ones beat group meetings', () => {
    const meetings = [
      meeting({ meetingType: 'one-on-one', peopleCount: 2, impactScore: 3 }),
      meeting({ meetingType: 'one-on-one', peopleCount: 2, impactScore: 2 }),
      meeting({ meetingType: 'planning', peopleCount: 8, impactScore: -3 }),
      meeting({ meetingType: 'planning', peopleCount: 7, impactScore: -2 }),
    ];
    expect(generateInsights(meetings).map((item) => item.id)).toContain('group-size');
  });

  it('requires three repeated meetings before calling out a format', () => {
    const meetings = [1, 2, 3].map(() => meeting({ meetingType: 'status-update', impactScore: -4 }));
    expect(generateInsights(meetings).map((item) => item.id)).toContain('type-status-update');
  });

  it('recognizes short meetings with clear outcomes', () => {
    const meetings = [
      meeting({ durationMinutes: 20, impactScore: 5, reasonIds: ['clear-outcome'] }),
      meeting({ durationMinutes: 25, impactScore: 4, reasonIds: ['clear-outcome'] }),
      meeting({ durationMinutes: 50, impactScore: -2 }),
    ];
    expect(generateInsights(meetings).map((item) => item.id)).toContain('short-clear');
  });
});

describe('weekly summary', () => {
  const weekOf = () => {
    const anchor = new Date(2026, 6, 8);
    return { start: startOfWeek(anchor, { weekStartsOn: 1 }), end: endOfWeek(anchor, { weekStartsOn: 1 }) };
  };

  it('does not name the week or claim patterns from fewer than three meetings', () => {
    const { start, end } = weekOf();
    const summary = summarizeWeek([meeting({ impactScore: -7.6, meetingType: 'standup', reasonIds: ['no-decision'] })], start, end);
    expect(summary.hasEnoughSignal).toBe(false);
    expect(summary.classification).toBe('Signal still building');
    expect(summary.mostDrainingType).toBeNull();
    expect(summary.topNegativeReason).toBeNull();
  });

  it('breaks reason ties by weight and counts meetings per day', () => {
    const { start, end } = weekOf();
    const meetings = [
      meeting({ impactScore: -3, reasonIds: ['poor-context', 'no-decision'] }),
      meeting({ impactScore: -3, reasonIds: ['poor-context', 'no-decision'] }),
      meeting({ impactScore: 2 }),
    ];
    const summary = summarizeWeek(meetings, start, end);
    expect(summary.topNegativeReason).toBe('no-decision');
    expect(summary.weekdayScores[0].count).toBe(3);
    expect(summary.weekdayScores[1].count).toBe(0);
  });

  it('aggregates pulse, duration, sentiment, and privacy-safe patterns', () => {
    const anchor = new Date(2026, 6, 8);
    const start = startOfWeek(anchor, { weekStartsOn: 1 });
    const end = endOfWeek(anchor, { weekStartsOn: 1 });
    const meetings = [
      meeting({ title: 'Private customer call', occurredAt: new Date(2026, 6, 7, 10).toISOString(), durationMinutes: 30, meetingType: 'client-call', mood: 'clear', impactScore: 4, reasonIds: ['clear-outcome'] }),
      meeting({ occurredAt: new Date(2026, 6, 8, 12).toISOString(), durationMinutes: 60, meetingType: 'status-update', mood: 'drained', impactScore: -6, reasonIds: ['no-decision'] }),
      meeting({ occurredAt: new Date(2026, 6, 9, 15).toISOString(), durationMinutes: 20, meetingType: 'review', mood: 'aligned', impactScore: 3, reasonIds: ['clear-outcome'] }),
    ];
    const summary = summarizeWeek(meetings, start, end);
    expect(summary.meetingCount).toBe(3);
    expect(summary.totalMinutes).toBe(110);
    expect(summary.weeklyPulse).toBe(1);
    expect(summary.classification).toBe('Neutral Week');
    expect(summary.positiveCount).toBe(2);
    expect(summary.negativeCount).toBe(1);
    expect(summary.pulseTone).toBe('neutral');
    // One mention is not a pattern.
    expect(summary.topNegativeReason).toBeNull();
    expect(summary.weekdayScores).toHaveLength(7);
  });
});
