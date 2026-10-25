import { describe, expect, it } from '@jest/globals';

import { sanitizeCalendarEvents } from '../calendar-assist';

describe('calendar assist privacy boundary', () => {
  it('keeps only start time and duration', () => {
    const slots = sanitizeCalendarEvents([{
      startDate: '2026-10-25T09:00:00.000Z',
      endDate: '2026-10-25T09:30:00.000Z',
      allDay: false,
      title: 'Private launch review',
      attendees: ['person@example.com'],
    } as never]);

    expect(slots).toEqual([{ startIso: '2026-10-25T09:00:00.000Z', durationMinutes: 30 }]);
    expect(JSON.stringify(slots)).not.toContain('Private launch review');
    expect(JSON.stringify(slots)).not.toContain('person@example.com');
  });

  it('drops all-day, implausibly short, and duplicate slots', () => {
    const slots = sanitizeCalendarEvents([
      { startDate: '2026-10-25T00:00:00.000Z', endDate: '2026-10-26T00:00:00.000Z', allDay: true },
      { startDate: '2026-10-25T09:00:00.000Z', endDate: '2026-10-25T09:02:00.000Z' },
      { startDate: '2026-10-25T10:00:00.000Z', endDate: '2026-10-25T10:30:00.000Z' },
      { startDate: '2026-10-25T10:00:00.000Z', endDate: '2026-10-25T10:30:00.000Z' },
    ]);
    expect(slots).toHaveLength(1);
  });
});
