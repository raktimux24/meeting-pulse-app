import type { Meeting, MeetingType, SeriesPulse } from './types';

export function normalizeSeriesKey(title: string, meetingType: MeetingType): string {
  return `${meetingType}::${title.trim().toLowerCase().replace(/\s+/g, ' ')}`;
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

export function getRecurringSeries(meetings: Meeting[], minimumCount = 3): SeriesPulse[] {
  const groups = new Map<string, Meeting[]>();

  meetings.forEach((meeting) => {
    const key = normalizeSeriesKey(meeting.title, meeting.meetingType);
    const current = groups.get(key) ?? [];
    current.push(meeting);
    groups.set(key, current);
  });

  return [...groups.entries()]
    .map(([key, items]) => ({
      key,
      title: items[0]?.title.trim() ?? key,
      meetingType: items[0]?.meetingType ?? 'other',
      count: items.length,
      average: Math.round(average(items.map((item) => item.impactScore)) * 10) / 10,
    }))
    .filter((item) => item.count >= minimumCount)
    .sort((a, b) => a.average - b.average);
}

export function compareWeekPulse(currentPulse: number, previousPulse: number | null): {
  previousPulse: number;
  delta: number;
} | null {
  if (previousPulse == null) return null;
  return {
    previousPulse,
    delta: Math.round((currentPulse - previousPulse) * 10) / 10,
  };
}
