import { describe, expect, it } from '@jest/globals';

import { mergeDateTimePart } from '@/domain/date-time';

describe('meeting date and time selection', () => {
  const maximum = new Date(2026, 6, 10, 14, 30, 45);

  it('changes the local calendar date while preserving the time', () => {
    const current = new Date(2026, 6, 10, 11, 20, 30);
    const selected = new Date(2026, 5, 28, 0, 0);

    expect(mergeDateTimePart(current, selected, 'date', maximum)).toEqual(new Date(2026, 5, 28, 11, 20));
  });

  it('changes the local time while preserving the calendar date', () => {
    const current = new Date(2026, 5, 28, 11, 20);
    const selected = new Date(2026, 6, 10, 9, 45);

    expect(mergeDateTimePart(current, selected, 'time', maximum)).toEqual(new Date(2026, 5, 28, 9, 45));
  });

  it('clamps a future selection to the current system time', () => {
    const current = new Date(2026, 6, 10, 11, 20);
    const selected = new Date(2026, 6, 10, 16, 0);

    expect(mergeDateTimePart(current, selected, 'time', maximum)).toEqual(maximum);
  });
});
