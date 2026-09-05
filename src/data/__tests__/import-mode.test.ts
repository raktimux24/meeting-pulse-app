import { describe, expect, it } from '@jest/globals';

import { parseExportPayload } from '@/domain/import-export';

describe('repository import contract', () => {
  it('produces meeting inputs the repository can insert', () => {
    const preview = parseExportPayload({
      weekStartsOn: 0,
      meetings: [{
        title: 'Planning',
        occurredAt: '2026-07-07T15:00:00.000Z',
        durationMinutes: 45,
        meetingType: 'planning',
        peopleCount: 8,
        note: '',
        mood: 'frustrated',
        reasonIds: ['no-decision'],
      }],
    });

    expect(preview.weekStartsOn).toBe(0);
    expect(preview.meetings[0]).toMatchObject({
      title: 'Planning',
      meetingType: 'planning',
      mood: 'frustrated',
      reasonIds: ['no-decision'],
    });
  });
});
