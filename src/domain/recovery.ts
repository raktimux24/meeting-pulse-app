import { isSameDay } from 'date-fns';

import type { Meeting } from './types';

export const DEFAULT_BUFFER_MINUTES = 15;

export type MeetingBlock = {
  startIso: string;
  endIso: string;
  meetingIds: string[];
  count: number;
  spanMinutes: number;
};

export type RecoverySummary = {
  meetingCount: number;
  blocks: MeetingBlock[];
  tightTransitions: number;
  bufferedTransitions: number;
  longestBlockMinutes: number;
  denseBlockCount: number;
  tightAverage: number | null;
  bufferedAverage: number | null;
  averageDifference: number | null;
  comparisonReady: boolean;
};

type TimedMeeting = { meeting: Meeting; start: Date; end: Date };

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function average(values: number[]): number | null {
  return values.length ? round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
}

function timedMeetings(meetings: Meeting[]): TimedMeeting[] {
  return meetings
    .map((meeting) => {
      const start = new Date(meeting.occurredAt);
      return { meeting, start, end: new Date(start.getTime() + Math.max(0, meeting.durationMinutes) * 60_000) };
    })
    .filter(({ start, end }) => !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()))
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

export function getMeetingBlocks(meetings: Meeting[], bufferMinutes = DEFAULT_BUFFER_MINUTES): MeetingBlock[] {
  const timed = timedMeetings(meetings);
  const blocks: MeetingBlock[] = [];

  timed.forEach(({ meeting, start, end }) => {
    const current = blocks[blocks.length - 1];
    if (!current) {
      blocks.push({ startIso: start.toISOString(), endIso: end.toISOString(), meetingIds: [meeting.id], count: 1, spanMinutes: Math.max(0, meeting.durationMinutes) });
      return;
    }

    const currentEnd = new Date(current.endIso);
    const gapMinutes = (start.getTime() - currentEnd.getTime()) / 60_000;
    if (isSameDay(start, currentEnd) && gapMinutes <= bufferMinutes) {
      const nextEnd = end.getTime() > currentEnd.getTime() ? end : currentEnd;
      current.endIso = nextEnd.toISOString();
      current.meetingIds.push(meeting.id);
      current.count += 1;
      current.spanMinutes = round((nextEnd.getTime() - new Date(current.startIso).getTime()) / 60_000);
      return;
    }

    blocks.push({ startIso: start.toISOString(), endIso: end.toISOString(), meetingIds: [meeting.id], count: 1, spanMinutes: Math.max(0, meeting.durationMinutes) });
  });

  return blocks;
}

export function summarizeRecovery(meetings: Meeting[], bufferMinutes = DEFAULT_BUFFER_MINUTES): RecoverySummary {
  const timed = timedMeetings(meetings);
  const blocks = getMeetingBlocks(meetings, bufferMinutes);
  const tightScores: number[] = [];
  const bufferedScores: number[] = [];
  let latestEnd: Date | null = null;
  let previousStart: Date | null = null;

  timed.forEach(({ meeting, start, end }) => {
    if (latestEnd && previousStart && isSameDay(start, previousStart)) {
      const gapMinutes = Math.max(0, (start.getTime() - latestEnd.getTime()) / 60_000);
      if (gapMinutes <= bufferMinutes) tightScores.push(meeting.impactScore);
      else bufferedScores.push(meeting.impactScore);
    }
    if (!latestEnd || !isSameDay(start, previousStart!) || end.getTime() > latestEnd.getTime()) latestEnd = end;
    previousStart = start;
  });

  const tightAverage = average(tightScores);
  const bufferedAverage = average(bufferedScores);
  const averageDifference = tightAverage != null && bufferedAverage != null ? round(bufferedAverage - tightAverage) : null;

  return {
    meetingCount: timed.length,
    blocks,
    tightTransitions: tightScores.length,
    bufferedTransitions: bufferedScores.length,
    longestBlockMinutes: Math.max(0, ...blocks.map((block) => block.spanMinutes)),
    denseBlockCount: blocks.filter((block) => block.count >= 3).length,
    tightAverage,
    bufferedAverage,
    averageDifference,
    comparisonReady: tightScores.length >= 3 && bufferedScores.length >= 3 && (averageDifference ?? 0) >= 1.5,
  };
}
