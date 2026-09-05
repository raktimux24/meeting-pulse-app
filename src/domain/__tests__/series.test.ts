import { describe, expect, it } from '@jest/globals';

import { compareWeekPulse, getRecurringSeries, normalizeSeriesKey } from '../series';
import type { Meeting } from '../types';

function meeting(overrides: Partial<Meeting> = {}): Meeting {
  return {
    id: 'm1',
    title: 'Product standup',
    occurredAt: new Date().toISOString(),
    durationMinutes: 15,
    meetingType: 'standup',
    peopleCount: 6,
    note: '',
    mood: 'neutral',
    impactScore: -1,
    reasonIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('recurring series', () => {
  it('normalizes title and type', () => {
    expect(normalizeSeriesKey('  Product   Standup ', 'standup')).toBe('standup::product standup');
  });

  it('groups repeated titles once they reach three logs', () => {
    const series = getRecurringSeries([
      meeting({ id: '1', impactScore: -2 }),
      meeting({ id: '2', title: 'product standup', impactScore: -1 }),
      meeting({ id: '3', impactScore: -3 }),
      meeting({ id: '4', title: 'Client sync', meetingType: 'client-call', impactScore: 4 }),
    ]);
    expect(series).toHaveLength(1);
    expect(series[0]?.count).toBe(3);
    expect(series[0]?.average).toBe(-2);
  });

  it('compares week pulses', () => {
    expect(compareWeekPulse(4, 1)).toEqual({ previousPulse: 1, delta: 3 });
    expect(compareWeekPulse(2, null)).toBeNull();
  });
});
