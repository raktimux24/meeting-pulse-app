import { getDay, getHours } from 'date-fns';

import type { Meeting } from './types';

export type PatternBucket = { id: string; label: string; count: number; average: number | null };

function summarize(id: string, label: string, meetings: Meeting[], minimum = 3): PatternBucket {
  const average = meetings.length >= minimum
    ? Math.round((meetings.reduce((sum, meeting) => sum + meeting.impactScore, 0) / meetings.length) * 10) / 10
    : null;
  return { id, label, count: meetings.length, average };
}

export function summarizeTimePatterns(meetings: Meeting[], minimum = 3): { weekdays: PatternBucket[]; dayparts: PatternBucket[] } {
  const weekdays = [
    { id: 'mon', label: 'Mon', day: 1 },
    { id: 'tue', label: 'Tue', day: 2 },
    { id: 'wed', label: 'Wed', day: 3 },
    { id: 'thu', label: 'Thu', day: 4 },
    { id: 'fri', label: 'Fri', day: 5 },
    { id: 'sat', label: 'Sat', day: 6 },
    { id: 'sun', label: 'Sun', day: 0 },
  ].map((bucket) => summarize(bucket.id, bucket.label, meetings.filter((meeting) => getDay(new Date(meeting.occurredAt)) === bucket.day), minimum));

  const dayparts = [
    { id: 'morning', label: 'Before noon', from: 0, to: 12 },
    { id: 'afternoon', label: '12–5 PM', from: 12, to: 17 },
    { id: 'evening', label: 'After 5 PM', from: 17, to: 24 },
  ].map((bucket) => summarize(bucket.id, bucket.label, meetings.filter((meeting) => {
    const hour = getHours(new Date(meeting.occurredAt));
    return hour >= bucket.from && hour < bucket.to;
  }), minimum));

  return { weekdays, dayparts };
}
