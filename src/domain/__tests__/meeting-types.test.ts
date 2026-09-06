import { describe, expect, it } from '@jest/globals';

import {
  addCustomMeetingType,
  catalogMeetingTypes,
  meetingTypeLabel,
  mergeCustomMeetingTypes,
  parseCustomMeetingTypes,
  slugifyMeetingType,
} from '../meeting-types';

describe('meeting types', () => {
  it('keeps default labels and humanizes unknown slugs', () => {
    expect(meetingTypeLabel('one-on-one')).toBe('1:1');
    expect(meetingTypeLabel('design-crit')).toBe('Design Crit');
    expect(meetingTypeLabel('design-crit', [{ id: 'design-crit', label: 'Design critique' }])).toBe('Design critique');
  });

  it('slugifies and rejects duplicates', () => {
    expect(slugifyMeetingType('Design Critique')).toBe('design-critique');
    expect(() => addCustomMeetingType([], 'Standup')).toThrow('already exists');
    expect(addCustomMeetingType([], 'Design critique')).toEqual([{ id: 'design-critique', label: 'Design critique' }]);
  });

  it('parses stored custom types and ignores defaults', () => {
    expect(parseCustomMeetingTypes('[{"id":"design-crit","label":"Design critique"},{"id":"standup","label":"Nope"}]')).toEqual([
      { id: 'design-crit', label: 'Design critique' },
    ]);
    expect(parseCustomMeetingTypes('not-json')).toEqual([]);
  });

  it('merges catalogs without duplicating defaults', () => {
    const catalog = catalogMeetingTypes([{ id: 'design-crit', label: 'Design critique' }]);
    expect(catalog.some((item) => item.id === 'standup' && item.builtin)).toBe(true);
    expect(catalog.some((item) => item.id === 'design-crit' && !item.builtin)).toBe(true);
    expect(mergeCustomMeetingTypes([{ id: 'a', label: 'A' }], [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }])).toEqual([
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
    ]);
  });
});
