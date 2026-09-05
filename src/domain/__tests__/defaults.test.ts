import { describe, expect, it } from '@jest/globals';

import { defaultPeopleCount, lastPeopleByType, recentTitles } from '../defaults';
import type { Meeting } from '../types';

const base: Meeting = {
  id: '1',
  title: 'Design review',
  occurredAt: new Date().toISOString(),
  durationMinutes: 30,
  meetingType: 'review',
  peopleCount: 5,
  note: '',
  mood: 'clear',
  impactScore: 2,
  reasonIds: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('log defaults', () => {
  it('uses type-aware people counts', () => {
    expect(defaultPeopleCount('one-on-one')).toBe(2);
    expect(defaultPeopleCount('standup')).toBe(6);
    expect(defaultPeopleCount('standup', { standup: 9 })).toBe(9);
  });

  it('returns unique recent titles in recency order', () => {
    expect(recentTitles([
      { ...base, title: 'Standup' },
      { ...base, title: 'standup' },
      { ...base, title: 'Planning' },
    ])).toEqual(['Standup', 'Planning']);
  });

  it('remembers the latest people count per type', () => {
    expect(lastPeopleByType([
      { ...base, meetingType: 'standup', peopleCount: 7 },
      { ...base, meetingType: 'standup', peopleCount: 4 },
    ]).standup).toBe(7);
  });
});
