import { describe, expect, it } from '@jest/globals';

import { originPath } from '../format';
import { parseIntention } from '../intention';
import { parseReminderPrefs } from '../reminder-prefs';
import { buildReportShareText } from '../report-text';
import type { WeekSummary } from '../types';

const summary: WeekSummary = {
  meetings: [],
  meetingCount: 4,
  totalMinutes: 120,
  weeklyPulse: 3,
  classification: 'Neutral Week',
  positiveCount: 3,
  neutralCount: 0,
  negativeCount: 1,
  mostDrainingType: 'status-update',
  mostUsefulType: 'one-on-one',
  topNegativeReason: 'no-decision',
  bestPattern: 'Still collecting signal',
  weekdayScores: [],
  insights: [{ id: 'async', eyebrow: 'Async', title: 'Move updates', body: 'Move status sharing into a written update.', tone: 'negative' }],
};

describe('privacy-safe share text', () => {
  it('includes aggregates and omits meeting titles', () => {
    const text = buildReportShareText(summary, new Date(2026, 6, 6), new Date(2026, 6, 12));
    expect(text).toContain('1:1');
    expect(text).toContain('Status update');
    expect(text).toContain('No decision');
    expect(text).not.toContain('Private customer');
    expect(text).toContain('shared without meeting names');
  });
});

describe('navigation origin', () => {
  it('maps known origins and defaults to today', () => {
    expect(originPath('history')).toBe('/(tabs)/history');
    expect(originPath('insights')).toBe('/(tabs)/insights');
    expect(originPath('mystery')).toBe('/(tabs)/today');
  });
});

describe('weekly intention', () => {
  it('parses stored intention JSON', () => {
    expect(parseIntention('{"text":"Protect Friday","weekStartIso":"2026-07-06","tried":false}')).toEqual({
      text: 'Protect Friday',
      weekStartIso: '2026-07-06',
      tried: false,
    });
    expect(parseIntention('nope')).toBeNull();
  });
});

describe('reminder prefs', () => {
  it('falls back to a disabled 6pm reminder', () => {
    expect(parseReminderPrefs(null)).toEqual({ enabled: false, hour: 18, minute: 0 });
    expect(parseReminderPrefs('{"enabled":true,"hour":19,"minute":0}')).toEqual({ enabled: true, hour: 19, minute: 0 });
  });
});
