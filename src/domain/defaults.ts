import type { Meeting, MeetingType } from './types';

export function defaultPeopleCount(type: MeetingType, lastByType?: Partial<Record<MeetingType, number>>): number {
  const remembered = lastByType?.[type];
  if (typeof remembered === 'number' && remembered >= 1) return remembered;
  if (type === 'one-on-one') return 2;
  if (type === 'standup' || type === 'status-update') return 6;
  if (type === 'presentation' || type === 'planning') return 8;
  if (type === 'client-call') return 4;
  return 3;
}

export function recentTitles(meetings: Meeting[], limit = 5): string[] {
  const seen = new Set<string>();
  const titles: string[] = [];
  for (const meeting of meetings) {
    const title = meeting.title.trim();
    const key = title.toLowerCase();
    if (!title || seen.has(key)) continue;
    seen.add(key);
    titles.push(title);
    if (titles.length >= limit) break;
  }
  return titles;
}

export function lastPeopleByType(meetings: Meeting[]): Partial<Record<MeetingType, number>> {
  return meetings.reduce<Partial<Record<MeetingType, number>>>((result, meeting) => {
    if (result[meeting.meetingType] == null) result[meeting.meetingType] = meeting.peopleCount;
    return result;
  }, {});
}

export function lastUsedDefaults(meetings: Meeting[]): { meetingType: MeetingType; durationMinutes: number } | null {
  const latest = meetings[0];
  if (!latest) return null;
  return { meetingType: latest.meetingType, durationMinutes: latest.durationMinutes };
}
