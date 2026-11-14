import { describe, expect, it } from '@jest/globals';

import { HEALTH_LABELS, moodValence, stateOfMindFor } from '../health';
import { moodFromAction, nudgeIdentifier, parseNudgePrefs, planNudges } from '../nudges';
import { planBuffers, shouldSuggestReset } from '../reset';
import { getHitRateByMonth, getHitRateByType, getMonthPixels, getOutcomeHitRate, getQuarterTrends, summarizeMonth } from '../trends';
import type { Meeting } from '../types';
import { MOODS } from '../types';
import { getSeriesVerdicts, verdictMessage } from '../verdicts';

let counter = 0;
function meeting(overrides: Partial<Meeting> = {}): Meeting {
  counter += 1;
  return {
    id: `m-${counter}`,
    title: 'Weekly status',
    occurredAt: new Date(2026, 10, 2, 10).toISOString(),
    durationMinutes: 60,
    meetingType: 'status-update',
    peopleCount: 8,
    note: '',
    mood: 'drained',
    impactScore: -4,
    reasonIds: [],
    decisionStatus: null,
    ownershipStatus: null,
    nextStepStatus: null,
    intendedOutcome: null,
    intendedOutcomeMet: null,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('after-meeting check-ins', () => {
  const now = new Date(2026, 10, 14, 9, 0);
  const slot = (hour: number, minute: number, duration: number) => ({ startIso: new Date(2026, 10, 14, hour, minute).toISOString(), durationMinutes: duration });

  it('plans a check-in at the end of each upcoming meeting, plus the delay', () => {
    const planned = planNudges([slot(10, 0, 30), slot(14, 0, 45)], now, { enabled: true, delayMinutes: 2 });
    expect(planned.map((item) => item.fireAt.getHours() * 60 + item.fireAt.getMinutes())).toEqual([10 * 60 + 32, 14 * 60 + 47]);
    expect(planned[0].body).toContain('10:00 AM meeting (30 min)');
  });

  it('skips meetings that already ended, beyond 48 hours, or when turned off', () => {
    expect(planNudges([slot(8, 0, 30)], now, { enabled: true, delayMinutes: 0 })).toHaveLength(0);
    expect(planNudges([{ startIso: new Date(2026, 10, 17, 9).toISOString(), durationMinutes: 30 }], now, { enabled: true, delayMinutes: 0 })).toHaveLength(0);
    expect(planNudges([slot(10, 0, 30)], now, { enabled: false, delayMinutes: 0 })).toHaveLength(0);
  });

  it('merges meetings that end within five minutes of each other and caps the count', () => {
    expect(planNudges([slot(10, 0, 30), slot(10, 0, 32)], now, { enabled: true, delayMinutes: 0 })).toHaveLength(1);
    const many = Array.from({ length: 40 }, (_, index) => ({ startIso: new Date(now.getTime() + (index + 1) * 3_600_000).toISOString(), durationMinutes: 30 }));
    expect(planNudges(many, now, { enabled: true, delayMinutes: 0 }, 5)).toHaveLength(5);
  });

  it('reads mood buttons and stored prefs safely', () => {
    expect(moodFromAction('mood_drained')).toBe('drained');
    expect(moodFromAction('mood_anxious')).toBeNull();
    expect(moodFromAction('expo.modules.notifications.actions.DEFAULT')).toBeNull();
    expect(parseNudgePrefs('{"enabled":true,"delayMinutes":99}')).toEqual({ enabled: true, delayMinutes: 30 });
    expect(parseNudgePrefs('nope')).toEqual({ enabled: false, delayMinutes: 2 });
    expect(nudgeIdentifier(slot(10, 0, 30))).toMatch(/^meeting-pulse-nudge:\d+:30$/);
  });
});

describe('recurring meeting verdicts', () => {
  it('suggests async when most logs say it could have been async', () => {
    const items = [1, 2, 3, 4].map((day) => meeting({ occurredAt: new Date(2026, 10, day, 10).toISOString(), reasonIds: day < 4 ? ['could-have-been-async'] : ['too-long'] }));
    const [verdict] = getSeriesVerdicts(items);
    expect(verdict).toMatchObject({ count: 4, hours: 4, totalImpact: -16, suggestion: 'async', evidenceCount: 3 });
    expect(verdict.because).toBe('3 of 4 logs said it could have been async.');
    expect(verdictMessage(verdict)).toContain('async');
  });

  it('keeps a series that returns energy and shortens a costly one with no clear reason', () => {
    const good = [1, 2, 3].map(() => meeting({ title: 'Design review', meetingType: 'review', impactScore: 3 }));
    const vague = [1, 2, 3].map(() => meeting({ title: 'Ops sync', impactScore: -1 }));
    const verdicts = getSeriesVerdicts([...good, ...vague]);
    expect(verdicts.find((item) => item.title === 'Design review')?.suggestion).toBe('keep');
    expect(verdicts.find((item) => item.title === 'Ops sync')?.suggestion).toBe('shorten');
  });

  it('suggests pausing when you were not needed, and ignores one-offs', () => {
    const items = [1, 2, 3].map(() => meeting({ reasonIds: ['not-needed-here'] }));
    expect(getSeriesVerdicts(items)[0].suggestion).toBe('drop');
    expect(getSeriesVerdicts(items.slice(0, 2))).toHaveLength(0);
  });
});

describe('longer views', () => {
  it('builds whole weeks for the month and sums each day', () => {
    const items = [
      meeting({ occurredAt: new Date(2026, 10, 3, 10).toISOString(), impactScore: 2 }),
      meeting({ occurredAt: new Date(2026, 10, 3, 15).toISOString(), impactScore: 1.5 }),
      meeting({ occurredAt: new Date(2026, 10, 5, 9).toISOString(), impactScore: -4 }),
    ];
    const days = getMonthPixels(items, new Date(2026, 10, 14), 1);
    expect(days.length % 7).toBe(0);
    expect(days[0].date.getDay()).toBe(1);
    expect(days.find((day) => day.inMonth && day.date.getDate() === 3)).toMatchObject({ count: 2, total: 3.5 });
    expect(summarizeMonth(days)).toEqual({ loggedDays: 2, positiveDays: 1, negativeDays: 1, meetings: 3, total: -0.5 });
  });

  it('averages each meeting type per month over a quarter', () => {
    const items = [
      meeting({ occurredAt: new Date(2026, 8, 10).toISOString(), impactScore: -6 }),
      meeting({ occurredAt: new Date(2026, 10, 10).toISOString(), impactScore: -2 }),
      meeting({ occurredAt: new Date(2026, 10, 11).toISOString(), impactScore: 0 }),
      meeting({ occurredAt: new Date(2026, 5, 1).toISOString(), impactScore: 9 }),
    ];
    const trends = getQuarterTrends(items, new Date(2026, 10, 14));
    expect(trends.monthLabels).toEqual(['Sep', 'Oct', 'Nov']);
    expect(trends.types[0]).toMatchObject({ meetingType: 'status-update', months: [-6, null, -1], count: 3, change: 5 });
  });

  it('computes an outcome hit rate where partly counts as half', () => {
    const items = [
      meeting({ intendedOutcome: 'Decide pricing', intendedOutcomeMet: 'yes' }),
      meeting({ intendedOutcome: 'Agree scope', intendedOutcomeMet: 'partly' }),
      meeting({ intendedOutcome: 'Pick owner', intendedOutcomeMet: 'no', meetingType: 'review' }),
      meeting({ intendedOutcome: 'Unanswered' }),
      meeting(),
    ];
    expect(getOutcomeHitRate(items)).toEqual({ answered: 3, withIntent: 4, rate: 50 });
    expect(getHitRateByType(items)).toEqual([{ meetingType: 'status-update', answered: 2, withIntent: 3, rate: 75 }]);
    expect(getHitRateByMonth(items, [new Date(2026, 9, 1), new Date(2026, 10, 1)])).toEqual([null, 50]);
  });
});

describe('recovery buffers', () => {
  const now = new Date(2026, 10, 14, 8);
  const at = (hour: number, minute: number, duration: number) => ({ startIso: new Date(2026, 10, 15, hour, minute).toISOString(), durationMinutes: duration });

  it('proposes a buffer after a back-to-back run when the calendar is free', () => {
    const proposals = planBuffers([at(9, 0, 30), at(9, 30, 30), at(10, 0, 60), at(14, 0, 30)], now, 15);
    expect(proposals).toHaveLength(1);
    expect(new Date(proposals[0].startIso).getHours()).toBe(11);
    expect(proposals[0]).toMatchObject({ minutes: 15, chainCount: 3, chainMinutes: 120 });
  });

  it('treats a gap shorter than the buffer as part of the run, and skips single meetings', () => {
    const proposals = planBuffers([at(9, 0, 30), at(9, 40, 30), at(10, 30, 30)], now, 15);
    expect(proposals).toHaveLength(1);
    expect(proposals[0]).toMatchObject({ chainCount: 2, chainMinutes: 70 });
    expect(planBuffers([at(9, 0, 30)], now, 15)).toHaveLength(0);
    expect(planBuffers([at(9, 0, 30), at(9, 30, 30)], new Date(2026, 10, 16), 15)).toHaveLength(0);
  });

  it('suggests a reset only after a costly meeting', () => {
    expect(shouldSuggestReset({ impactScore: -2 })).toBe(true);
    expect(shouldSuggestReset({ impactScore: -1.5 })).toBe(false);
  });
});

describe('Apple Health mapping', () => {
  it('maps every mood to a valence in range and a label', () => {
    MOODS.forEach((mood) => {
      expect(Math.abs(moodValence(mood))).toBeLessThanOrEqual(1);
      expect(HEALTH_LABELS[mood]).toBeTruthy();
    });
    expect(moodValence('energized')).toBe(1);
    expect(moodValence('drained')).toBe(-0.67);
  });

  it('dates the sample at the end of the meeting', () => {
    expect(stateOfMindFor('clear', '2026-11-14T10:00:00.000Z', 45)).toEqual({ valence: 0.67, label: 'confident', dateIso: '2026-11-14T10:45:00.000Z' });
  });
});
